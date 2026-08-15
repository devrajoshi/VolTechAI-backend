import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { PaymentsModule } from './payments/payments.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { OrdersModule } from './orders/orders.module';
import { HealthModule } from './health/health.module';

@Module({
    imports: [
        // ─── Config (global) ────────────────────────────────────────────
        AppConfigModule,

        // ─── Database (global) ──────────────────────────────────────────
        PrismaModule,

        // ─── Rate Limiting ───────────────────────────────────────────────
        // Global default: 60 requests per minute per IP.
        // Individual routes can override with @Throttle() decorator.
        ThrottlerModule.forRoot([
            {
                name: 'global',
                ttl: 60_000, // 1 minute
                limit: 60,
            },
        ]),

        // ─── Feature Modules ────────────────────────────────────────────
        PaymentsModule,
        WebhooksModule,
        OrdersModule,
        HealthModule,
    ],
    providers: [
        // Apply rate limiting guard globally to all routes.
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
})
export class AppModule { }
