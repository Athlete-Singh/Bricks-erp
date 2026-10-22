import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountingModule } from '../../accounting/accounting.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { IdempotencyModule } from '../../common/idempotency/idempotency.module';
import { LabourAdvance } from './entities/labour-advance.entity';
import { LabourAttendance } from './entities/labour-attendance.entity';
import { LabourDeduction } from './entities/labour-deduction.entity';
import { LabourGroup } from './entities/labour-group.entity';
import { LabourWageAccrual } from './entities/labour-wage-accrual.entity';
import { LabourSettlement } from './entities/labour-settlement.entity';
import { WageRate } from './entities/wage-rate.entity';
import { Worker } from './entities/worker.entity';
import { LabourController } from './labour.controller';
import { LabourService } from './labour.service';
import { WageRatesController } from './wage-rates.controller';
import { WageRatesService } from './wage-rates.service';

@Module({
  imports: [
    NotificationsModule,
    TypeOrmModule.forFeature([
      WageRate,
      LabourGroup,
      LabourWageAccrual,
      Worker,
      LabourAttendance,
      LabourAdvance,
      LabourDeduction,
      LabourSettlement,
    ]),
    AccountingModule,
    AuditModule,
    AuthModule,
    IdempotencyModule,
  ],
  controllers: [WageRatesController, LabourController],
  providers: [WageRatesService, LabourService],
  exports: [WageRatesService, LabourService],
})
export class LabourModule {}
