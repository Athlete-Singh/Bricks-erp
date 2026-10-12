import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountingModule } from '../../accounting/accounting.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { ClosingStockRate } from './entities/closing-stock-rate.entity';
import { FinancialsController } from './financials.controller';
import { FinancialsService } from './financials.service';

@Module({
  imports: [TypeOrmModule.forFeature([ClosingStockRate]), AuditModule, AuthModule, AccountingModule],
  controllers: [FinancialsController],
  providers: [FinancialsService],
  exports: [FinancialsService],
})
export class FinancialsModule {}
