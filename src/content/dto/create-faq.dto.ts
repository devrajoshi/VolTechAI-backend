import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;

export class CreateFaqDto {
    @Transform(trim)
    @IsString()
    @MinLength(5)
    @MaxLength(250)
    question: string;

    @Transform(trim)
    @IsString()
    @MinLength(10)
    @MaxLength(3_000)
    answer: string;

    @Transform(trim)
    @IsOptional()
    @IsString()
    @MaxLength(100)
    category?: string;

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
