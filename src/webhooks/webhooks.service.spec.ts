import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebhooksService } from './webhooks.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { PaymentsService } from '../payments/payments.service';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockOrder = {
    id: 'order_abc',
    packageId: 'pkg_123',
    amount: 150000,
    currency: 'gbp',
    serviceName: 'Software Development Package',
    status: 'PENDING',
    stripePaymentId: 'pi_test_123',
    createdAt: new Date(),
    updatedAt: new Date(),
};

const mockStripeConstructEvent = jest.fn();

const mockPaymentsService = {
    getStripeClient: jest.fn().mockReturnValue({
        webhooks: {
            constructEvent: mockStripeConstructEvent,
        },
        paymentIntents: {
            retrieve: jest.fn().mockResolvedValue({
                id: 'pi_test_123',
                created: 1700000000,
                payment_method: {
                    type: 'card',
                    billing_details: {
                        name: 'Test Customer',
                        email: 'customer@example.com',
                        phone: '+441234567890',
                        address: {
                            country: 'GB',
                            line1: '1 Test Street',
                            city: 'London',
                            postal_code: 'SW1A 1AA',
                        },
                    },
                    card: { brand: 'visa', last4: '4242' },
                },
                latest_charge: {
                    id: 'ch_test_123',
                    receipt_url: 'https://stripe.example/receipt',
                },
            }),
        },
    }),
};

const mockOrdersService = {
    findByStripePaymentId: jest.fn().mockResolvedValue(mockOrder),
    markSucceeded: jest.fn().mockResolvedValue({ ...mockOrder, status: 'SUCCEEDED' }),
    markFailed: jest.fn().mockResolvedValue({ ...mockOrder, status: 'FAILED' }),
};

const mockPrismaService = {
    webhookEvent: {
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue({}),
    },
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('WebhooksService', () => {
    let service: WebhooksService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WebhooksService,
                { provide: PrismaService, useValue: mockPrismaService },
                { provide: OrdersService, useValue: mockOrdersService },
                { provide: PaymentsService, useValue: mockPaymentsService },
                {
                    provide: ConfigService,
                    useValue: {
                        getOrThrow: jest.fn().mockReturnValue('whsec_test_secret'),
                    },
                },
            ],
        }).compile();

        service = module.get<WebhooksService>(WebhooksService);
        mockPrismaService.webhookEvent.findUnique.mockResolvedValue(null); // Not processed by default
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('handleWebhook', () => {
        const rawBody = Buffer.from('{"test": "payload"}');
        const signature = 'test_signature';
        const mockEvent = {
            id: 'evt_test_123',
            type: 'payment_intent.succeeded',
            data: { object: { id: 'pi_test_123' } },
        };

        it('should throw BadRequestException when signature is invalid', async () => {
            mockStripeConstructEvent.mockImplementation(() => {
                throw new Error('No signatures found matching the expected signature');
            });

            await expect(service.handleWebhook(rawBody, signature)).rejects.toThrow(
                BadRequestException,
            );
        });

        it('should return { received: true } without processing if event already exists (idempotency)', async () => {
            mockStripeConstructEvent.mockReturnValue(mockEvent);
            mockPrismaService.webhookEvent.findUnique.mockResolvedValue({
                id: 'evt_test_123',
                type: 'payment_intent.succeeded',
                processedAt: new Date(),
            });

            const result = await service.handleWebhook(rawBody, signature);

            expect(result).toEqual({ received: true });
            // Should NOT have updated any order
            expect(mockOrdersService.markSucceeded).not.toHaveBeenCalled();
            // Should NOT have created a new webhook event record
            expect(mockPrismaService.webhookEvent.create).not.toHaveBeenCalled();
        });

        it('should mark order as SUCCEEDED on payment_intent.succeeded', async () => {
            mockStripeConstructEvent.mockReturnValue(mockEvent);

            const result = await service.handleWebhook(rawBody, signature);

            expect(result).toEqual({ received: true });
            expect(mockOrdersService.markSucceeded).toHaveBeenCalledWith(
                'order_abc',
                expect.objectContaining({
                    customerName: 'Test Customer',
                    customerEmail: 'customer@example.com',
                    customerPhone: '+441234567890',
                    customerCountry: 'GB',
                    cardBrand: 'visa',
                    cardLast4: '4242',
                    stripeChargeId: 'ch_test_123',
                    receiptUrl: 'https://stripe.example/receipt',
                }),
            );
            expect(mockPrismaService.webhookEvent.create).toHaveBeenCalledWith({
                data: { id: 'evt_test_123', type: 'payment_intent.succeeded' },
            });
        });

        it('should mark order as FAILED on payment_intent.payment_failed', async () => {
            const failedEvent = {
                id: 'evt_failed_456',
                type: 'payment_intent.payment_failed',
                data: {
                    object: {
                        id: 'pi_test_123',
                        last_payment_error: { message: 'Insufficient funds' },
                    },
                },
            };
            mockStripeConstructEvent.mockReturnValue(failedEvent);

            await service.handleWebhook(rawBody, signature);

            expect(mockOrdersService.markFailed).toHaveBeenCalledWith('order_abc');
        });

    it('should return a retryable server error if order handler throws', async () => {
            mockStripeConstructEvent.mockReturnValue(mockEvent);
            mockOrdersService.markSucceeded.mockRejectedValue(new Error('DB error'));

            await expect(service.handleWebhook(rawBody, signature)).rejects.toThrow(
                InternalServerErrorException,
            );
        });
    });
});
