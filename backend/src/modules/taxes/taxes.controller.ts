import { Controller, Get, Post, Patch, Body, Param, UseGuards, Query } from '@nestjs/common';
import { TaxesService } from './taxes.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RequirePermissions, CurrentUser, CurrentCompany, JwtPayload } from '../../common/decorators/auth.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  CreateHsnRateDto,
  createHsnRateSchema,
  UpdateHsnRateDto,
  updateHsnRateSchema,
  PERMISSIONS,
  masterQuerySchema,
  MasterQueryDto,
} from '@brics/shared';

@Controller('taxes')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class TaxesController {
  constructor(private readonly service: TaxesService) {}

  @Get('hsn-rates')
  @RequirePermissions(PERMISSIONS.TAXES_VIEW)
  async listHsnRates(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(masterQuerySchema)) query: MasterQueryDto,
  ) {
    return this.service.listHsnRates(companyId, query);
  }

  @Post('hsn-rates')
  @RequirePermissions(PERMISSIONS.TAXES_MANAGE)
  async createHsnRate(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createHsnRateSchema)) dto: CreateHsnRateDto,
  ) {
    return this.service.createHsnRate(companyId, user.sub, dto);
  }

  @Patch('hsn-rates/:id')
  @RequirePermissions(PERMISSIONS.TAXES_MANAGE)
  async updateHsnRate(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateHsnRateSchema)) dto: UpdateHsnRateDto,
  ) {
    return this.service.updateHsnRate(companyId, user.sub, id, dto);
  }
}
