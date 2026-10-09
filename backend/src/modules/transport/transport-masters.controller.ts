import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { TransportMastersService } from './transport-masters.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RequirePermissions, CurrentUser, CurrentCompany, JwtPayload } from '../../common/decorators/auth.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  CreateDriverDto,
  createDriverSchema,
  UpdateDriverDto,
  updateDriverSchema,
  CreateVehicleDto,
  createVehicleSchema,
  UpdateVehicleDto,
  updateVehicleSchema,
  PERMISSIONS,
} from '@brics/shared';

@Controller('transport')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class TransportMastersController {
  constructor(private readonly service: TransportMastersService) {}

  @Get('drivers')
  @RequirePermissions(PERMISSIONS.TRANSPORT_VIEW)
  async listDrivers(@CurrentCompany() companyId: string) {
    return this.service.listDrivers(companyId);
  }

  @Post('drivers')
  @RequirePermissions(PERMISSIONS.TRANSPORT_MANAGE)
  async createDriver(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createDriverSchema)) dto: CreateDriverDto,
  ) {
    return this.service.createDriver(companyId, user.sub, dto);
  }

  @Patch('drivers/:id')
  @RequirePermissions(PERMISSIONS.TRANSPORT_MANAGE)
  async updateDriver(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateDriverSchema)) dto: UpdateDriverDto,
  ) {
    return this.service.updateDriver(companyId, user.sub, id, dto);
  }

  @Get('vehicles')
  @RequirePermissions(PERMISSIONS.TRANSPORT_VIEW)
  async listVehicles(@CurrentCompany() companyId: string) {
    return this.service.listVehicles(companyId);
  }

  @Post('vehicles')
  @RequirePermissions(PERMISSIONS.TRANSPORT_MANAGE)
  async createVehicle(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createVehicleSchema)) dto: CreateVehicleDto,
  ) {
    return this.service.createVehicle(companyId, user.sub, dto);
  }

  @Patch('vehicles/:id')
  @RequirePermissions(PERMISSIONS.TRANSPORT_MANAGE)
  async updateVehicle(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateVehicleSchema)) dto: UpdateVehicleDto,
  ) {
    return this.service.updateVehicle(companyId, user.sub, id, dto);
  }
}
