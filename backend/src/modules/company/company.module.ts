import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import { Company } from './entities/company.entity';
import { FinancialYear } from './entities/financial-year.entity';
import { Site } from './entities/site.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Company, Site, FinancialYear]), AuthModule],
  controllers: [CompanyController],
  providers: [CompanyService],
  exports: [CompanyService],
})
export class CompanyModule {}
