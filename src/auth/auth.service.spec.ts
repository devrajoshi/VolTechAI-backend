import { ConfigService } from '@nestjs/config';
import { AdminRole } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
    const admin = {
        id: 'admin_1',
        email: 'admin@voltechai.co.uk',
        role: AdminRole.OWNER,
        isActive: true,
    };

    function createService(prisma: Record<string, unknown>) {
        const config = { get: jest.fn().mockReturnValue(12) } as unknown as ConfigService;
        return new AuthService(prisma as unknown as PrismaService, config);
    }

    it('creates an opaque, hashed database session after a valid login', async () => {
        const password = 'SafePassword123!';
        const passwordHash = await argon2.hash(password);
        const prisma = {
            adminUser: {
                findUnique: jest.fn().mockResolvedValue({ ...admin, passwordHash }),
                update: jest.fn().mockResolvedValue(admin),
            },
            adminSession: { create: jest.fn().mockResolvedValue({}) },
        };
        const service = createService(prisma);

        const result = await service.login(admin.email, password);

        expect(result.admin).toEqual({ id: admin.id, email: admin.email, role: AdminRole.OWNER });
        expect(result.sessionToken).toHaveLength(43);
        const persistedSession = prisma.adminSession.create.mock.calls[0][0].data;
        expect(persistedSession.tokenHash).toBe(createHash('sha256').update(result.sessionToken).digest('hex'));
        expect(persistedSession.tokenHash).not.toBe(result.sessionToken);
    });

    it('rejects an unknown administrator without creating a session', async () => {
        const prisma = {
            adminUser: { findUnique: jest.fn().mockResolvedValue(null), update: jest.fn() },
            adminSession: { create: jest.fn() },
        };
        const service = createService(prisma);

        await expect(service.login('missing@voltechai.co.uk', 'SafePassword123!')).rejects.toThrow('Invalid email or password.');
        expect(prisma.adminSession.create).not.toHaveBeenCalled();
    });
});
