import {
  BadRequestException,
  Controller, Post, Get, Body,
  ForbiddenException, UseGuards, Request, Query, Param
} from '@nestjs/common';
import { ScanService } from './scan.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsString, IsIn, IsNumber, IsOptional } from 'class-validator';

class ScanDto {
  @IsString()
  serial!: string;

  @IsIn(['IN', 'OUT'])
  action!: 'IN' | 'OUT';

  @IsIn(['NEW', 'OPEN'])
  condition!: 'NEW' | 'OPEN';

  @IsNumber()
  location_id!: number;

  @IsOptional()
  @IsNumber()
  destination_location_id?: number;
}

@Controller('scan')
export class ScanController {
  constructor(private scanService: ScanService) {}

  private resolveLocationScope(requestedLocationId: number | string | undefined, user: any) {
    if (requestedLocationId === undefined || requestedLocationId === null || requestedLocationId === '') {
      return user.role === 'ADMIN' ? undefined : user.location_id;
    }

    const parsedLocationId = Number(requestedLocationId);
    if (Number.isNaN(parsedLocationId)) {
      throw new BadRequestException('Invalid location_id');
    }

    if (user.role !== 'ADMIN' && parsedLocationId !== user.location_id) {
      throw new ForbiddenException('You can only access data for your assigned location');
    }

    return parsedLocationId;
  }

  // POST /api/v1/scan
  @Post()
  @UseGuards(JwtAuthGuard)
  async processScan(@Body() scanDto: ScanDto, @Request() req) {
    return this.scanService.processScan(
      scanDto.serial,
      scanDto.action,
      scanDto.condition,
      req.user.user_id,
      scanDto.location_id,
      scanDto.destination_location_id,
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

  // GET /api/v1/scan
  @Get()
  @UseGuards(JwtAuthGuard)
  async getAllScans(@Query('location_id') locationId: number, @Request() req) {
    const scopedLocationId = this.resolveLocationScope(locationId, req.user);
    return this.scanService.getAllScans(scopedLocationId);
  }

  // GET /api/v1/scan/other-locations
  @Get('other-locations')
  @UseGuards(JwtAuthGuard)
  async getOtherLocations(@Query('current') currentLocationId: number) {
    return this.scanService.getOtherLocations(currentLocationId);
  }

  // GET /api/v1/scan/dashboard
  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  async getDashboard(@Query('location_id') locationId: number, @Request() req) {
    const scopedLocationId = this.resolveLocationScope(locationId, req.user);
    return this.scanService.getDashboardStats(scopedLocationId);
  }

  // GET /api/v1/scan/export
  @Get('export')
  @UseGuards(JwtAuthGuard)
  async getExportData(@Query('location_id') locationId: number, @Request() req) {
    const scopedLocationId = this.resolveLocationScope(locationId, req.user);
    return this.scanService.getExportData(scopedLocationId);
  }

  // GET /api/v1/scan/robot/:serial
  @Get('robot/:serial')
  @UseGuards(JwtAuthGuard)
  async getRobotHistory(@Param('serial') serial: string, @Request() req) {
    const scopedLocationId = req.user.role === 'ADMIN' ? undefined : req.user.location_id;
    return this.scanService.getRobotHistory(serial, scopedLocationId);
  }
}
