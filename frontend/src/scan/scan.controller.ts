import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ScanService } from './scan.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/v1/scan')
export class ScanController {
  constructor(private readonly scanService: ScanService) {}

  // POST /api/v1/scan
  @Post()
  @UseGuards(JwtAuthGuard)
  async scan(@Body() body: any, @Request() req: any) {
    return this.scanService.processScan(
      body.serial,
      body.action,
      req.user.userId,
      body.location_id,
    );
  }

  // POST /api/v1/scan/validate
  @Post('validate')
  @UseGuards(JwtAuthGuard)
  async validateScan(@Body() body: any) {
    return this.scanService.validateScan(
      body.serial,
      body.action,
      body.location_id,
    );
  }
}
