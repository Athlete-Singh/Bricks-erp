import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdempotencyModule } from '../../common/idempotency/idempotency.module';
import { StockModule } from '../../stock/stock.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { Dispatch } from './entities/dispatch.entity';
import { DispatchLine } from './entities/dispatch-line.entity';
import { ChallanPdfService } from './pdf/challan-pdf.service';
import { DispatchController } from './dispatch.controller';
import { DispatchService } from './dispatch.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Dispatch, DispatchLine]),
    AuditModule,
    AuthModule,
    StockModule,
    IdempotencyModule,
  ],
  controllers: [DispatchController],
  providers: [DispatchService, ChallanPdfService],
  exports: [DispatchService],
})
export class DispatchModule {}
