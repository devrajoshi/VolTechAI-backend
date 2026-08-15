import { Controller, Get, Param } from '@nestjs/common';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    /**
     * GET /api/orders/:id/status
     *
     * Polls the status of an order. Used by the checkout success page
     * to confirm payment completion before showing the success message.
     */
    @Get(':id/status')
    getStatus(@Param('id') id: string) {
        return this.ordersService.getStatus(id);
    }
}
