import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountingModule } from '../../accounting/accounting.module';
import { IdempotencyModule } from '../../common/idempotency/idempotency.module';
import { StockModule } from '../../stock/stock.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { CreditNote } from './entities/credit-note.entity';
import { CreditNoteLine } from './entities/credit-note-line.entity';
import { CustomerReceipt } from './entities/customer-receipt.entity';
import { CustomerReceiptAllocation } from './entities/customer-receipt-allocation.entity';
import { DebitNote } from './entities/debit-note.entity';
import { DebitNoteLine } from './entities/debit-note-line.entity';
import { Quotation } from './entities/quotation.entity';
import { QuotationLine } from './entities/quotation-line.entity';
import { SalesCharge } from './entities/sales-charge.entity';
import { SalesInvoice } from './entities/sales-invoice.entity';
import { SalesInvoiceLine } from './entities/sales-invoice-line.entity';
import { SalesOrder } from './entities/sales-order.entity';
import { SalesOrderLine } from './entities/sales-order-line.entity';
import { InvoicePdfService } from './pdf/invoice-pdf.service';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Quotation,
      QuotationLine,
      SalesOrder,
      SalesOrderLine,
      SalesInvoice,
      SalesInvoiceLine,
      SalesCharge,
      CustomerReceipt,
      CustomerReceiptAllocation,
      CreditNote,
      CreditNoteLine,
      DebitNote,
      DebitNoteLine,
    ]),
    AuditModule,
    AuthModule,
    StockModule,
    AccountingModule,
    IdempotencyModule,
  ],
  controllers: [SalesController],
  providers: [SalesService, InvoicePdfService],
  exports: [SalesService],
})
export class SalesModule {}
