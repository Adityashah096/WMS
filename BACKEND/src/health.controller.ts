import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  health() {
    return {
      status: 'UP',
      service: 'Robot Tracking API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}