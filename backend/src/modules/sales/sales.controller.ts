import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Patch,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  createCreditNoteSchema,
  createCustomerReceiptSchema,
  createDebitNoteSchema,
  createQuotationSchema,
  createSalesInvoiceSchema,
  createSalesOrderSchema,
  customerReceiptQuerySchema,
  quotationQuerySchema,
  quotationStatusChangeSchema,
  receivablesAgeingQuerySchema,
  salesInvoiceQuerySchema,
  salesNoteQuerySchema,
  salesOrderQuerySchema,
  salesOrderStatusChangeSchema,
  PERMISSIONS,
  type CreateCreditNoteDto,
  type CreateCustomerReceiptDto,
  type CreateDebitNoteDto,
  type CreateQuotationDto,
  type CreateSalesInvoiceDto,
  type CreateSalesOrderDto,
  type CustomerReceiptQueryDto,
  type QuotationQueryDto,
  type QuotationStatusChangeDto,
  type ReceivablesAgeingQueryDto,
  type SalesInvoiceQueryDto,
  type SalesNoteQueryDto,
  type SalesOrderQueryDto,
  type SalesOrderStatusChangeDto,
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
import { SalesService } from './sales.service';
import { InvoicePdfService } from './pdf/invoice-pdf.service';

@ApiTags('Sales')
@ApiBearerAuth()
@Controller('sales')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class SalesController {
  constructor(
    private readonly sales: SalesService,
    private readonly invoicePdf: InvoicePdfService,
  ) {}

  // ── SAL-01 quotations ──────────────────────────────────────────────────────

  @Post('quotations')
  @RequirePermissions(PERMISSIONS.SALES_MANAGE)
  @ApiOperation({ summary: 'SAL-01 — raise a quotation' })
  async createQuote(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createQuotationSchema)) dto: CreateQuotationDto,
    @IdempotencyKey() key: string | null,
  ) {
    return this.sales.createQuotation(companyId, user.sub, dto, key);
  }

  @Get('quotations')
  @RequirePermissions(PERMISSIONS.SALES_VIEW)
  async listQuotes(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(quotationQuerySchema)) query: QuotationQueryDto,
  ) {
    return this.sales.listQuotations(companyId, query);
  }

  @Get('quotations/:id')
  @RequirePermissions(PERMISSIONS.SALES_VIEW)
  async getQuote(@CurrentCompany() companyId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.sales.getQuotation(companyId, id);
  }

  @Patch('quotations/:id/status')
  @RequirePermissions(PERMISSIONS.SALES_MANAGE)
  async changeQuoteStatus(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(quotationStatusChangeSchema)) dto: QuotationStatusChangeDto,
  ) {
    return this.sales.changeQuotationStatus(companyId, user.sub, id, dto);
  }

  // ── SAL-02 sales orders ────────────────────────────────────────────────────

  @Post('orders')
  @RequirePermissions(PERMISSIONS.SALES_MANAGE)
  @ApiOperation({ summary: 'SAL-02 — confirm a sales order' })
  async createOrder(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createSalesOrderSchema)) dto: CreateSalesOrderDto,
    @IdempotencyKey() key: string | null,
  ) {
    return this.sales.createSalesOrder(companyId, user.sub, dto, key);
  }

  @Get('orders')
  @RequirePermissions(PERMISSIONS.SALES_VIEW)
  async listOrders(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(salesOrderQuerySchema)) query: SalesOrderQueryDto,
  ) {
    return this.sales.listSalesOrders(companyId, query);
  }

  @Get('orders/:id')
  @RequirePermissions(PERMISSIONS.SALES_VIEW)
  async getOrder(@CurrentCompany() companyId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.sales.getSalesOrder(companyId, id);
  }

  @Patch('orders/:id/status')
  @RequirePermissions(PERMISSIONS.SALES_MANAGE)
  async changeOrderStatus(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(salesOrderStatusChangeSchema)) dto: SalesOrderStatusChangeDto,
  ) {
    return this.sales.changeSalesOrderStatus(companyId, user.sub, id, dto);
  }

  // ── SAL-03 invoices ────────────────────────────────────────────────────────

  @Post('invoices')
  @RequirePermissions(PERMISSIONS.SALES_MANAGE)
  @ApiOperation({ summary: 'SAL-03 — issue a GST tax invoice (stock OUT + journal in one tx)' })
  async createInvoice(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createSalesInvoiceSchema)) dto: CreateSalesInvoiceDto,
    @IdempotencyKey() key: string | null,
  ) {
    return this.sales.createSalesInvoice(companyId, user.sub, dto, key);
  }

  @Get('invoices')
  @RequirePermissions(PERMISSIONS.SALES_VIEW)
  async listInvoices(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(salesInvoiceQuerySchema)) query: SalesInvoiceQueryDto,
  ) {
    return this.sales.listSalesInvoices(companyId, query);
  }

  @Get('invoices/:id')
  @RequirePermissions(PERMISSIONS.SALES_VIEW)
  async getInvoice(@CurrentCompany() companyId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.sales.getSalesInvoice(companyId, id);
  }

  /** SAL-04 — the A4 GST-compliant PDF. */
  @Get('invoices/:id/pdf')
  @RequirePermissions(PERMISSIONS.SALES_VIEW)
  @Header('Content-Type', 'application/pdf')
  async invoicePdfRoute(
    @CurrentCompany() companyId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Res() res: Response,
  ) {
    const buf = await this.invoicePdf.render(companyId, id);
    const inv = await this.sales.getSalesInvoice(companyId, id);
    res.setHeader('Content-Disposition', `inline; filename="${inv.invoice.invoiceNo}.pdf"`);
    res.setHeader('Content-Length', String(buf.length));
    res.end(buf);
  }

  // ── SAL-05 customer receipts ───────────────────────────────────────────────

  /**
   * Receiving money affects the books, so it needs `accounts.manage` on top of
   * `sales.manage` — the same split the purchases module uses for payments.
   */
  @Post('receipts')
  @RequirePermissions(PERMISSIONS.SALES_MANAGE, PERMISSIONS.ACCOUNTS_MANAGE)
  @ApiOperation({ summary: 'SAL-05 — receive from a customer, allocated invoice by invoice' })
  async createReceipt(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createCustomerReceiptSchema)) dto: CreateCustomerReceiptDto,
    @IdempotencyKey() key: string | null,
  ) {
    return this.sales.createCustomerReceipt(companyId, user.sub, dto, key);
  }

  @Get('receipts')
  @RequirePermissions(PERMISSIONS.SALES_VIEW)
  async listReceipts(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(customerReceiptQuerySchema)) query: CustomerReceiptQueryDto,
  ) {
    return this.sales.listCustomerReceipts(companyId, query);
  }

  // ── SAL-06 credit / debit notes ────────────────────────────────────────────

  @Post('credit-notes')
  @RequirePermissions(PERMISSIONS.SALES_MANAGE)
  @ApiOperation({ summary: 'SAL-06 — issue a credit note (optionally re-stocks returned goods)' })
  async createCreditNote(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createCreditNoteSchema)) dto: CreateCreditNoteDto,
    @IdempotencyKey() key: string | null,
  ) {
    return this.sales.createCreditNote(companyId, user.sub, dto, key);
  }

  @Get('credit-notes')
  @RequirePermissions(PERMISSIONS.SALES_VIEW)
  async listCreditNotes(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(salesNoteQuerySchema)) query: SalesNoteQueryDto,
  ) {
    return this.sales.listCreditNotes(companyId, query);
  }

  @Post('debit-notes')
  @RequirePermissions(PERMISSIONS.SALES_MANAGE)
  @ApiOperation({ summary: 'SAL-06 — issue a debit note' })
  async createDebitNote(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createDebitNoteSchema)) dto: CreateDebitNoteDto,
    @IdempotencyKey() key: string | null,
  ) {
    return this.sales.createDebitNote(companyId, user.sub, dto, key);
  }

  @Get('debit-notes')
  @RequirePermissions(PERMISSIONS.SALES_VIEW)
  async listDebitNotes(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(salesNoteQuerySchema)) query: SalesNoteQueryDto,
  ) {
    return this.sales.listDebitNotes(companyId, query);
  }

  // ── SAL-07 receivables ageing ──────────────────────────────────────────────

  @Get('receivables-ageing')
  @RequirePermissions(PERMISSIONS.SALES_VIEW)
  @ApiOperation({ summary: 'SAL-07 — what is owed to us, bucketed by how long it has been due' })
  async receivablesAgeing(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(receivablesAgeingQuerySchema)) query: ReceivablesAgeingQueryDto,
  ) {
    return this.sales.receivablesAgeing(companyId, query);
  }
}
