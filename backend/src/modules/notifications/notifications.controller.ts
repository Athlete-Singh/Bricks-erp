import { Body, Controller, Get, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  notificationQuerySchema,
  PERMISSIONS,
  updateNotificationSettingsSchema,
  type NotificationQueryDto,
  type UpdateNotificationSettingsDto,
} from '@brics/shared';
import { CurrentCompany, CurrentUser, RequirePermissions } from '../../common/decorators/auth.decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('settings')
  @RequirePermissions(PERMISSIONS.COMPANY_VIEW)
  @ApiOperation({ summary: 'NTF-01 — which alerts are on, and which gateway the server uses' })
  async settings(@CurrentCompany() companyId: string) {
    return this.notifications.getSettings(companyId);
  }

  @Put('settings')
  @RequirePermissions(PERMISSIONS.COMPANY_MANAGE)
  @ApiOperation({ summary: 'NTF-01 — turn alerts on or off; set the owner alert number' })
  async updateSettings(
    @CurrentCompany() companyId: string,
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(updateNotificationSettingsSchema)) dto: UpdateNotificationSettingsDto,
  ) {
    return this.notifications.updateSettings(companyId, userId, dto);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.COMPANY_VIEW)
  @ApiOperation({ summary: 'NTF-01 — alerts written for this company, newest first' })
  async list(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(notificationQuerySchema)) query: NotificationQueryDto,
  ) {
    return this.notifications.list(companyId, query);
  }

  /** Normally automatic after each event; this is the "send now" and a cron's hook. */
  @Post('send-pending')
  @RequirePermissions(PERMISSIONS.COMPANY_MANAGE)
  @ApiOperation({ summary: 'NTF-01 — send queued alerts that are due' })
  async sendPending(@CurrentCompany() companyId: string) {
    return this.notifications.sendPending(companyId);
  }
}
