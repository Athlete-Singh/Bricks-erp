import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditLog } from './entities/audit-log.entity';

// Imports JwtModule directly rather than AuthModule: AuthModule records login
// events through AuditService, so a dependency back the other way would cycle.
@Module({
  imports: [TypeOrmModule.forFeature([AuditLog]), JwtModule.register({})],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
