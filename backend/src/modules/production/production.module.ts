import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { BrickType } from '../inventory/entities/brick-type.entity';
import { Party } from '../parties/entities/party.entity';
import { Site } from '../company/entities/site.entity';
import { StockModule } from '../../stock/stock.module';
import { ProductionBatch } from './entities/production-batch.entity';
import { ProductionEntry } from './entities/production-entry.entity';
import { ProductionSortingOutput } from './entities/production-sorting-output.entity';
import { ProductionController } from './production.controller';
import { ProductionReportsService } from './production-reports.service';
import { ProductionService } from './production.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductionBatch, ProductionEntry, ProductionSortingOutput, Site, Party, BrickType]),
    AuditModule,
    AuthModule,
    StockModule,
  ],
  controllers: [ProductionController],
  providers: [ProductionService, ProductionReportsService],
  exports: [ProductionService],
})
export class ProductionModule {}
