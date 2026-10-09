import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LedgerGroup } from '../../accounting/entities/ledger-group.entity';
import { Ledger } from '../../accounting/entities/ledger.entity';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { Party } from './entities/party.entity';
import { PartyController } from './party.controller';
import { PartyService } from './party.service';
import { FinancialYear } from '../company/entities/financial-year.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Party, LedgerGroup, Ledger, FinancialYear]), AuthModule, AuditModule],
  controllers: [PartyController],
  providers: [PartyService],
  exports: [PartyService],
})
export class PartyModule {}
