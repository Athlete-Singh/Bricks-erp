import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { createSupportSessionSchema, PERMISSIONS, type CreateSupportSessionDto } from '@brics/shared';
import { CurrentUser, RequirePermissions } from '../../common/decorators/auth.decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuthService } from '../auth/auth.service';
import { SupportSessionService } from './support-session.service';

/**
 * S2.1 — opening and closing a tenant window. Business endpoints are not
 * reached here — a platform admin acquires a tenant's permissions via
 * `/auth/support-switch/:tenantId`, which hands back a JWT whose claims
 * stand in for an owner session for the next two hours.
 */
@ApiTags('Platform support sessions')
@ApiBearerAuth()
@Controller('platform/support-sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SupportSessionController {
  constructor(
    private readonly sessions: SupportSessionService,
    private readonly auth: AuthService,
  ) {}

  @Post()
  @RequirePermissions(PERMISSIONS.PLATFORM_SUPPORT_REQUEST)
  @ApiOperation({
    summary:
      'Open a support session against one tenant — reason required, two hours. Returns the session and an auth bundle the client switches to.',
  })
  async open(
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(createSupportSessionSchema)) dto: CreateSupportSessionDto,
  ) {
    const session = await this.sessions.open(userId, dto.tenantId, dto.reason);
    const auth = await this.auth.issueSupportTokens(userId, session.companyId, session.id, session.expiresAt);
    return { session: await this.sessions.toDto(session), auth };
  }

  @Post(':id/close')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.PLATFORM_SUPPORT_REQUEST)
  @ApiOperation({ summary: 'Close a support session early' })
  async close(@CurrentUser('sub') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    const session = await this.sessions.close(id, userId);
    return this.sessions.toDto(session);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.PLATFORM_SUPPORT_REQUEST)
  @ApiOperation({ summary: "The signed-in admin's own session history (filterable by tenant)" })
  async mine(@CurrentUser('sub') userId: string, @Query('tenantId') tenantId?: string) {
    const sessions = await this.sessions.listForUser(userId, tenantId);
    return Promise.all(sessions.map((s) => this.sessions.toDto(s)));
  }

  @Get('for-tenant/:tenantId')
  @RequirePermissions(PERMISSIONS.PLATFORM_TENANTS_VIEW)
  @ApiOperation({ summary: "All platform admins' session history for one tenant" })
  async forTenant(@Param('tenantId', ParseUUIDPipe) tenantId: string) {
    const sessions = await this.sessions.listForTenant(tenantId);
    return Promise.all(sessions.map((s) => this.sessions.toDto(s)));
  }
}
