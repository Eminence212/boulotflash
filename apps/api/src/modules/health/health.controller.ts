import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  async getHealth(@Res({ passthrough: true }) res: Response) {
    const payload = await this.health.check();
    res.status(payload.status === 'ok' ? 200 : 503);
    return payload;
  }
}
