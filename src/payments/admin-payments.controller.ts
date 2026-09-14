import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminSessionGuard } from '../auth/guards/admin-session.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { OrdersService } from '../orders/orders.service';

@Controller('admin/payments')
@UseGuards(AdminSessionGuard, RolesGuard)
@Roles(AdminRole.OWNER, AdminRole.EDITOR)
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
