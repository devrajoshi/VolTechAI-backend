import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * E2E tests for the VolTechAI Backend API.
 *
 * These tests require a real database connection and valid env vars.
 * For CI, ensure a test database is provisioned and DATABASE_URL is set.
 */
describe('VolTechAI API (e2e)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication({ rawBody: true });
        app.setGlobalPrefix('api');
        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true,
            }),
        );

        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    // ─── Health ────────────────────────────────────────────────────────────────

    describe('GET /api/health', () => {
        it('should return 200 with status ok', () => {
            return request(app.getHttpServer())
                .get('/api/health')
                .expect(200)
                .expect((res) => {
                    expect(res.body.status).toBe('ok');
                    expect(res.body.timestamp).toBeDefined();
                    expect(typeof res.body.uptime).toBe('number');
                });
        });
    });

    // ─── Checkout ──────────────────────────────────────────────────────────────

    describe('POST /api/payments/checkout', () => {
        it('should reject requests with missing packageId (400)', () => {
            return request(app.getHttpServer())
                .post('/api/payments/checkout')
                .send({})
                .expect(400)
                .expect((res) => {
                    expect(res.body.statusCode).toBe(400);
                    expect(Array.isArray(res.body.message)).toBe(true);
                });
        });

        it('should reject requests with extra/unknown fields (400)', () => {
            return request(app.getHttpServer())
                .post('/api/payments/checkout')
                .send({ packageId: 'tech-launch', maliciousField: 'hack' })
                .expect(400);
        });

        it('should reject requests with an invalid (non-existent) packageId (404)', () => {
            return request(app.getHttpServer())
                .post('/api/payments/checkout')
                .send({ packageId: 'non-existent-package' })
                .expect(404);
        });
    });

    // ─── Webhooks ──────────────────────────────────────────────────────────────

    describe('POST /api/webhooks/stripe', () => {
        it('should reject requests with missing Stripe-Signature header (400)', () => {
            return request(app.getHttpServer())
                .post('/api/webhooks/stripe')
                .send({ type: 'payment_intent.succeeded' })
                .expect(400)
                .expect((res) => {
                    expect(res.body.message).toMatch(/Stripe-Signature/i);
                });
        });

        it('should reject requests with invalid Stripe signature (400)', () => {
            return request(app.getHttpServer())
                .post('/api/webhooks/stripe')
                .set('stripe-signature', 'invalid_signature')
                .send({ type: 'payment_intent.succeeded' })
                .expect(400)
                .expect((res) => {
                    expect(res.body.message).toMatch(/signature/i);
                });
        });
    });

    // ─── Orders ────────────────────────────────────────────────────────────────

    describe('GET /api/orders/:id/status', () => {
        it('should return 404 for a non-existent order', () => {
            return request(app.getHttpServer())
                .get('/api/orders/non-existent-order-id/status')
                .expect(404);
        });
    });
});
