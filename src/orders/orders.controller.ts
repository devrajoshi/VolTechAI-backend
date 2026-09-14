import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminSessionGuard } from '../auth/guards/admin-session.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
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

    /**
     * GET /api/orders/:id/confirmation
     *
     * Returns the order details needed by the checkout confirmation page.
     */
    @Get(':id/confirmation')
    getConfirmation(@Param('id') id: string) {
        return this.ordersService.getConfirmation(id);
    }

    /**
     * GET /api/orders
     *
     * Retrieves all orders for the admin dashboard with pagination.
     */
    @UseGuards(AdminSessionGuard, RolesGuard)
    @Roles(AdminRole.OWNER, AdminRole.EDITOR)
    @Get()
    getAll(@Query('page') page: string = '1', @Query('limit') limit: string = '10') {
        return this.ordersService.findAll(Number(page), Number(limit));
    }
}
