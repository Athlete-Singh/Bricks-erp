import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { onboardingImportSchema, PERMISSIONS, type OnboardingImportDto } from '@brics/shared';
import { CurrentCompany, CurrentUser, RequirePermissions } from '../../common/decorators/auth.decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { OnboardingService } from './onboarding.service';

/**
 * ONB-01 — the go-live import.
 *
 * Gated on `accounts.manage`: the same import that creates a party list also
 * sets what the books open at and what the yard starts with. That is the
 * owner's or the accountant's signature, not a store keeper's.
 */
@ApiTags('Onboarding')
@ApiBearerAuth()
@Controller('onboarding')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Get('reference')
  @RequirePermissions(PERMISSIONS.ACCOUNTS_MANAGE)
  @ApiOperation({ summary: 'The names an import can match against — units, warehouses, ledgers, items, grades, HSN' })
  async reference(@CurrentCompany() companyId: string) {
    return this.onboarding.referenceData(companyId);
  }

  @Post('preview')
  @RequirePermissions(PERMISSIONS.ACCOUNTS_MANAGE)
  @ApiOperation({ summary: 'What the file would do. Writes nothing.' })
  async preview(
    @CurrentCompany() companyId: string,
    @Body(new ZodValidationPipe(onboardingImportSchema)) dto: OnboardingImportDto,
  ) {
    return this.onboarding.preview(companyId, dto);
  }

  @Post('commit')
  @RequirePermissions(PERMISSIONS.ACCOUNTS_MANAGE)
  @ApiOperation({ summary: 'Import the file. All rows or none.' })
  async commit(
    @CurrentCompany() companyId: string,
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(onboardingImportSchema)) dto: OnboardingImportDto,
  ) {
    return this.onboarding.commit(companyId, userId, dto);
  }
}
