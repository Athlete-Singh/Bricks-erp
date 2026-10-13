import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { resolve } from 'node:path';
import { type Env, validateEnv } from './config/env';
import { buildTypeOrmOptions } from './config/typeorm.config';
import { AppThrottlerGuard } from './common/guards/app-throttler.guard';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { CompanyModule } from './modules/company/company.module';
import { UserModule } from './modules/user/user.module';
import { AuditModule } from './modules/audit/audit.module';
import { IdempotencyModule } from './common/idempotency/idempotency.module';
import { AccountingModule } from './accounting/accounting.module';
import { StockModule } from './stock/stock.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { PartyModule } from './modules/parties/party.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { TransportModule } from './modules/transport/transport.module';
import { TaxesModule } from './modules/taxes/taxes.module';
import { LabourModule } from './modules/labour/labour.module';
import { ProductionModule } from './modules/production/production.module';
import { SalesModule } from './modules/sales/sales.module';
import { DispatchModule } from './modules/dispatch/dispatch.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { FinancialsModule } from './modules/financials/financials.module';
import { GstModule } from './modules/gst/gst.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [resolve(__dirname, '../.env')],
      validate: validateEnv,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        pinoHttp: {
          level: config.get('LOG_LEVEL', { infer: true }),
          transport:
            config.get('NODE_ENV', { infer: true }) === 'development'
              ? { target: 'pino-pretty', options: { singleLine: true } }
              : undefined,
          redact: ['req.headers.authorization', 'req.headers.cookie'],
        },
      }),
    }),
    /**
     * A ceiling on how fast anyone can hit the API (P13.1). The tight limit
     * that matters is on `/auth/login` — see `@Throttle` there — but a global
     * default means a new endpoint is covered the day it is written rather
     * than the day someone remembers.
     *
     * `AppThrottlerGuard` turns the whole thing off under `test` — see there
     * for why.
     */
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: () => ({ throttlers: [{ name: 'default', ttl: 60_000, limit: 300 }] }),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        buildTypeOrmOptions(
          config.get('DATABASE_URL', { infer: true }),
          config.get('DATABASE_SSL', { infer: true }),
          config.get('DB_POOL_MAX', { infer: true }),
        ),
    }),
    IdempotencyModule,
    HealthModule,
    AuthModule,
    CompanyModule,
    UserModule,
    AuditModule,
    AccountingModule,
    StockModule,
    PurchasesModule,
    PartyModule,
    InventoryModule,
    TransportModule,
    TaxesModule,
    LabourModule,
    ProductionModule,
    SalesModule,
    DispatchModule,
    ExpensesModule,
    FinancialsModule,
    GstModule,
    DashboardModule,
    OnboardingModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: AppThrottlerGuard }],
})
export class AppModule {}
