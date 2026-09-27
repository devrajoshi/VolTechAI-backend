import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminRole, InquiryStatus } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { CurrentAdmin } from '../auth/decorators/current-admin.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminSessionGuard } from '../auth/guards/admin-session.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedAdmin } from '../auth/auth.types';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { CreateInquiryNoteDto } from './dto/create-inquiry-note.dto';
import { UpdateInquiryDto } from './dto/update-inquiry.dto';
import { InquiriesService } from './inquiries.service';

@Controller()
export class PublicInquiriesController {
    constructor(private readonly inquiries: InquiriesService) {}

    @Post('inquiries')
    @Throttle({ default: { ttl: 60_000, limit: 5 } })
    create(@Body() dto: CreateInquiryDto) {
        return this.inquiries.create(dto);
    }
}

@UseGuards(AdminSessionGuard, RolesGuard)
@Roles(AdminRole.OWNER, AdminRole.EDITOR)
@Controller('admin/inquiries')
export class AdminInquiriesController {
    constructor(private readonly inquiries: InquiriesService) {}

    @Get()
    list(
        @Query('page', new ParseIntPipe({ optional: true })) page = 1,
        @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
        @Query('q') q?: string,
        @Query('status') status?: InquiryStatus,
    ) {
        return this.inquiries.list({ page, limit, q, status });
    }

    @Get(':id')
    get(@Param('id') id: string) {
        return this.inquiries.get(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateInquiryDto) {
        return this.inquiries.update(id, dto);
    }

    @Post(':id/notes')
    addNote(@Param('id') id: string, @Body() dto: CreateInquiryNoteDto, @CurrentAdmin() admin: AuthenticatedAdmin) {
        return this.inquiries.addNote(id, dto.note, admin.id);
    }
}
