import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  createLedgerSchema,
  setOpeningBalancesSchema,
  updateLedgerSchema,
  PERMISSIONS,
  type CreateLedgerDto,
  type SetOpeningBalancesDto,
  type UpdateLedgerDto,
} from '@brics/shared';
import { CurrentCompany, CurrentUser, RequirePermissions } from '../common/decorators/auth.decorators';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ChartOfAccountsService } from './chart-of-accounts.service';
import { LedgerService } from './ledger.service';

/** Chart of accounts (ACC-01) and opening balances (ACC-04), all JWT-scoped. */
@ApiTags('Accounting')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@ApiBearerAuth()
export class AccountingController {
  constructor(
    private chart: ChartOfAccountsService,
    private ledgers: LedgerService,
  ) {}

  @Get('ledger-groups')
  @RequirePermissions(PERMISSIONS.ACCOUNTS_VIEW)
  @ApiOperation({ summary: 'The chart of accounts tree for the current company' })
  async findGroups(@CurrentCompany() companyId: string) {
    return this.chart.findGroups(companyId);
  }

  @Get('ledgers')
  @RequirePermissions(PERMISSIONS.ACCOUNTS_VIEW)
  @ApiOperation({ summary: 'All ledgers of the current company' })
  async findLedgers(@CurrentCompany() companyId: string) {
    return this.chart.findLedgers(companyId);
  }

  @Post('ledgers')
  @RequirePermissions(PERMISSIONS.ACCOUNTS_MANAGE)
  @ApiOperation({ summary: 'Create a ledger' })
  async createLedger(
    @CurrentCompany() companyId: string,
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(createLedgerSchema)) dto: CreateLedgerDto,
  ) {
    return this.ledgers.create(companyId, userId, dto);
  }

  @Patch('ledgers/:id')
  @RequirePermissions(PERMISSIONS.ACCOUNTS_MANAGE)
  @ApiOperation({ summary: 'Rename a ledger, move it between groups, or deactivate it' })
  async updateLedger(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentCompany() companyId: string,
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(updateLedgerSchema)) dto: UpdateLedgerDto,
  ) {
    return this.ledgers.update(companyId, userId, id, dto);
  }

  @Get('voucher-types')
  @RequirePermissions(PERMISSIONS.ACCOUNTS_VIEW)
  @ApiOperation({ summary: 'The eight voucher types of the current company' })
  async findVoucherTypes(@CurrentCompany() companyId: string) {
    return this.chart.findVoucherTypes(companyId);
  }

  @Get('opening-balances')
  @RequirePermissions(PERMISSIONS.ACCOUNTS_VIEW)
  @ApiOperation({ summary: 'Opening debit vs credit totals, and the difference still to resolve' })
  async openingSummary(@CurrentCompany() companyId: string) {
    return this.ledgers.openingBalanceSummary(companyId);
  }

  @Post('opening-balances')
  @RequirePermissions(PERMISSIONS.ACCOUNTS_MANAGE)
  @ApiOperation({ summary: 'Set opening balances for one or more ledgers (ACC-04)' })
  async setOpeningBalances(
    @CurrentCompany() companyId: string,
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(setOpeningBalancesSchema)) dto: SetOpeningBalancesDto,
  ) {
    return this.ledgers.setOpeningBalances(companyId, userId, dto);
  }
}
