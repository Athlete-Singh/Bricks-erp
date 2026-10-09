import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Driver } from './entities/driver.entity';
import { Vehicle } from './entities/vehicle.entity';
import { TransportMastersService } from './transport-masters.service';
import { TransportMastersController } from './transport-masters.controller';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Driver, Vehicle]), AuditModule, AuthModule],
  controllers: [TransportMastersController],
  providers: [TransportMastersService],
  exports: [TransportMastersService],
})
export class TransportModule {}
