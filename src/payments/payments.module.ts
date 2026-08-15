import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PackagesModule } from '../packages/packages.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
    imports: [PackagesModule, OrdersModule],
    controllers: [PaymentsController],
    providers: [PaymentsService],
    exports: [PaymentsService], // Exported so WebhooksModule can reuse the Stripe instance
})
export class PaymentsModule { }
