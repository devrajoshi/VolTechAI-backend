import { Controller, Get, Query } from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';

@Controller('admin/payments')
export class AdminPaymentsController {
    constructor(private readonly ordersService: OrdersService) {}

    @Get()
    getAll(
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '10',
    ) {
        return this.ordersService.findAll(Number(page), Number(limit));
    }
}
