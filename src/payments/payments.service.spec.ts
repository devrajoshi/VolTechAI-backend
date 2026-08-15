import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PackagesService } from '../packages/packages.service';
import { OrdersService } from '../orders/orders.service';
import { Package } from '@prisma/client';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockPackage: Package = {
    id: 'pkg_123',
    slug: 'tech-launch',
    name: 'Software Development Package',
    amount: 150000,
    currency: 'gbp',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
};

const mockOrder = {
    id: 'order_abc',
    packageId: 'pkg_123',
    amount: 150000,
    currency: 'gbp',
    serviceName: 'Software Development Package',
    status: 'PENDING',
    stripePaymentId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
};

const mockStripePaymentIntent = {
    id: 'pi_test_123',
    client_secret: 'pi_test_123_secret_abc',
};

const mockPackagesService = {
    findBySlug: jest.fn(),
};

const mockOrdersService = {
    create: jest.fn(),
    attachStripePaymentId: jest.fn(),
};

// Mock the Stripe SDK securely handling esModule imports
jest.mock('stripe', () => {
    return {
        default: jest.fn().mockImplementation(() => ({
            paymentIntents: {
                create: jest.fn().mockResolvedValue(mockStripePaymentIntent),
            },
        })),
    };
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('PaymentsService', () => {
    let service: PaymentsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PaymentsService,
                { provide: PackagesService, useValue: mockPackagesService },
                { provide: OrdersService, useValue: mockOrdersService },
                {
                    provide: ConfigService,
                    useValue: {
                        getOrThrow: jest.fn((key: string) => {
                            if (key === 'STRIPE_SECRET_KEY') return 'sk_test_mock_key';
                            throw new Error(`Unknown config key: ${key}`);
                        }),
                    },
                },
            ],
        }).compile();

        service = module.get<PaymentsService>(PaymentsService);

        // Reset mocks before each test
        mockPackagesService.findBySlug.mockResolvedValue(mockPackage);
        mockOrdersService.create.mockResolvedValue(mockOrder);
        mockOrdersService.attachStripePaymentId.mockResolvedValue({
            ...mockOrder,
            stripePaymentId: 'pi_test_123',
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('initializeCheckout', () => {
        it('should initialize checkout successfully with correct data', async () => {
            const result = await service.initializeCheckout('tech-launch');

            expect(result.clientSecret).toBe('pi_test_123_secret_abc');
            expect(result.orderId).toBe('order_abc');
            expect(result.amount).toBe(150000);
            expect(result.currency).toBe('gbp');
            expect(result.serviceName).toBe('Software Development Package');
        });

        it('should call packagesService.findBySlug with the provided packageId', async () => {
            await service.initializeCheckout('tech-launch');
            expect(mockPackagesService.findBySlug).toHaveBeenCalledWith('tech-launch');
        });

        it('should create an order after fetching package details', async () => {
            await service.initializeCheckout('tech-launch');
            expect(mockOrdersService.create).toHaveBeenCalledWith(mockPackage);
        });

        it('should throw NotFoundException when package slug does not exist', async () => {
            mockPackagesService.findBySlug.mockRejectedValue(
                new NotFoundException('Package not found'),
            );

            await expect(service.initializeCheckout('non-existent')).rejects.toThrow(
                NotFoundException,
            );
        });
    });
});
