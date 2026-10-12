import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  PERMISSIONS,
  createLabourGroupSchema,
  updateLabourGroupSchema,
  createWorkerSchema,
  updateWorkerSchema,
  createAttendanceSchema,
  attendanceQuerySchema,
  createAdvanceSchema,
  advanceQuerySchema,
  createDeductionSchema,
  deductionQuerySchema,
  createSettlementSchema,
  settlementQuerySchema,
  accrueWagesSchema,
  exposureSummaryQuerySchema,
  type CreateLabourGroupDto,
  type UpdateLabourGroupDto,
  type CreateWorkerDto,
  type UpdateWorkerDto,
  type CreateAttendanceDto,
  type AttendanceQueryDto,
  type CreateAdvanceDto,
  type AdvanceQueryDto,
  type CreateDeductionDto,
  type DeductionQueryDto,
  type CreateSettlementDto,
  type SettlementQueryDto,
  type AccrueWagesDto,
  type ExposureSummaryQueryDto,
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
import { LabourService } from './labour.service';

@ApiTags('Labour')
@ApiBearerAuth()
@Controller('labour')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class LabourController {
  constructor(private readonly service: LabourService) {}

  // ── GROUPS ──────────────────────────────────────────────────────────────────

  @Post('groups')
  @RequirePermissions(PERMISSIONS.LABOUR_MANAGE)
  @ApiOperation({ summary: 'LAB-01 — create a labour group under a Sardar' })
  async createGroup(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createLabourGroupSchema)) dto: CreateLabourGroupDto,
  ) {
    return this.service.createGroup(companyId, user.sub, dto);
  }

  @Get('groups')
  @RequirePermissions(PERMISSIONS.LABOUR_VIEW)
  @ApiOperation({ summary: 'List labour groups' })
  async listGroups(
    @CurrentCompany() companyId: string,
    @Query('siteId') siteId?: string,
    @Query('sardarPartyId') sardarPartyId?: string,
  ) {
    return this.service.findAllGroups(companyId, { siteId, sardarPartyId });
  }

  @Patch('groups/:id')
  @RequirePermissions(PERMISSIONS.LABOUR_MANAGE)
  @ApiOperation({ summary: 'Update a labour group' })
  async updateGroup(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateLabourGroupSchema)) dto: UpdateLabourGroupDto,
  ) {
    return this.service.updateGroup(companyId, user.sub, id, dto);
  }

  // ── WORKERS ─────────────────────────────────────────────────────────────────

  @Post('workers')
  @RequirePermissions(PERMISSIONS.LABOUR_MANAGE)
  @ApiOperation({ summary: 'LAB-01 — create a worker record' })
  async createWorker(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createWorkerSchema)) dto: CreateWorkerDto,
  ) {
    return this.service.createWorker(companyId, user.sub, dto);
  }

  @Get('workers')
  @RequirePermissions(PERMISSIONS.LABOUR_VIEW)
  @ApiOperation({ summary: 'List workers' })
  async listWorkers(@CurrentCompany() companyId: string, @Query('labourGroupId') labourGroupId?: string) {
    return this.service.findAllWorkers(companyId, { labourGroupId });
  }

  @Patch('workers/:id')
  @RequirePermissions(PERMISSIONS.LABOUR_MANAGE)
  @ApiOperation({ summary: 'Update a worker record' })
  async updateWorker(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateWorkerSchema)) dto: UpdateWorkerDto,
  ) {
    return this.service.updateWorker(companyId, user.sub, id, dto);
  }

  // ── ATTENDANCE ──────────────────────────────────────────────────────────────

  @Post('attendance')
  @RequirePermissions(PERMISSIONS.LABOUR_MANAGE)
  @ApiOperation({ summary: 'LAB-02 — record daily attendance (Idempotency-Key honoured)' })
  async recordAttendance(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @IdempotencyKey() idempotencyKey: string | null,
    @Body(new ZodValidationPipe(createAttendanceSchema)) dto: CreateAttendanceDto,
  ) {
    return this.service.recordAttendance(companyId, user.sub, dto, idempotencyKey);
  }

  @Get('attendance')
  @RequirePermissions(PERMISSIONS.LABOUR_VIEW)
  @ApiOperation({ summary: 'List daily attendance records with filters' })
  async listAttendance(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(attendanceQuerySchema)) query: AttendanceQueryDto,
  ) {
    return this.service.findAllAttendance(companyId, query);
  }

  // ── ADVANCES & LEK-03 ───────────────────────────────────────────────────────

  @Post('advances')
  @RequirePermissions(PERMISSIONS.LABOUR_MANAGE)
  @ApiOperation({
    summary: 'LAB-05 / LEK-03 — cash advance to Sardar/worker with live exposure warning (Idempotency-Key honoured)',
  })
  async createAdvance(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @IdempotencyKey() idempotencyKey: string | null,
    @Body(new ZodValidationPipe(createAdvanceSchema)) dto: CreateAdvanceDto,
  ) {
    return this.service.createAdvance(companyId, user.sub, dto, idempotencyKey);
  }

  @Get('advances')
  @RequirePermissions(PERMISSIONS.LABOUR_VIEW)
  @ApiOperation({ summary: 'List cash advances with filters' })
  async listAdvances(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(advanceQuerySchema)) query: AdvanceQueryDto,
  ) {
    return this.service.findAllAdvances(companyId, query);
  }

  @Get(['advances/exposure', 'exposure'])
  @RequirePermissions(PERMISSIONS.LABOUR_VIEW)
  @ApiOperation({ summary: 'LEK-03 — live Sardar advance exposure' })
  async getExposure(@CurrentCompany() companyId: string, @Query('sardarPartyId') sardarPartyId: string) {
    return this.service.getAdvanceExposure(companyId, sardarPartyId);
  }

  @Get('exposure-summary')
  @RequirePermissions(PERMISSIONS.LABOUR_VIEW)
  @ApiOperation({ summary: 'LEK-03 — overview report of all Sardars ranked by advance exposure' })
  async getExposureSummary(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(exposureSummaryQuerySchema)) query: ExposureSummaryQueryDto,
  ) {
    return this.service.getExposureSummary(companyId, query);
  }

  // ── DEDUCTIONS ──────────────────────────────────────────────────────────────

  @Post('deductions')
  @RequirePermissions(PERMISSIONS.LABOUR_MANAGE)
  @ApiOperation({ summary: 'LAB-06 — record khurak / loan instalment / fines' })
  async createDeduction(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createDeductionSchema)) dto: CreateDeductionDto,
  ) {
    return this.service.createDeduction(companyId, user.sub, dto);
  }

  @Get('deductions')
  @RequirePermissions(PERMISSIONS.LABOUR_VIEW)
  @ApiOperation({ summary: 'List deductions with filters' })
  async listDeductions(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(deductionQuerySchema)) query: DeductionQueryDto,
  ) {
    return this.service.findAllDeductions(companyId, query);
  }

  // ── AUTO WAGE ACCRUAL (LAB-04) ──────────────────────────────────────────────

  @Post('accrue-wages')
  @RequirePermissions(PERMISSIONS.LABOUR_MANAGE)
  @ApiOperation({ summary: 'LAB-04 — auto wage accrual from production/attendance into Sardar ledger' })
  async accrueWages(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @IdempotencyKey() idempotencyKey: string | null,
    @Body(new ZodValidationPipe(accrueWagesSchema)) dto: AccrueWagesDto,
  ) {
    return this.service.accrueWages(companyId, user.sub, dto, idempotencyKey);
  }

  // ── SETTLEMENTS ─────────────────────────────────────────────────────────────

  @Post('settlements')
  @RequirePermissions(PERMISSIONS.LABOUR_MANAGE)
  @ApiOperation({ summary: 'LAB-07 — seasonal wage settlement (Idempotency-Key honoured)' })
  async createSettlement(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @IdempotencyKey() idempotencyKey: string | null,
    @Body(new ZodValidationPipe(createSettlementSchema)) dto: CreateSettlementDto,
  ) {
    return this.service.createSettlement(companyId, user.sub, dto, idempotencyKey);
  }

  @Get('settlements')
  @RequirePermissions(PERMISSIONS.LABOUR_VIEW)
  @ApiOperation({ summary: 'List wage settlements with filters' })
  async listSettlements(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(settlementQuerySchema)) query: SettlementQueryDto,
  ) {
    return this.service.findAllSettlements(companyId, query);
  }

  @Get('settlements/:id')
  @RequirePermissions(PERMISSIONS.LABOUR_VIEW)
  @ApiOperation({ summary: 'Get single wage settlement by id' })
  async getSettlement(@CurrentCompany() companyId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findSettlementById(companyId, id);
  }
}
