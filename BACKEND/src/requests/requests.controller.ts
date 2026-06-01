import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestsService } from './requests.service';

class TransferRequestDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  targetLocationId!: number;
}

class LocationScopedDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  locationId?: number;
}

class PackageDraftDto {
  @IsArray()
  @IsString({ each: true })
  serialNumbers!: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  locationId?: number;
}

@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Get('packages')
  @UseGuards(JwtAuthGuard)
  async getAllPackages(
    @Request() req,
    @Query('location_id') locationId?: string,
  ) {
    return this.requestsService.getAllPackages(
      req.user,
      locationId ? Number(locationId) : undefined,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getAllRequests(
    @Request() req,
    @Query('location_id') locationId?: string,
    @Query('locationid') locationIdLegacy?: string,
  ) {
    const requestedLocationId = locationId || locationIdLegacy;
    return this.requestsService.getAllRequests(
      req.user,
      requestedLocationId ? Number(requestedLocationId) : undefined,
    );
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('approvalFile'))
  async createRequest(
    @Body() body: any,
    @UploadedFile() approvalFile: any,
    @Request() req,
  ) {
    try {
      let parsedProducts = body?.products;

      if (typeof parsedProducts === 'string') {
        try {
          parsedProducts = JSON.parse(parsedProducts);
        } catch {
          throw new BadRequestException('Products must be a valid JSON array');
        }
      }

      if (!Array.isArray(parsedProducts)) {
        throw new BadRequestException('Products must be an array');
      }

      const normalizedProducts = parsedProducts.map((item: any) => ({
        product: String(item?.product || '').trim(),
        color: item?.color ? String(item.color).trim() : undefined,
        quantity: Number(item?.quantity),
      }));

      const invalidProduct = normalizedProducts.find(
        (item: any) =>
          !item.product ||
          item.product.length < 2 ||
          item.product.length > 160 ||
          !Number.isInteger(item.quantity) ||
          item.quantity < 1,
      );

      if (invalidProduct) {
        throw new BadRequestException(
          'Each product must include a valid product name and quantity of at least 1',
        );
      }

      const parsedBody = {
        ...body,
        products: normalizedProducts,
      };

      return this.requestsService.createRequest(parsedBody, req.user, approvalFile);
    } catch (error) {
      console.error('CreateRequest Error:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(error?.message || 'Failed to create request');
    }
  }

  @Post(':requestId/approve')
  @UseGuards(JwtAuthGuard)
  async approveRequest(
    @Param('requestId', ParseIntPipe) requestId: number,
    @Body() body: LocationScopedDto,
    @Request() req,
  ) {
    return this.requestsService.approveAtLocation(
      requestId,
      req.user,
      body.locationId,
    );
  }

  @Put(':requestId/package-draft')
  @UseGuards(JwtAuthGuard)
  async savePackageDraft(
    @Param('requestId', ParseIntPipe) requestId: number,
    @Body() body: PackageDraftDto,
    @Request() req,
  ) {
    return this.requestsService.savePackageDraft(requestId, body, req.user);
  }

  @Post(':requestId/package-confirm')
  @UseGuards(JwtAuthGuard)
  async confirmPackage(
    @Param('requestId', ParseIntPipe) requestId: number,
    @Body() body: PackageDraftDto,
    @Request() req,
  ) {
    return this.requestsService.confirmPackage(requestId, body, req.user);
  }

  @Post(':requestId/transfer')
  @UseGuards(JwtAuthGuard)
  async transferRequest(
    @Param('requestId', ParseIntPipe) requestId: number,
    @Body() body: TransferRequestDto,
    @Request() req,
  ) {
    return this.requestsService.transferToLocation(requestId, body, req.user);
  }
}
