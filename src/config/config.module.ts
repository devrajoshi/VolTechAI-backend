import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

/**
 * Validates all required environment variables at startup.
 * If any required variable is missing or invalid, the app will
 * REFUSE to start — preventing silent misconfiguration in production.
 */
@Global()
@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env', '.env.local'],
            validationSchema: Joi.object({
                // Application
                NODE_ENV: Joi.string()
                    .valid('development', 'production', 'test')
                    .default('development'),
                PORT: Joi.number().default(3001),

                // Database
                DATABASE_URL: Joi.string().uri().required(),

                // Stripe
                STRIPE_SECRET_KEY: Joi.string()
                    .pattern(/^sk_(test|live)_/)
                    .required()
                    .messages({
                        'string.pattern.base':
                            'STRIPE_SECRET_KEY must start with "sk_test_" or "sk_live_"',
                    }),
                STRIPE_WEBHOOK_SECRET: Joi.string()
                    .pattern(/^whsec_/)
                    .required()
                    .messages({
                        'string.pattern.base':
                            'STRIPE_WEBHOOK_SECRET must start with "whsec_"',
                    }),

                // CORS
                FRONTEND_WEB_URL: Joi.string().uri().default('http://localhost:3000'),
                FRONTEND_ADMIN_URL: Joi.string().uri().default('http://localhost:3002'),
            }),
            validationOptions: {
                abortEarly: false, // Report ALL missing vars at once, not just the first
            },
        }),
    ],
})
export class AppConfigModule { }
