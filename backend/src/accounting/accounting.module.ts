import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountingController } from './accounting.controller';
import { ChartOfAccountsService } from './chart-of-accounts.service';
import { LedgerGroup } from './entities/ledger-group.entity';
import { Ledger } from './entities/ledger.entity';
import { VoucherType } from './entities/voucher-type.entity';
import { LedgerService } from './ledger.service';
import { PostingService } from './posting.service';
import { Voucher } from './entities/voucher.entity';
import { VoucherLine } from './entities/voucher-line.entity';
import { VoucherSequence } from './entities/voucher-sequence.entity';
import { VoucherController } from './voucher.controller';
import { VoucherService } from './voucher.service';
import { FinancialYear } from '../modules/company/entities/financial-year.entity';

/**
 * Imports `JwtModule` directly rather than `AuthModule`: the company module
 * seeds a chart of accounts when a company is created, so a dependency back on
 * auth would cycle through company → accounting → auth → company.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([LedgerGroup, Ledger, VoucherType, Voucher, VoucherLine, VoucherSequence, FinancialYear]),
    JwtModule.register({}),
  ],
  controllers: [AccountingController, VoucherController],
  providers: [ChartOfAccountsService, LedgerService, PostingService, VoucherService],
  // PostingService is exported because every later module posts through it.
  exports: [ChartOfAccountsService, LedgerService, PostingService],
})
export class AccountingModule {}
