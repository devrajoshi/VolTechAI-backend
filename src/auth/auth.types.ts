import { AdminRole } from '@prisma/client';
import { Request } from 'express';

export interface AuthenticatedAdmin {
    id: string;
    email: string;
    role: AdminRole;
}

export interface AuthenticatedAdminRequest extends Request {
    admin?: AuthenticatedAdmin;
}

export interface AdminSessionResult {
    sessionToken: string;
    expiresAt: Date;
    admin: AuthenticatedAdmin;
}
