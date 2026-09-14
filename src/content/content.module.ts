import { Module } from '@nestjs/common';
import { AdminContentController } from './admin-content.controller';
import { ContentService } from './content.service';
import { PublicContentController } from './public-content.controller';

@Module({
    controllers: [PublicContentController, AdminContentController],
    providers: [ContentService],
})
export class ContentModule {}
