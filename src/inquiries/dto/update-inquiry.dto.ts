import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { InquiryStatus } from '@prisma/client';

export class UpdateInquiryDto {
    @IsOptional() @IsEnum(InquiryStatus) status?: InquiryStatus;
    @IsOptional() @IsString() @MaxLength(30) assignedAdminId?: string | null;
}
