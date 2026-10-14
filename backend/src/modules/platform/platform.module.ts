import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountingModule } from '../../accounting/accounting.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { User } from '../auth/entities/user.entity';
import { Company } from '../company/entities/company.entity';
import { FinancialYear } from '../company/entities/financial-year.entity';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';

@Module({
  imports: [TypeOrmModule.forFeature([Company, User, FinancialYear]), AuthModule, AuditModule, AccountingModule],
  controllers: [PlatformController],
  providers: [PlatformService],
  exports: [PlatformService],
})
export class PlatformModule {}
