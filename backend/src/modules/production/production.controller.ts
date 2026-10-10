import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  PERMISSIONS,
  fuelVarianceQuerySchema,
  productionBatchCreateSchema,
  productionBatchQuerySchema,
  productionDryingSchema,
  productionFiringSchema,
  productionMakingSchema,
  productionSortingSchema,
  yieldVarianceQuerySchema,
  type FuelVarianceQueryDto,
  type ProductionBatchCreateDto,
  type ProductionBatchQueryDto,
  type ProductionDryingDto,
  type ProductionFiringDto,
  type ProductionMakingDto,
  type ProductionSortingDto,
  type YieldVarianceQueryDto,
  productionReportQuerySchema,
  type ProductionReportQueryDto,
} from '@brics/shared';
import {
  CurrentCompany,
  CurrentUser,
  IdempotencyKey,
  JwtPayload,
  RequirePermissions,
} from '../../common/decorators/auth.decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ProductionReportsService } from './production-reports.service';
import { ProductionService } from './production.service';

@ApiTags('Production')
@ApiBearerAuth()
@Controller('production')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class ProductionController {
  constructor(
    private readonly production: ProductionService,
    private readonly reports: ProductionReportsService,
  ) {}

  @Post('batches')
  @RequirePermissions(PERMISSIONS.PRODUCTION_MANAGE)
  @ApiOperation({ summary: 'PRD-02 — open a new production batch for a kiln + chamber + date' })
  async createBatch(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @IdempotencyKey() idempotencyKey: string | null,
    @Body(new ZodValidationPipe(productionBatchCreateSchema)) dto: ProductionBatchCreateDto,
  ) {
    return this.production.createBatch(companyId, user.sub, dto, idempotencyKey);
  }

  @Get('batches')
  @RequirePermissions(PERMISSIONS.PRODUCTION_VIEW)
  @ApiOperation({ summary: 'List production batches, filtered by kiln / chamber / status / date range' })
  async listBatches(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(productionBatchQuerySchema)) query: ProductionBatchQueryDto,
  ) {
    return this.production.listBatches(companyId, query);
  }

  @Get('batches/:id')
  @RequirePermissions(PERMISSIONS.PRODUCTION_VIEW)
  @ApiOperation({ summary: 'The batch, its stage entries and sorting outputs' })
  async getBatch(@CurrentCompany() companyId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.production.getBatch(companyId, id);
  }

  @Post('batches/:id/making')
  @RequirePermissions(PERMISSIONS.PRODUCTION_MANAGE)
  @ApiOperation({ summary: 'PRD-03 — record the green bricks moulded for this batch' })
  async making(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @IdempotencyKey() idempotencyKey: string | null,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(productionMakingSchema)) dto: ProductionMakingDto,
  ) {
    return this.production.recordMaking(companyId, user.sub, id, dto, idempotencyKey);
  }

  @Post('batches/:id/drying')
  @RequirePermissions(PERMISSIONS.PRODUCTION_MANAGE)
  @ApiOperation({ summary: 'PRD-03 — record the drying stage completion' })
  async drying(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @IdempotencyKey() idempotencyKey: string | null,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(productionDryingSchema)) dto: ProductionDryingDto,
  ) {
    return this.production.recordDrying(companyId, user.sub, id, dto, idempotencyKey);
  }

  @Post('batches/:id/firing')
  @RequirePermissions(PERMISSIONS.PRODUCTION_MANAGE)
  @ApiOperation({ summary: 'PRD-03 — record the fired brick count for this batch' })
  async firing(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @IdempotencyKey() idempotencyKey: string | null,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(productionFiringSchema)) dto: ProductionFiringDto,
  ) {
    return this.production.recordFiring(companyId, user.sub, id, dto, idempotencyKey);
  }

  @Post('batches/:id/sorting')
  @RequirePermissions(PERMISSIONS.PRODUCTION_MANAGE)
  @ApiOperation({
    summary: 'PRD-03/PRD-05 — sort the batch; good bricks per grade enter finished stock (in one transaction)',
  })
  async sorting(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @IdempotencyKey() idempotencyKey: string | null,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(productionSortingSchema)) dto: ProductionSortingDto,
  ) {
    return this.production.recordSorting(companyId, user.sub, id, dto, idempotencyKey);
  }

  @Get('yield-variance')
  @RequirePermissions(PERMISSIONS.PRODUCTION_VIEW)
  @ApiOperation({
    summary: 'LEK-01 — brick yield variance: green moulded − (good + broken + rejects) per batch / chamber / Sardar',
  })
  async yieldVariance(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(yieldVarianceQuerySchema)) query: YieldVarianceQueryDto,
  ) {
    return this.reports.yieldVariance(companyId, query);
  }

  @Get('fuel-variance')
  @RequirePermissions(PERMISSIONS.PRODUCTION_VIEW)
  @ApiOperation({
    summary: 'LEK-02 — fuel per 1,000 bricks fired, grouped by batch / kiln / month, with outliers flagged',
  })
  async fuelVariance(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(fuelVarianceQuerySchema)) query: FuelVarianceQueryDto,
  ) {
    return this.reports.fuelVariance(companyId, query);
  }

  @Get('report')
  @RequirePermissions(PERMISSIONS.PRODUCTION_VIEW)
  @ApiOperation({ summary: 'PRD-07 — production by day / month / year, per kiln and grade' })
  async productionReport(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(productionReportQuerySchema)) query: ProductionReportQueryDto,
  ) {
    return this.reports.productionReport(companyId, query);
  }
}
