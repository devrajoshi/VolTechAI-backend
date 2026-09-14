import {
    BadRequestException,
    Injectable,
    Logger,
    OnModuleInit,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminRole } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AdminSessionResult, AuthenticatedAdmin } from './auth.types';

@Injectable()
export class AuthService implements OnModuleInit {
    private readonly logger = new Logger(AuthService.name);
    private readonly sessionTtlMs: number;

    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
    ) {
        const ttlHours = this.configService.get<number>('ADMIN_SESSION_TTL_HOURS', 12);
        this.sessionTtlMs = ttlHours * 60 * 60 * 1000;
    }

    async onModuleInit(): Promise<void> {
        const email = this.configService.get<string>('ADMIN_BOOTSTRAP_EMAIL')?.trim().toLowerCase();
        const password = this.configService.get<string>('ADMIN_BOOTSTRAP_PASSWORD');

        if (!email && !password) {
            return;
        }

        if (!email || !password) {
            this.logger.warn('Admin bootstrap credentials are incomplete; no owner was created.');
            return;
        }

        const existingAdmin = await this.prisma.adminUser.findUnique({ where: { email } });
        if (existingAdmin) {
            return;
        }

        await this.prisma.adminUser.create({
            data: {
                email,
                passwordHash: await this.hashPassword(password),
                role: AdminRole.OWNER,
            },
        });
        this.logger.log(`Created bootstrap OWNER account for ${email}. Remove ADMIN_BOOTSTRAP_PASSWORD after first deployment.`);
    }

    async login(email: string, password: string): Promise<AdminSessionResult> {
        const normalizedEmail = email.trim().toLowerCase();
        const admin = await this.prisma.adminUser.findUnique({ where: { email: normalizedEmail } });

        if (!admin || !admin.isActive || !(await argon2.verify(admin.passwordHash, password))) {
            throw new UnauthorizedException('Invalid email or password.');
        }

        await this.prisma.adminUser.update({
            where: { id: admin.id },
            data: { lastLoginAt: new Date() },
        });

        return this.createSession(this.toAuthenticatedAdmin(admin));
    }

    async authenticateSession(sessionToken: string): Promise<AuthenticatedAdmin> {
        const session = await this.prisma.adminSession.findUnique({
            where: { tokenHash: this.hashToken(sessionToken) },
            include: { user: true },
        });

        if (!session || session.expiresAt <= new Date() || !session.user.isActive) {
            if (session) {
                await this.prisma.adminSession.delete({ where: { id: session.id } });
            }
            throw new UnauthorizedException('Your session has expired. Please sign in again.');
        }

        await this.prisma.adminSession.update({
            where: { id: session.id },
            data: { lastUsedAt: new Date() },
        });

        return this.toAuthenticatedAdmin(session.user);
    }

    async logout(sessionToken: string): Promise<void> {
        await this.prisma.adminSession.deleteMany({
            where: { tokenHash: this.hashToken(sessionToken) },
        });
    }

    async changePassword(
        adminId: string,
        currentPassword: string,
        newPassword: string,
    ): Promise<AdminSessionResult> {
        const admin = await this.prisma.adminUser.findUnique({ where: { id: adminId } });
        if (!admin || !admin.isActive || !(await argon2.verify(admin.passwordHash, currentPassword))) {
            throw new UnauthorizedException('Your current password is incorrect.');
        }

        if (await argon2.verify(admin.passwordHash, newPassword)) {
            throw new BadRequestException('Choose a new password that differs from your current password.');
        }

        await this.prisma.$transaction([
            this.prisma.adminUser.update({
                where: { id: admin.id },
                data: { passwordHash: await this.hashPassword(newPassword) },
            }),
            this.prisma.adminSession.deleteMany({ where: { userId: admin.id } }),
        ]);

        return this.createSession(this.toAuthenticatedAdmin(admin));
    }

    private async createSession(admin: AuthenticatedAdmin): Promise<AdminSessionResult> {
        const sessionToken = randomBytes(32).toString('base64url');
        const expiresAt = new Date(Date.now() + this.sessionTtlMs);
        await this.prisma.adminSession.create({
            data: {
                tokenHash: this.hashToken(sessionToken),
                userId: admin.id,
                expiresAt,
            },
        });

        return { sessionToken, expiresAt, admin };
    }

    private async hashPassword(password: string): Promise<string> {
        return argon2.hash(password, {
            type: argon2.argon2id,
            memoryCost: 19_456,
            timeCost: 2,
            parallelism: 1,
        });
    }

    private hashToken(token: string): string {
        return createHash('sha256').update(token).digest('hex');
    }

    private toAuthenticatedAdmin(admin: { id: string; email: string; role: AdminRole }): AuthenticatedAdmin {
        return { id: admin.id, email: admin.email, role: admin.role };
    }
}
