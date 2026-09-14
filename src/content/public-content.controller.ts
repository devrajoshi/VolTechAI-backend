import { Controller, Get } from '@nestjs/common';
import { ContentService } from './content.service';

@Controller('cms')
export class PublicContentController {
    constructor(private readonly contentService: ContentService) {}

    @Get('testimonials')
    getTestimonials() {
        return this.contentService.findPublishedTestimonials();
    }

    @Get('faqs')
    getFaqs() {
        return this.contentService.findPublishedFaqs();
    }
}
