import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { createSiteSchema, PERMISSIONS, type CreateSiteDto } from '@brics/shared';
import { CurrentCompany, CurrentUser, RequirePermissions } from '../../common/decorators/auth.decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CompanyService } from './company.service';

/**
 * Kilns / sites of the **JWT tenant** (ADM-03). The company id is never taken
 * from the URL — switching company goes through `POST /auth/switch-company`.
 */
@ApiTags('Kilns & Sites')
@Controller('sites')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@ApiBearerAuth()
export class SiteController {
  constructor(private companyService: CompanyService) {}

  /** Bearer-only: the kilns this user may work on — the source for the kiln switcher. */
  @Get()
  @ApiOperation({ summary: 'List kilns/sites the signed-in user can access' })
  async findAll(@CurrentCompany() companyId: string, @CurrentUser('sub') userId: string) {
    return this.companyService.accessibleSites(companyId, userId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.COMPANY_MANAGE)
  @ApiOperation({ summary: 'Create a kiln/site in the current company' })
  async create(
    @CurrentCompany() companyId: string,
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(createSiteSchema)) dto: CreateSiteDto,
  ) {
    return this.companyService.createSite(companyId, userId, dto);
  }
}
