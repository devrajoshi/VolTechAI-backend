import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponse {
    statusCode: number;
    message: string | string[];
    error: string;
    timestamp: string;
    path: string;
}

/**
 * Global HTTP exception filter.
 *
 * - In production: strips internal details, never leaks stack traces.
 * - In development: includes more debugging context.
 * - Always returns a consistent, typed error shape.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    constructor(private readonly nodeEnv: string) { }

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        let status: number;
        let message: string | string[];
        let errorName: string;

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();

            // Handle NestJS validation pipe errors (returns object with message array)
            if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
                const resp = exceptionResponse as Record<string, unknown>;
                message = (resp['message'] as string | string[]) ?? exception.message;
                errorName = (resp['error'] as string) ?? exception.constructor.name;
            } else {
                message = exceptionResponse as string;
                errorName = exception.constructor.name;
            }
        } else {
            // Unhandled/unexpected errors — never expose internals
            status = HttpStatus.INTERNAL_SERVER_ERROR;
            message = 'An unexpected error occurred.';
            errorName = 'InternalServerError';

            // Log full error only on server side
            this.logger.error(
                `Unhandled exception on [${request.method}] ${request.url}`,
                exception instanceof Error ? exception.stack : String(exception),
            );
        }

        const errorBody: ErrorResponse = {
            statusCode: status,
            message,
            error: errorName,
            timestamp: new Date().toISOString(),
            path: request.url,
        };

        // In dev mode, log every error for easier debugging
        if (this.nodeEnv !== 'production') {
            this.logger.warn(
                `[${status}] ${request.method} ${request.url} → ${JSON.stringify(message)}`,
            );
        }

        response.status(status).json(errorBody);
    }
}
