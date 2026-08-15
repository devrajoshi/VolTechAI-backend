import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PackagesService } from '../packages/packages.service';
import { OrdersService } from '../orders/orders.service';

export interface CheckoutResult {
    clientSecret: string;
    orderId: string;
    amount: number;
    currency: string;
    serviceName: string;
}

@Injectable()
export class PaymentsService {
    private readonly logger = new Logger(PaymentsService.name);
    private readonly stripe: Stripe;

    constructor(
        private readonly configService: ConfigService,
        private readonly packagesService: PackagesService,
        private readonly ordersService: OrdersService,
    ) {
        this.stripe = new Stripe(this.configService.getOrThrow<string>('STRIPE_SECRET_KEY'), {
            apiVersion: '2025-02-24.acacia',
            appInfo: {
                name: 'VolTechAI NestJS Backend',
                version: '2.0.0',
                url: 'https://voltechai.com',
            },
        });
    }

    /**
     * Full checkout initialization flow:
     * 1. Fetch authoritative package pricing from the database.
     * 2. Create an Order record in DB with PENDING status.
     * 3. Create a Stripe PaymentIntent with the authoritative amount.
     * 4. Attach the Stripe PaymentIntent ID to the Order.
     * 5. Return the clientSecret to the frontend.
     *
     * The clientSecret is the only thing the frontend needs to mount Elements.
     * The orderId lets the success page poll for confirmation.
     */
    async initializeCheckout(packageId: string): Promise<CheckoutResult> {
        // Step 1: Get authoritative pricing
        const pkg = await this.packagesService.findBySlug(packageId);

        // Step 2: Create order in DB
        const order = await this.ordersService.create(pkg);
        this.logger.log(`Created order ${order.id} for package "${pkg.slug}"`);

        let paymentIntent: Stripe.PaymentIntent;

        try {
            // Step 3: Create Stripe PaymentIntent
            paymentIntent = await this.stripe.paymentIntents.create({
                amount: pkg.amount,
                currency: pkg.currency,
                metadata: {
                    orderId: order.id,
                    packageSlug: pkg.slug,
                    serviceName: pkg.name,
                },
                automatic_payment_methods: {
                    enabled: true,
                },
            });
        } catch (stripeError) {
            // If Stripe fails, the order is stuck as PENDING. In a real production
            // app you'd want a cleanup job or dead-letter queue here.
            this.logger.error(
                `Stripe PaymentIntent creation failed for order ${order.id}`,
                stripeError instanceof Error ? stripeError.message : stripeError,
            );
            throw new InternalServerErrorException(
                'Payment initialization failed. Please try again.',
            );
        }

        if (!paymentIntent.client_secret) {
            throw new InternalServerErrorException('Failed to generate a payment session.');
        }

        // Step 4: Attach Stripe ID to our order record
        await this.ordersService.attachStripePaymentId(order.id, paymentIntent.id);

        // Step 5: Return the contract expected by the frontend
        return {
            clientSecret: paymentIntent.client_secret,
            orderId: order.id,
            amount: pkg.amount,
            currency: pkg.currency,
            serviceName: pkg.name,
        };
    }

    /**
     * Exposes the Stripe client instance for raw body webhook verification
     * in the WebhooksService without creating a second Stripe instance.
     */
    getStripeClient(): Stripe {
        return this.stripe;
    }
}
