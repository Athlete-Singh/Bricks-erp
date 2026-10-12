import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Driver } from './entities/driver.entity';
import { Vehicle } from './entities/vehicle.entity';
import { VehicleTrip } from './entities/vehicle-trip.entity';
import { VehicleExpense } from './entities/vehicle-expense.entity';
import { TransportMastersService } from './transport-masters.service';
import { TransportMastersController } from './transport-masters.controller';
import { TransportOpsService } from './transport-ops.service';
import { TransportOpsController } from './transport-ops.controller';
import { AccountingModule } from '../../accounting/accounting.module';
import { IdempotencyModule } from '../../common/idempotency/idempotency.module';
import { StockModule } from '../../stock/stock.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Driver, Vehicle, VehicleTrip, VehicleExpense]),
    AuditModule,
    AuthModule,
    StockModule,
    AccountingModule,
    IdempotencyModule,
  ],
  controllers: [TransportMastersController, TransportOpsController],
  providers: [TransportMastersService, TransportOpsService],
  exports: [TransportMastersService, TransportOpsService],
})
export class TransportModule {}
