import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { CurrentAdmin } from '../auth/decorators/current-admin.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminSessionGuard } from '../auth/guards/admin-session.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedAdmin } from '../auth/auth.types';
import { ContentService } from './content.service';
import { CreateFaqDto } from './dto/create-faq.dto';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto';

@UseGuards(AdminSessionGuard, RolesGuard)
@Roles(AdminRole.OWNER, AdminRole.EDITOR)
@Controller('admin/cms')
export class AdminContentController {
    constructor(private readonly contentService: ContentService) {}

    @Get('testimonials')
    getTestimonials() {
        return this.contentService.findAdminTestimonials();
    }

    @Get('testimonials/:id')
    getTestimonial(@Param('id') id: string) {
        return this.contentService.findAdminTestimonial(id);
    }

    @Post('testimonials')
    createTestimonial(@Body() dto: CreateTestimonialDto, @CurrentAdmin() admin: AuthenticatedAdmin) {
        return this.contentService.createTestimonial(dto, admin.id);
    }

    @Patch('testimonials/:id')
    updateTestimonial(
        @Param('id') id: string,
        @Body() dto: UpdateTestimonialDto,
        @CurrentAdmin() admin: AuthenticatedAdmin,
    ) {
        return this.contentService.updateTestimonial(id, dto, admin.id);
    }

    @Delete('testimonials/:id')
    @HttpCode(HttpStatus.NO_CONTENT)
    deleteTestimonial(@Param('id') id: string) {
        return this.contentService.deleteTestimonial(id);
    }

    @Get('faqs')
    getFaqs() {
        return this.contentService.findAdminFaqs();
    }

    @Get('faqs/:id')
    getFaq(@Param('id') id: string) {
        return this.contentService.findAdminFaq(id);
    }

    @Post('faqs')
    createFaq(@Body() dto: CreateFaqDto, @CurrentAdmin() admin: AuthenticatedAdmin) {
        return this.contentService.createFaq(dto, admin.id);
    }

    @Patch('faqs/:id')
    updateFaq(
        @Param('id') id: string,
        @Body() dto: UpdateFaqDto,
        @CurrentAdmin() admin: AuthenticatedAdmin,
    ) {
        return this.contentService.updateFaq(id, dto, admin.id);
    }

    @Delete('faqs/:id')
    @HttpCode(HttpStatus.NO_CONTENT)
    deleteFaq(@Param('id') id: string) {
        return this.contentService.deleteFaq(id);
    }
}
