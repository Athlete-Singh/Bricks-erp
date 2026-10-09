import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../modules/audit/audit.module';
import { AuthModule } from '../modules/auth/auth.module';
import { Warehouse } from '../modules/inventory/entities/warehouse.entity';
import { Item } from '../modules/inventory/entities/item.entity';
import { BrickType } from '../modules/inventory/entities/brick-type.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';

@Module({
  imports: [TypeOrmModule.forFeature([StockMovement, Warehouse, Item, BrickType]), AuditModule, AuthModule],
  controllers: [StockController],
  // Exported because P5 production, P7 purchases and P9 dispatch all post
  // through it — nothing else may write `stock_movements`.
  providers: [StockService],
  exports: [StockService],
})
export class StockModule {}
