import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  cashBookQuerySchema,
  createExpenseSchema,
  expenseQuerySchema,
  PERMISSIONS,
  type CashBookQueryDto,
  type CreateExpenseDto,
  type ExpenseQueryDto,
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
import { ExpensesService } from './expenses.service';

@ApiTags('Expenses')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class ExpensesController {
  constructor(private readonly expenses: ExpensesService) {}

  /** EXP-01 — the categories are the expense ledgers; there is no second list. */
  @Get('expenses/categories')
  @RequirePermissions(PERMISSIONS.ACCOUNTS_VIEW)
  @ApiOperation({ summary: 'EXP-01 — expense categories (the expense ledgers)' })
  async categories(@CurrentCompany() companyId: string) {
    return this.expenses.listCategories(companyId);
  }

  /**
   * Entering an expense moves money out of a cash or bank account, so it needs
   * `accounts.manage` — the same signature paying a supplier bill needs (P7),
   * not merely the permission to read the books.
   */
  @Post('expenses')
  @RequirePermissions(PERMISSIONS.ACCOUNTS_MANAGE)
  @ApiOperation({ summary: 'EXP-02 — record an expense by kiln, paid or on credit' })
  async create(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createExpenseSchema)) dto: CreateExpenseDto,
    @IdempotencyKey() key: string | null,
  ) {
    return this.expenses.createExpense(companyId, user.sub, dto, key);
  }

  @Get('expenses')
  @RequirePermissions(PERMISSIONS.ACCOUNTS_VIEW)
  async list(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(expenseQuerySchema)) query: ExpenseQueryDto,
  ) {
    return this.expenses.listExpenses(companyId, query);
  }

  // ── ACC-07 ─────────────────────────────────────────────────────────────────

  @Get('reports/cash-book')
  @RequirePermissions(PERMISSIONS.ACCOUNTS_VIEW)
  @ApiOperation({ summary: 'ACC-07 — cash book: opening, every movement, closing' })
  async cashBook(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(cashBookQuerySchema)) query: CashBookQueryDto,
  ) {
    return this.expenses.book(companyId, 'cash', query);
  }

  @Get('reports/bank-book')
  @RequirePermissions(PERMISSIONS.ACCOUNTS_VIEW)
  @ApiOperation({ summary: 'ACC-07 — bank book, with the cheque or UPI reference on each row' })
  async bankBook(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(cashBookQuerySchema)) query: CashBookQueryDto,
  ) {
    return this.expenses.book(companyId, 'bank', query);
  }
}
