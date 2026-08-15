import {
    Controller,
    Post,
    Req,
    Headers,
    HttpCode,
    HttpStatus,
    BadRequestException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Request } from 'express';
import { WebhooksService } from './webhooks.service';

@SkipThrottle() // Stripe's retry mechanism would be rate-limited otherwise
@Controller('webhooks')
export class WebhooksController {
    constructor(private readonly webhooksService: WebhooksService) { }

    /**
     * POST /api/webhooks/stripe
     *
     * Receives Stripe webhook events. The route uses the raw body buffer
     * (enabled via rawBody: true in main.ts) for signature verification.
     *
     * IMPORTANT: Do not add any body-parsing interceptors/middleware to this route.
     */
    @Post('stripe')
    @HttpCode(HttpStatus.OK)
    async handleStripeWebhook(
        @Req() request: Request,
        @Headers('stripe-signature') signature: string,
    ) {
        if (!signature) {
            throw new BadRequestException('Missing Stripe-Signature header.');
        }

        // NestJS exposes the raw body on request.rawBody when rawBody: true is set in main.ts
        const rawBody = (request as Request & { rawBody: Buffer }).rawBody;

        if (!rawBody) {
            throw new BadRequestException('Raw body unavailable. Ensure rawBody: true is set in NestFactory.create().');
        }

        return this.webhooksService.handleWebhook(rawBody, signature);
    }
}
