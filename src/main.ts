import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        // Store the raw body buffer on the request object.
        // This is CRITICAL for Stripe webhook signature verification.
        rawBody: true,
    });

    const configService = app.get(ConfigService);
    const port = configService.get<number>('PORT', 3001);
    const frontendWebUrl = configService.get<string>('FRONTEND_WEB_URL', 'http://localhost:3000');
    const frontendAdminUrl = configService.get<string>('FRONTEND_ADMIN_URL', 'http://localhost:3002');
    const nodeEnv = configService.get<string>('NODE_ENV', 'development');

    // ─── Security: HTTP Headers ─────────────────────────────────────────────────
    app.use(helmet());

    // ─── Security: CORS ──────────────────────────────────────────────────────────
    // Only allow requests from the known frontend origin.
    app.enableCors({
        origin: [frontendWebUrl, frontendAdminUrl],
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    });

    // ─── Global Prefix ───────────────────────────────────────────────────────────
    app.setGlobalPrefix('api');

    // ─── Global Validation Pipe ─────────────────────────────────────────────────
    // - whitelist: strips properties not defined in DTO
    // - forbidNonWhitelisted: throws if unknown properties are sent
    // - transform: auto-converts types (e.g., string "123" to number)
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        }),
    );

    // ─── Global Exception Filter ─────────────────────────────────────────────────
    // Ensures consistent, non-leaking error response structure.
    app.useGlobalFilters(new HttpExceptionFilter(nodeEnv));

    // ─── Global Request Logging ──────────────────────────────────────────────────
    app.useGlobalInterceptors(new LoggingInterceptor());

    await app.listen(port);

    console.log(`\n🚀 VolTechAI Backend is running in [${nodeEnv}] mode`);
    console.log(`   → API: http://localhost:${port}/api`);
    console.log(`   → Health: http://localhost:${port}/api/health\n`);
}

bootstrap();
