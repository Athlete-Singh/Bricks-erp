import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  dayBookQuerySchema,
  ledgerStatementQuerySchema,
  trialBalanceQuerySchema,
  PERMISSIONS,
  type DayBookQueryDto,
  type LedgerStatementQueryDto,
  type TrialBalanceQueryDto,
} from '@brics/shared';
import { CurrentCompany, RequirePermissions } from '../common/decorators/auth.decorators';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ReportsService } from './reports.service';

/** The books (ACC-05). Read-only, always scoped to the JWT tenant. */
@ApiTags('Books')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private reports: ReportsService) {}

  @Get('day-book')
  @RequirePermissions(PERMISSIONS.ACCOUNTS_VIEW)
  @ApiOperation({ summary: 'Day Book — every voucher in a date range, with its entries' })
  async dayBook(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(dayBookQuerySchema)) query: DayBookQueryDto,
  ) {
    return this.reports.dayBook(companyId, query);
  }

  @Get('ledgers/:ledgerId')
  @RequirePermissions(PERMISSIONS.ACCOUNTS_VIEW)
  @ApiOperation({ summary: 'Ledger statement — opening, every entry with a running balance, closing' })
  async ledgerStatement(
    @Param('ledgerId', ParseUUIDPipe) ledgerId: string,
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(ledgerStatementQuerySchema)) query: LedgerStatementQueryDto,
  ) {
    return this.reports.ledgerStatement(companyId, ledgerId, query);
  }

  @Get('trial-balance')
  @RequirePermissions(PERMISSIONS.ACCOUNTS_VIEW)
  @ApiOperation({ summary: 'Trial Balance — closing balance per ledger, with Σ debit vs Σ credit' })
  async trialBalance(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(trialBalanceQuerySchema)) query: TrialBalanceQueryDto,
  ) {
    return this.reports.trialBalance(companyId, query);
  }
}
