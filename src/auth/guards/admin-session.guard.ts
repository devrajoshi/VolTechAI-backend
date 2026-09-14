import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { AuthenticatedAdminRequest } from '../auth.types';

@Injectable()
export class AdminSessionGuard implements CanActivate {
    constructor(private readonly authService: AuthService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<AuthenticatedAdminRequest>();
        const [scheme, token] = request.headers.authorization?.split(' ') ?? [];

        if (scheme !== 'Bearer' || !token) {
            throw new UnauthorizedException('Authentication is required.');
        }

        request.admin = await this.authService.authenticateSession(token);
        return true;
    }
}
