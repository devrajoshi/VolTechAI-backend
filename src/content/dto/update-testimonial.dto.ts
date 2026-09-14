import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

const imagePathPattern = /^\/images\/(?!.*\.\.)[A-Za-z0-9._/-]+$/;
const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;

export class UpdateTestimonialDto {
    @Transform(trim)
    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(120)
    name?: string;

    @Transform(trim)
    @IsOptional()
    @IsString()
    @MaxLength(120)
    role?: string;

    @Transform(trim)
    @IsOptional()
    @IsString()
    @MaxLength(120)
    company?: string;

    @Transform(trim)
    @IsOptional()
    @IsString()
    @MinLength(10)
    @MaxLength(2_000)
    quote?: string;

    @Type(() => Number)
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(5)
    rating?: number;

    @Transform(trim)
    @IsOptional()
    @IsString()
    @MaxLength(255)
    @Matches(imagePathPattern, { message: 'imagePath must reference an existing /images asset.' })
    imagePath?: string;

    @IsOptional()
    @IsBoolean()
    isPublished?: boolean;

    @Type(() => Number)
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(10_000)
    sortOrder?: number;
}
