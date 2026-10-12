import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountingModule } from '../../accounting/accounting.module';
import { IdempotencyModule } from '../../common/idempotency/idempotency.module';
import { StockModule } from '../../stock/stock.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { GoodsReceipt } from './entities/goods-receipt.entity';
import { GoodsReceiptLine } from './entities/goods-receipt-line.entity';
import { PurchaseBill } from './entities/purchase-bill.entity';
import { PurchaseBillLine } from './entities/purchase-bill-line.entity';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PurchaseOrderLine } from './entities/purchase-order-line.entity';
import { PurchaseReturn } from './entities/purchase-return.entity';
import { PurchaseReturnLine } from './entities/purchase-return-line.entity';
import { SupplierPayment } from './entities/supplier-payment.entity';
import { SupplierPaymentAllocation } from './entities/supplier-payment-allocation.entity';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PurchaseOrder,
      PurchaseOrderLine,
      GoodsReceipt,
      GoodsReceiptLine,
      PurchaseBill,
      PurchaseBillLine,
      SupplierPayment,
      SupplierPaymentAllocation,
      PurchaseReturn,
      PurchaseReturnLine,
    ]),
    AuditModule,
    AuthModule,
    StockModule,
    AccountingModule,
    IdempotencyModule,
  ],
  controllers: [PurchasesController],
  providers: [PurchasesService],
  exports: [PurchasesService],
})
export class PurchasesModule {}
