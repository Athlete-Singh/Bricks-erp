import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HsnRate } from './entities/hsn-rate.entity';
import { TaxesService } from './taxes.service';
import { TaxesController } from './taxes.controller';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([HsnRate]), AuditModule, AuthModule],
  controllers: [TaxesController],
  providers: [TaxesService],
  exports: [TaxesService],
})
export class TaxesModule {}
