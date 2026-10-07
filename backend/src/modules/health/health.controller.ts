import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Health } from '@brics/shared';
import { HealthService } from './health.service';

@ApiTags('system')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /** Liveness + DB check. Returns 503 when the database is down (used by Render health checks). */
  @Get()
  @ApiOperation({ summary: 'API and database health' })
  async get(): Promise<Health> {
    const result = await this.health.check();
    if (result.db === 'down') {
      throw new ServiceUnavailableException({ code: 'DB_DOWN', message: 'Database unreachable', details: result });
    }
    return result;
  }
}
