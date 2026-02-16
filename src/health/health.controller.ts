import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AppEnv } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly config: ConfigService<AppEnv, true>,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Service health check' })
  @ApiOkResponse({
    schema: {
      example: { ok: true, env: 'development' },
    },
  })
  health() {
    return {
      ok: true,
      env: this.config.get<AppEnv['NODE_ENV']>('NODE_ENV'),
    };
  }

  @Get('db')
  @ApiOperation({ summary: 'Database connectivity check' })
  @ApiOkResponse({ schema: { example: { ok: true } } })
  async dbHealth() {
    await this.prisma.$executeRaw`SELECT 1`;
    return { ok: true };
  }
}
