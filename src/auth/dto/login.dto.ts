import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
    @Transform(({ value }) => String(value).trim().toLowerCase())
    @IsEmail()
    @MaxLength(254)
    email: string;

    @IsString()
    @MinLength(8)
    @MaxLength(128)
    password: string;
}
