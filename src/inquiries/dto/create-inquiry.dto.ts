import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { InquiryKind, InquirySource } from '@prisma/client';

export class CreateInquiryDto {
    @IsString() @MinLength(2) @MaxLength(120) name!: string;
    @IsEmail() @MaxLength(254) email!: string;
    @IsOptional() @IsString() @MaxLength(40) phone?: string;
    @IsOptional() @IsString() @MaxLength(160) company?: string;
    @IsOptional() @IsString() @MaxLength(240) website?: string;
    @IsString() @MinLength(3) @MaxLength(180) subject!: string;
    @IsString() @MinLength(10) @MaxLength(8000) message!: string;
    @IsOptional() @IsString() @MaxLength(500) interest?: string;
    @IsOptional() @IsString() @MaxLength(100) budget?: string;
    @IsOptional() @IsString() @MaxLength(100) timeline?: string;
    @IsEnum(InquiryKind) kind: InquiryKind = InquiryKind.GENERAL;
    @IsEnum(InquirySource) source: InquirySource = InquirySource.CONTACT_PAGE;
    @IsOptional() @IsString() @MaxLength(500) sourcePath?: string;
    @IsOptional() @IsString() @MaxLength(100) serviceSlug?: string;
    @IsOptional() @IsString() @MaxLength(100) packageSlug?: string;
    @IsOptional() @IsString() @MaxLength(100) bundleSlug?: string;
    @IsOptional() @IsString() @MaxLength(200) honeypot?: string;
}
