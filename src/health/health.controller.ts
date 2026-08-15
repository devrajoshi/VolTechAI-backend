import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

/**
 * Health check endpoint for uptime monitoring and container orchestration.
 * Rate limiting is skipped as monitoring tools poll this frequently.
 */
@SkipThrottle()
@Controller('health')
export class HealthController {
    @Get()
    check() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: Math.floor(process.uptime()),
        };
    }
}
