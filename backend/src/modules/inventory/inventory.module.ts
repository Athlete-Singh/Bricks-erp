import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Unit } from './entities/unit.entity';
import { BrickType } from './entities/brick-type.entity';
import { Warehouse } from './entities/warehouse.entity';
import { Item } from './entities/item.entity';
import { InventoryMastersController } from './inventory-masters.controller';
import { InventoryMastersService } from './inventory-masters.service';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Unit, BrickType, Warehouse, Item]), AuditModule, AuthModule],
  controllers: [InventoryMastersController],
  providers: [InventoryMastersService],
  exports: [InventoryMastersService],
})
export class InventoryModule {}
