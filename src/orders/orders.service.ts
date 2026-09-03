import {
    Injectable,
    NotFoundException,
    ConflictException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Order, OrderStatus } from '@prisma/client';
import { Package } from '@prisma/client';

@Injectable()
export class OrdersService {
    private readonly logger = new Logger(OrdersService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Creates a new order with PENDING status when checkout is initiated.
     * The amount and currency are snapshotted from the package at creation time
     * so future package price changes don't affect historical orders.
     */
    async create(pkg: Package): Promise<Order> {
        return this.prisma.order.create({
            data: {
                packageId: pkg.id,
                amount: pkg.amount,
                currency: pkg.currency,
                serviceName: pkg.name,
                status: 'PENDING',
            },
        });
    }

    /**
     * Updates the stripePaymentId on an order once a PaymentIntent is created.
     */
    async attachStripePaymentId(orderId: string, stripePaymentId: string): Promise<Order> {
        return this.prisma.order.update({
            where: { id: orderId },
            data: { stripePaymentId },
        });
    }

    /**
     * Marks an order as SUCCEEDED. Idempotent — re-calling for an already
     * succeeded order is a no-op and returns the existing record.
     */
    async markSucceeded(orderId: string, paymentDetails?: Partial<Order>): Promise<Order> {
        const order = await this.findById(orderId);

        if (order.status === 'SUCCEEDED') {
            this.logger.log(`[Idempotent] Order ${orderId} already SUCCEEDED. Skipping update.`);
            return order;
        }

        return this.prisma.order.update({
            where: { id: orderId },
            data: { status: 'SUCCEEDED', ...paymentDetails },
        });
    }

    /**
     * Marks an order as FAILED.
     */
    async markFailed(orderId: string): Promise<Order> {
        const order = await this.findById(orderId);

        if (order.status === 'FAILED') {
            this.logger.log(`[Idempotent] Order ${orderId} already FAILED. Skipping update.`);
            return order;
        }

        return this.prisma.order.update({
            where: { id: orderId },
            data: { status: 'FAILED' },
        });
    }

    /**
     * Fetches the current status of an order for the success-page polling flow.
     */
    async getStatus(orderId: string): Promise<{ orderId: string; status: OrderStatus }> {
        const order = await this.findById(orderId);
        return { orderId: order.id, status: order.status };
    }

    /**
     * Returns the persisted purchase details for the public confirmation page.
     * The order ID is generated server-side and is included in the Stripe return URL.
     */
    async getConfirmation(orderId: string): Promise<Order> {
        return this.findById(orderId);
    }

    /**
     * Fetches paginated orders ordered by creation date descending.
     */
    async findAll(page: number = 1, limit: number = 10): Promise<{ data: Order[], total: number, page: number, totalPages: number }> {
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            this.prisma.order.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.order.count(),
        ]);

        return {
            data,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Finds an order by Stripe PaymentIntent ID.
     * Used in webhook processing to map a Stripe event back to our Order.
     */
    async findByStripePaymentId(stripePaymentId: string): Promise<Order | null> {
        return this.prisma.order.findUnique({
            where: { stripePaymentId },
        });
    }

    private async findById(orderId: string): Promise<Order> {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
        });

        if (!order) {
            throw new NotFoundException(`Order with ID "${orderId}" not found.`);
        }

        return order;
    }
}
