import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { CurrentAdmin } from './decorators/current-admin.decorator';
import { AdminSessionGuard } from './guards/admin-session.guard';
import { AuthenticatedAdmin, AuthenticatedAdminRequest } from './auth.types';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { ttl: 60_000, limit: 5 } })
    login(@Body() dto: LoginDto) {
        return this.authService.login(dto.email, dto.password);
    }

    @Post('logout')
    @HttpCode(HttpStatus.NO_CONTENT)
    @UseGuards(AdminSessionGuard)
    async logout(@Req() request: AuthenticatedAdminRequest): Promise<void> {
        const [, token] = request.headers.authorization?.split(' ') ?? [];
        if (token) {
            await this.authService.logout(token);
        }
    }

    @Post('change-password')
    @HttpCode(HttpStatus.OK)
    @UseGuards(AdminSessionGuard)
    changePassword(@CurrentAdmin() admin: AuthenticatedAdmin, @Body() dto: ChangePasswordDto) {
        return this.authService.changePassword(admin.id, dto.currentPassword, dto.newPassword);
    }

    @Get('me')
    @UseGuards(AdminSessionGuard)
    getCurrentAdmin(@CurrentAdmin() admin: AuthenticatedAdmin) {
        return { admin };
    }
}
