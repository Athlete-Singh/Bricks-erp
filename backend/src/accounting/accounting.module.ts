import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountingController } from './accounting.controller';
import { ChartOfAccountsService } from './chart-of-accounts.service';
import { LedgerGroup } from './entities/ledger-group.entity';
import { Ledger } from './entities/ledger.entity';
import { VoucherType } from './entities/voucher-type.entity';
import { LedgerService } from './ledger.service';

/**
 * Imports `JwtModule` directly rather than `AuthModule`: the company module
 * seeds a chart of accounts when a company is created, so a dependency back on
 * auth would cycle through company → accounting → auth → company.
 */
@Module({
  imports: [TypeOrmModule.forFeature([LedgerGroup, Ledger, VoucherType]), JwtModule.register({})],
  controllers: [AccountingController],
  providers: [ChartOfAccountsService, LedgerService],
  exports: [ChartOfAccountsService, LedgerService],
})
export class AccountingModule {}
