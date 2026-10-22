import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { Env } from '../../config/env';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { Notification } from './entities/notification.entity';
import { NotificationSetting } from './entities/notification-setting.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NOTIFICATION_PROVIDER, providerFromEnv } from './providers/provider.factory';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, NotificationSetting]), AuditModule, AuthModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    {
      provide: NOTIFICATION_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        providerFromEnv({
          NOTIFY_PROVIDER: config.get('NOTIFY_PROVIDER', { infer: true }),
          MSG91_AUTH_KEY: config.get('MSG91_AUTH_KEY', { infer: true }),
          MSG91_TEMPLATE_DISPATCH_SENT: config.get('MSG91_TEMPLATE_DISPATCH_SENT', { infer: true }),
          MSG91_TEMPLATE_PAYMENT_RECEIVED: config.get('MSG91_TEMPLATE_PAYMENT_RECEIVED', { infer: true }),
          MSG91_TEMPLATE_ADVANCE_ALERT: config.get('MSG91_TEMPLATE_ADVANCE_ALERT', { infer: true }),
          TWILIO_ACCOUNT_SID: config.get('TWILIO_ACCOUNT_SID', { infer: true }),
          TWILIO_AUTH_TOKEN: config.get('TWILIO_AUTH_TOKEN', { infer: true }),
          TWILIO_FROM: config.get('TWILIO_FROM', { infer: true }),
        }),
    },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
