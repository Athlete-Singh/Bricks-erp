import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  costPerThousandQuerySchema,
  dailyReportQuerySchema,
  dashboardMonthlyQuerySchema,
  dashboardSummaryQuerySchema,
  labourRegisterQuerySchema,
  salesRegisterQuerySchema,
  PERMISSIONS,
  type CostPerThousandQueryDto,
  type DailyReportQueryDto,
  type DashboardMonthlyQueryDto,
  type DashboardSummaryQueryDto,
  type LabourRegisterQueryDto,
  type SalesRegisterQueryDto,
} from '@brics/shared';
import { CurrentCompany, RequirePermissions } from '../../common/decorators/auth.decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { DashboardService } from './dashboard.service';

/**
 * The P11 reads — the owner dashboard, the monthly trend series and
 * cost-per-1,000. All gated on `accounts.view`, which the Owner, Super Admin,
 * Accountant and Manager already carry (ADM-06); a dedicated permission would
 * cost a migration without adding meaning for CP1.
 */
@ApiTags('Dashboard & costing')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('dashboard/summary')
  @RequirePermissions(PERMISSIONS.ACCOUNTS_VIEW)
  @ApiOperation({ summary: 'DSH-01 — Key Management Questions on one call' })
  async summary(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(dashboardSummaryQuerySchema)) query: DashboardSummaryQueryDto,
  ) {
    return this.dashboard.summary(companyId, query);
  }

  @Get('dashboard/monthly')
  @RequirePermissions(PERMISSIONS.ACCOUNTS_VIEW)
  @ApiOperation({ summary: 'DSH-02 — rolling monthly series for the trend charts' })
  async monthly(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(dashboardMonthlyQuerySchema)) query: DashboardMonthlyQueryDto,
  ) {
    return this.dashboard.monthly(companyId, query);
  }

  @Get('reports/cost-per-1000')
  @RequirePermissions(PERMISSIONS.ACCOUNTS_VIEW)
  @ApiOperation({ summary: 'CST-01 — Cost per 1,000 bricks against the ₹4,100 benchmark' })
  async costPerThousand(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(costPerThousandQuerySchema)) query: CostPerThousandQueryDto,
  ) {
    return this.dashboard.costPerThousand(companyId, query);
  }

  @Get('reports/daily')
  @RequirePermissions(PERMISSIONS.ACCOUNTS_VIEW)
  @ApiOperation({ summary: 'RPT-02 — one page per day across every module' })
  async daily(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(dailyReportQuerySchema)) query: DailyReportQueryDto,
  ) {
    return this.dashboard.daily(companyId, query);
  }

  @Get('reports/sales-register')
  @RequirePermissions(PERMISSIONS.ACCOUNTS_VIEW)
  @ApiOperation({ summary: 'RPT-03 — sales register, line by line with GST' })
  async salesRegister(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(salesRegisterQuerySchema)) query: SalesRegisterQueryDto,
  ) {
    return this.dashboard.salesRegister(companyId, query);
  }

  @Get('reports/labour-register')
  @RequirePermissions(PERMISSIONS.ACCOUNTS_VIEW)
  @ApiOperation({ summary: 'RPT-04 — labour attendance or wage register' })
  async labourRegister(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(labourRegisterQuerySchema)) query: LabourRegisterQueryDto,
  ) {
    return this.dashboard.labourRegister(companyId, query);
  }
}
