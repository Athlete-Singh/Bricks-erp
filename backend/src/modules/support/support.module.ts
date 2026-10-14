import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { User } from '../auth/entities/user.entity';
import { Company } from '../company/entities/company.entity';
import { SupportSession } from './entities/support-session.entity';
import { SupportSessionController } from './support.controller';
import { SupportSessionInterceptor } from './support-session.interceptor';
import { SupportSessionService } from './support-session.service';

@Module({
  imports: [TypeOrmModule.forFeature([SupportSession, Company, User]), AuthModule, AuditModule],
  controllers: [SupportSessionController],
  providers: [
    SupportSessionService,
    // Runs on every authenticated request after JwtAuthGuard; validates the
    // token's supportSessionId claim (if any) is still open and unexpired.
    // Must be an interceptor rather than a guard because guards cannot read
    // `req.user` — guards run before controller-scoped guards like
    // JwtAuthGuard that populate it.
    { provide: APP_INTERCEPTOR, useClass: SupportSessionInterceptor },
  ],
  exports: [SupportSessionService],
})
export class SupportModule {}
