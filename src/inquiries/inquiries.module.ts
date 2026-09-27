import { Module } from '@nestjs/common';
import { AdminInquiriesController, PublicInquiriesController } from './inquiries.controller';
import { InquiriesService } from './inquiries.service';

@Module({
    controllers: [PublicInquiriesController, AdminInquiriesController],
    providers: [InquiriesService],
})
export class InquiriesModule {}
