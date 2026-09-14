import { Global, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AdminSessionGuard } from './guards/admin-session.guard';
import { RolesGuard } from './guards/roles.guard';

@Global()
@Module({
    controllers: [AuthController],
    providers: [AuthService, AdminSessionGuard, RolesGuard],
    exports: [AuthService, AdminSessionGuard, RolesGuard],
})
export class AuthModule {}
