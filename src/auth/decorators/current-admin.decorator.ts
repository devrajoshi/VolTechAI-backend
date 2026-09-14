import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedAdminRequest } from '../auth.types';

export const CurrentAdmin = createParamDecorator(
    (_data: unknown, context: ExecutionContext) => {
        const request = context.switchToHttp().getRequest<AuthenticatedAdminRequest>();
        return request.admin;
    },
);
