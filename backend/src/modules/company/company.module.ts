import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import { Company } from './entities/company.entity';
import { FinancialYear } from './entities/financial-year.entity';
import { Site } from './entities/site.entity';
import { FinancialYearController } from './financial-year.controller';
import { SiteController } from './site.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Company, Site, FinancialYear]), AuthModule, AuditModule],
  controllers: [CompanyController, SiteController, FinancialYearController],
  providers: [CompanyService],
  exports: [CompanyService],
})
export class CompanyModule {}
