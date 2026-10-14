import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  createTenantSchema,
  PERMISSIONS,
  suspendTenantSchema,
  type CreateTenantDto,
  type SuspendTenantDto,
} from '@brics/shared';
import { CurrentUser, RequirePermissions } from '../../common/decorators/auth.decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { PlatformService } from './platform.service';

/**
 * S1.1 — the platform admin's own surface. No `TenantGuard`: these are
 * cross-tenant endpoints, meant for the vendor, not for a kiln. Every route
 * requires a `platform.*` permission, which only `platform_admin` holds.
 */
@ApiTags('Platform')
@ApiBearerAuth()
@Controller('platform/tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlatformController {
  constructor(private readonly platform: PlatformService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.PLATFORM_TENANTS_VIEW)
  @ApiOperation({ summary: 'List tenants — metadata only (PLT-04): counts and dates, never money' })
  async list() {
    return this.platform.listTenants();
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.PLATFORM_TENANTS_VIEW)
  @ApiOperation({ summary: 'One tenant — metadata only' })
  async detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.platform.getTenant(id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.PLATFORM_TENANTS_MANAGE)
  @ApiOperation({ summary: 'Onboard a tenant — company + first FY + owner, in one transaction (PLT-05)' })
  async create(
    @CurrentUser('sub') actorId: string,
    @Body(new ZodValidationPipe(createTenantSchema)) dto: CreateTenantDto,
  ) {
    const { company, owner, financialYear } = await this.platform.createTenant(actorId, dto);
    return {
      tenant: { id: company.id, name: company.name, status: company.status },
      owner: { id: owner.id, mobile: owner.mobile, email: owner.email, name: owner.name },
      financialYear: { id: financialYear.id, name: financialYear.name },
    };
  }

  @Post(':id/suspend')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.PLATFORM_TENANTS_MANAGE)
  @ApiOperation({ summary: 'Suspend a tenant — sign-in refused with a named-contact message (PLT-06)' })
  async suspend(
    @CurrentUser('sub') actorId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(suspendTenantSchema)) dto: SuspendTenantDto,
  ) {
    return this.platform.suspendTenant(actorId, id, dto.reason);
  }

  @Post(':id/reactivate')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.PLATFORM_TENANTS_MANAGE)
  @ApiOperation({ summary: 'Reactivate a tenant' })
  async reactivate(@CurrentUser('sub') actorId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.platform.reactivateTenant(actorId, id);
  }
}
