import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PaymentsService } from './payments.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';

@Controller('payments')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }

    /**
     * POST /api/payments/checkout
     *
     * Initiates a new checkout session. Returns a Stripe clientSecret
     * and order details for the frontend to mount the Payment Elements UI.
     *
     * Rate limited to 10 requests/minute per IP to prevent abuse.
     */
    @Post('checkout')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { ttl: 60_000, limit: 10 } })
    checkout(@Body() dto: CreateCheckoutDto) {
        return this.paymentsService.initializeCheckout(dto.packageId);
    }
}
