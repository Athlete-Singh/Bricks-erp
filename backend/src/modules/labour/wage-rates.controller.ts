import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { WageRatesService } from './wage-rates.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RequirePermissions, CurrentUser, CurrentCompany, JwtPayload } from '../../common/decorators/auth.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  CreateWageRateDto,
  createWageRateSchema,
  UpdateWageRateDto,
  updateWageRateSchema,
  PERMISSIONS,
} from '@brics/shared';

@Controller('labour')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class WageRatesController {
  constructor(private readonly service: WageRatesService) {}

  @Get('wage-rates')
  @RequirePermissions(PERMISSIONS.LABOUR_VIEW)
  async listWageRates(@CurrentCompany() companyId: string) {
    return this.service.listWageRates(companyId);
  }

  @Post('wage-rates')
  @RequirePermissions(PERMISSIONS.LABOUR_MANAGE)
  async createWageRate(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createWageRateSchema)) dto: CreateWageRateDto,
  ) {
    return this.service.createWageRate(companyId, user.sub, dto);
  }

  @Patch('wage-rates/:id')
  @RequirePermissions(PERMISSIONS.LABOUR_MANAGE)
  async updateWageRate(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateWageRateSchema)) dto: UpdateWageRateDto,
  ) {
    return this.service.updateWageRate(companyId, user.sub, id, dto);
  }
}
