import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  createGrnSchema,
  createPurchaseBillSchema,
  createPurchaseOrderSchema,
  createPurchaseReturnSchema,
  createSupplierPaymentSchema,
  grnQuerySchema,
  payablesAgeingQuerySchema,
  purchaseBillQuerySchema,
  purchaseOrderQuerySchema,
  PERMISSIONS,
  type CreateGrnDto,
  type CreatePurchaseBillDto,
  type CreatePurchaseOrderDto,
  type CreatePurchaseReturnDto,
  type CreateSupplierPaymentDto,
  type GrnQueryDto,
  type PayablesAgeingQueryDto,
  type PurchaseBillQueryDto,
  type PurchaseOrderQueryDto,
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
import { PurchasesService } from './purchases.service';

@ApiTags('Purchases')
@ApiBearerAuth()
@Controller('purchases')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class PurchasesController {
  constructor(private readonly purchases: PurchasesService) {}

  // ── PUR-01 purchase orders ─────────────────────────────────────────────────

  @Post('orders')
  @RequirePermissions(PERMISSIONS.PURCHASES_MANAGE)
  @ApiOperation({ summary: 'PUR-01 — raise a purchase order' })
  async createOrder(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createPurchaseOrderSchema)) dto: CreatePurchaseOrderDto,
    @IdempotencyKey() key: string | null,
  ) {
    return this.purchases.createPurchaseOrder(companyId, user.sub, dto, key);
  }

  @Get('orders')
  @RequirePermissions(PERMISSIONS.PURCHASES_VIEW)
  async listOrders(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(purchaseOrderQuerySchema)) query: PurchaseOrderQueryDto,
  ) {
    return this.purchases.listPurchaseOrders(companyId, query);
  }

  @Get('orders/:id')
  @RequirePermissions(PERMISSIONS.PURCHASES_VIEW)
  async getOrder(@CurrentCompany() companyId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.purchases.getPurchaseOrder(companyId, id);
  }

  // ── PUR-02 goods receipts ──────────────────────────────────────────────────

  @Post('goods-receipts')
  @RequirePermissions(PERMISSIONS.PURCHASES_MANAGE)
  @ApiOperation({ summary: 'PUR-02 — receive goods; quantity only, value comes with the bill' })
  async createGrn(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createGrnSchema)) dto: CreateGrnDto,
    @IdempotencyKey() key: string | null,
  ) {
    return this.purchases.createGoodsReceipt(companyId, user.sub, dto, key);
  }

  @Get('goods-receipts')
  @RequirePermissions(PERMISSIONS.PURCHASES_VIEW)
  async listGrns(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(grnQuerySchema)) query: GrnQueryDto,
  ) {
    return this.purchases.listGoodsReceipts(companyId, query);
  }

  @Get('goods-receipts/:id')
  @RequirePermissions(PERMISSIONS.PURCHASES_VIEW)
  async getGrn(@CurrentCompany() companyId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.purchases.getGoodsReceipt(companyId, id);
  }

  // ── PUR-03 / GST-03 bills ──────────────────────────────────────────────────

  @Post('bills')
  @RequirePermissions(PERMISSIONS.PURCHASES_MANAGE)
  @ApiOperation({ summary: 'PUR-03 / GST-03 — supplier bill with input GST' })
  async createBill(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createPurchaseBillSchema)) dto: CreatePurchaseBillDto,
    @IdempotencyKey() key: string | null,
  ) {
    return this.purchases.createPurchaseBill(companyId, user.sub, dto, key);
  }

  @Get('bills')
  @RequirePermissions(PERMISSIONS.PURCHASES_VIEW)
  async listBills(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(purchaseBillQuerySchema)) query: PurchaseBillQueryDto,
  ) {
    return this.purchases.listPurchaseBills(companyId, query);
  }

  @Get('bills/:id')
  @RequirePermissions(PERMISSIONS.PURCHASES_VIEW)
  async getBill(@CurrentCompany() companyId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.purchases.getPurchaseBill(companyId, id);
  }

  // ── PUR-04 payments ────────────────────────────────────────────────────────

  /**
   * Paying money out is an accounting act, so it needs `accounts.manage` as
   * well as `purchases.manage`. A store keeper may receive goods and enter the
   * bill; releasing the cash is somebody else's signature.
   */
  @Post('payments')
  @RequirePermissions(PERMISSIONS.PURCHASES_MANAGE, PERMISSIONS.ACCOUNTS_MANAGE)
  @ApiOperation({ summary: 'PUR-04 — pay a supplier, allocated bill by bill' })
  async createPayment(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createSupplierPaymentSchema)) dto: CreateSupplierPaymentDto,
    @IdempotencyKey() key: string | null,
  ) {
    return this.purchases.createSupplierPayment(companyId, user.sub, dto, key);
  }

  // ── PUR-05 returns ─────────────────────────────────────────────────────────

  @Post('returns')
  @RequirePermissions(PERMISSIONS.PURCHASES_MANAGE)
  @ApiOperation({ summary: 'PUR-05 — return goods to a supplier as a debit note' })
  async createReturn(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createPurchaseReturnSchema)) dto: CreatePurchaseReturnDto,
    @IdempotencyKey() key: string | null,
  ) {
    return this.purchases.createPurchaseReturn(companyId, user.sub, dto, key);
  }

  // ── PUR-06 payables ageing ─────────────────────────────────────────────────

  @Get('payables-ageing')
  @RequirePermissions(PERMISSIONS.PURCHASES_VIEW)
  @ApiOperation({ summary: 'PUR-06 — what is owed, bucketed by how long it has been due' })
  async payablesAgeing(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(payablesAgeingQuerySchema)) query: PayablesAgeingQueryDto,
  ) {
    return this.purchases.payablesAgeing(companyId, query);
  }
}
