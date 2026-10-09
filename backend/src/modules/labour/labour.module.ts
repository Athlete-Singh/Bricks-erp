import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WageRate } from './entities/wage-rate.entity';
import { WageRatesService } from './wage-rates.service';
import { WageRatesController } from './wage-rates.controller';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([WageRate]), AuditModule, AuthModule],
  controllers: [WageRatesController],
  providers: [WageRatesService],
  exports: [WageRatesService],
})
export class LabourModule {}
