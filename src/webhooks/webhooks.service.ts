import {
    Injectable,
    Logger,
    BadRequestException,
    InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class WebhooksService {
    private readonly logger = new Logger(WebhooksService.name);

    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
        private readonly ordersService: OrdersService,
        private readonly paymentsService: PaymentsService,
    ) { }

    /**
     * Verifies the Stripe webhook signature and processes the event.
     *
     * SECURITY: Uses the raw request body buffer for signature verification.
     * If the body is parsed as JSON first, the signature check will ALWAYS fail.
     *
     * IDEMPOTENCY: Checks the WebhookEvent table before processing.
     * If a Stripe event ID already exists, we return 200 OK but skip all logic.
     * This handles Stripe's at-least-once delivery guarantee safely.
     */
    async handleWebhook(rawBody: Buffer, signature: string): Promise<{ received: boolean }> {
        const webhookSecret = this.configService.getOrThrow<string>('STRIPE_WEBHOOK_SECRET');
        const stripe = this.paymentsService.getStripeClient();

        let event: Stripe.Event;

        // ─── 1. Verify Stripe Signature ─────────────────────────────────────────
        try {
            event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Signature verification failed';
            this.logger.warn(`⚠️ Webhook signature verification failed: ${message}`);
            throw new BadRequestException(`Webhook signature verification failed: ${message}`);
        }

        // ─── 2. Idempotency Check ────────────────────────────────────────────────
        const alreadyProcessed = await this.prisma.webhookEvent.findUnique({
            where: { id: event.id },
        });

        if (alreadyProcessed) {
            this.logger.log(`[Idempotent] Event ${event.id} (${event.type}) already processed. Skipping.`);
            return { received: true };
        }

        // ─── 3. Route to Handler ─────────────────────────────────────────────────
        try {
            await this.routeEvent(event);
        } catch (handlerError) {
            this.logger.error(
                `Handler failed for event ${event.id} (${event.type}): ${handlerError instanceof Error ? handlerError.message : handlerError
                }`,
            );
            // Return a 5xx so Stripe retries transient database/Stripe failures.
            // Permanent failures should be moved to a dead-letter workflow later.
            throw new InternalServerErrorException('Webhook processing failed.');
        }

        // ─── 4. Record Processed Event ───────────────────────────────────────────
        await this.prisma.webhookEvent.create({
            data: { id: event.id, type: event.type },
        });

        return { received: true };
    }

    /**
     * Routes a verified Stripe event to the appropriate handler method.
     * Add new cases here as your integration grows.
     */
    private async routeEvent(event: Stripe.Event): Promise<void> {
        this.logger.log(`Processing event ${event.id} of type "${event.type}"`);

        switch (event.type) {
            case 'payment_intent.succeeded':
                await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
                break;

            case 'payment_intent.payment_failed':
                await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
                break;

            case 'payment_intent.canceled':
                await this.handlePaymentIntentCanceled(event.data.object as Stripe.PaymentIntent);
                break;

            default:
                this.logger.log(`Unhandled event type "${event.type}" — no action taken.`);
        }
    }

    private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
        const order = await this.ordersService.findByStripePaymentId(paymentIntent.id);

        if (!order) {
            this.logger.warn(
                `payment_intent.succeeded: No order found for PaymentIntent ${paymentIntent.id}. Possible orphan PI.`,
            );
            return;
        }

        const enrichedIntent = await this.paymentsService.getStripeClient().paymentIntents.retrieve(
            paymentIntent.id,
            { expand: ['payment_method', 'latest_charge'] },
        );
        const paymentMethod = typeof enrichedIntent.payment_method === 'object'
            ? enrichedIntent.payment_method
            : null;
        const billing = paymentMethod?.billing_details;
        const card = paymentMethod?.type === 'card' && 'card' in paymentMethod
            ? paymentMethod.card
            : null;
        const charge = typeof enrichedIntent.latest_charge === 'object'
            ? enrichedIntent.latest_charge
            : null;

        await this.ordersService.markSucceeded(order.id, {
            customerName: billing?.name ?? null,
            customerEmail: billing?.email ?? null,
            customerPhone: billing?.phone ?? null,
            customerCountry: billing?.address?.country ?? null,
            cardBrand: card?.brand ?? null,
            cardLast4: card?.last4 ?? null,
            stripeChargeId: charge?.id ?? null,
            receiptUrl: charge?.receipt_url ?? null,
            billingLine1: billing?.address?.line1 ?? null,
            billingLine2: billing?.address?.line2 ?? null,
            billingCity: billing?.address?.city ?? null,
            billingState: billing?.address?.state ?? null,
            billingPostalCode: billing?.address?.postal_code ?? null,
            billingCountry: billing?.address?.country ?? null,
            paymentDate: enrichedIntent.created ? new Date(enrichedIntent.created * 1000) : null,
        });
        this.logger.log(`💰 Order ${order.id} marked as SUCCEEDED (PI: ${paymentIntent.id})`);
    }

    private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
        const order = await this.ordersService.findByStripePaymentId(paymentIntent.id);

        if (!order) {
            this.logger.warn(
                `payment_intent.payment_failed: No order found for PaymentIntent ${paymentIntent.id}.`,
            );
            return;
        }

        const failureMessage = paymentIntent.last_payment_error?.message ?? 'Unknown reason';
        this.logger.log(
            `❌ Order ${order.id} marked as FAILED. Reason: ${failureMessage} (PI: ${paymentIntent.id})`,
        );
        await this.ordersService.markFailed(order.id);
    }

    private async handlePaymentIntentCanceled(paymentIntent: Stripe.PaymentIntent): Promise<void> {
        const order = await this.ordersService.findByStripePaymentId(paymentIntent.id);

        if (!order) return;

        // Treat cancellation the same as failure for order status purposes
        await this.ordersService.markFailed(order.id);
        this.logger.log(`🚫 Order ${order.id} marked as FAILED (canceled PI: ${paymentIntent.id})`);
    }
}
