import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  createPlatformInvoiceSchema,
  PERMISSIONS,
  recordPlatformPaymentSchema,
  updateTenantSubscriptionSchema,
  type CreatePlatformInvoiceDto,
  type RecordPlatformPaymentDto,
  type UpdateTenantSubscriptionDto,
} from '@brics/shared';
import { CurrentUser, RequirePermissions } from '../../common/decorators/auth.decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { PlatformBillingService } from './platform-billing.service';

/**
 * Platform billing controller (S4 / PLT-11).
 * Cross-tenant endpoints for managing subscriptions, SaaS invoices, payment recording,
 * and automated trial expiry / overdue suspensions.
 */
@ApiTags('Platform Billing')
@ApiBearerAuth()
@Controller('platform')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlatformBillingController {
  constructor(private readonly billing: PlatformBillingService) {}

  @Get('plans')
  @RequirePermissions(PERMISSIONS.PLATFORM_TENANTS_VIEW)
  @ApiOperation({ summary: 'List platform plans and limits' })
  getPlans() {
    return this.billing.getPlans();
  }

  @Get('tenants/:id/billing')
  @RequirePermissions(PERMISSIONS.PLATFORM_TENANTS_VIEW)
  @ApiOperation({ summary: 'Get tenant subscription profile and platform invoices' })
  getTenantBilling(@Param('id', ParseUUIDPipe) id: string) {
    return this.billing.getTenantBilling(id);
  }

  @Patch('tenants/:id/subscription')
  @RequirePermissions(PERMISSIONS.PLATFORM_TENANTS_MANAGE)
  @ApiOperation({ summary: 'Update tenant subscription plan, cycle, trial, or status' })
  updateTenantSubscription(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') actorId: string,
    @Body(new ZodValidationPipe(updateTenantSubscriptionSchema)) dto: UpdateTenantSubscriptionDto,
  ) {
    return this.billing.updateTenantSubscription(id, actorId, dto);
  }

  @Post('tenants/:id/invoices')
  @RequirePermissions(PERMISSIONS.PLATFORM_TENANTS_MANAGE)
  @ApiOperation({ summary: 'Create platform subscription invoice for a tenant' })
  createInvoice(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') actorId: string,
    @Body(new ZodValidationPipe(createPlatformInvoiceSchema)) dto: CreatePlatformInvoiceDto,
  ) {
    return this.billing.createInvoice(id, actorId, dto);
  }

  @Post('invoices/:id/record-payment')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.PLATFORM_TENANTS_MANAGE)
  @ApiOperation({ summary: 'Record payment for a platform invoice and activate tenant' })
  recordPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') actorId: string,
    @Body(new ZodValidationPipe(recordPlatformPaymentSchema)) dto: RecordPlatformPaymentDto,
  ) {
    return this.billing.recordPayment(id, actorId, dto);
  }

  @Post('billing/check-expiry')
  @HttpCode(200)
  @RequirePermissions(PERMISSIONS.PLATFORM_TENANTS_MANAGE)
  @ApiOperation({ summary: 'Check trial expiry and overdue invoices, applying auto-suspension' })
  checkExpiry(@CurrentUser('sub') actorId: string) {
    return this.billing.checkExpiryAndSuspension(actorId);
  }
}
