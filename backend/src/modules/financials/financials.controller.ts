import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  balanceSheetQuerySchema,
  closeFinancialYearSchema,
  closingStockQuerySchema,
  partyBalancesQuerySchema,
  profitAndLossQuerySchema,
  setClosingStockRatesSchema,
  PERMISSIONS,
  type BalanceSheetQueryDto,
  type CloseFinancialYearDto,
  type ClosingStockQueryDto,
  type PartyBalancesQueryDto,
  type ProfitAndLossQueryDto,
  type SetClosingStockRatesDto,
} from '@brics/shared';
import { CurrentCompany, CurrentUser, JwtPayload, RequirePermissions } from '../../common/decorators/auth.decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { FinancialsService } from './financials.service';

@ApiTags('Financial statements')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class FinancialsController {
  constructor(private readonly financials: FinancialsService) {}

  // ── closing stock (OQ #4) ──────────────────────────────────────────────────

  @Get('reports/closing-stock')
  @RequirePermissions(PERMISSIONS.ACCOUNTS_VIEW)
  @ApiOperation({ summary: 'What the yard is worth on a date, and what is still unpriced' })
  async closingStock(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(closingStockQuerySchema)) query: ClosingStockQueryDto,
  ) {
    return this.financials.closingStock(companyId, query);
  }

  /** Pricing the yard changes what the P&L and Balance Sheet say — accounts.manage. */
  @Post('reports/closing-stock/rates')
  @RequirePermissions(PERMISSIONS.ACCOUNTS_MANAGE)
  @ApiOperation({ summary: 'Enter the closing rate per grade for a valuation date (OQ #4)' })
  async setRates(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(setClosingStockRatesSchema)) dto: SetClosingStockRatesDto,
  ) {
    return this.financials.setClosingStockRates(companyId, user.sub, dto);
  }

  // ── ACC-08 ─────────────────────────────────────────────────────────────────

  @Get('reports/profit-and-loss')
  @RequirePermissions(PERMISSIONS.ACCOUNTS_VIEW)
  @ApiOperation({ summary: 'ACC-08 — Profit & Loss with gross and net profit' })
  async profitAndLoss(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(profitAndLossQuerySchema)) query: ProfitAndLossQueryDto,
  ) {
    return this.financials.profitAndLoss(companyId, query);
  }

  @Get('reports/balance-sheet')
  @RequirePermissions(PERMISSIONS.ACCOUNTS_VIEW)
  @ApiOperation({ summary: 'ACC-08 — Balance Sheet as at a date' })
  async balanceSheet(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(balanceSheetQuerySchema)) query: BalanceSheetQueryDto,
  ) {
    return this.financials.balanceSheet(companyId, query);
  }

  // ── ACC-09 ─────────────────────────────────────────────────────────────────

  @Get('reports/party-balances')
  @RequirePermissions(PERMISSIONS.ACCOUNTS_VIEW)
  @ApiOperation({ summary: 'ACC-09 — who owes the kiln and who the kiln owes' })
  async partyBalances(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(partyBalancesQuerySchema)) query: PartyBalancesQueryDto,
  ) {
    return this.financials.partyBalances(companyId, query);
  }

  // ── ACC-10 ─────────────────────────────────────────────────────────────────

  /**
   * Closing a year is the single most consequential write in the product: it
   * fixes the past and seeds the next year's opening balances. `company.manage`
   * on top of `accounts.manage` — this is the owner's decision, not the
   * bookkeeper's.
   */
  @Post('financial-years/close')
  @RequirePermissions(PERMISSIONS.ACCOUNTS_MANAGE, PERMISSIONS.COMPANY_MANAGE)
  @ApiOperation({ summary: 'ACC-10 — lock a year and carry its balances into the next' })
  async close(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(closeFinancialYearSchema)) dto: CloseFinancialYearDto,
  ) {
    return this.financials.closeFinancialYear(companyId, user.sub, dto);
  }
}
