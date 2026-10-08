import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { createFinancialYearSchema, PERMISSIONS, type CreateFinancialYearDto } from '@brics/shared';
import { CurrentCompany, CurrentUser, RequirePermissions } from '../../common/decorators/auth.decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CompanyService } from './company.service';

/** Financial years of the JWT tenant: create and set active (ADM-04). */
@ApiTags('Financial Years')
@Controller('financial-years')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@ApiBearerAuth()
export class FinancialYearController {
  constructor(private companyService: CompanyService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.COMPANY_VIEW)
  @ApiOperation({ summary: 'List financial years of the current company' })
  async findAll(@CurrentCompany() companyId: string) {
    return this.companyService.findFinancialYears(companyId);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.COMPANY_MANAGE)
  @ApiOperation({ summary: 'Create a financial year' })
  async create(
    @CurrentCompany() companyId: string,
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(createFinancialYearSchema)) dto: CreateFinancialYearDto,
  ) {
    return this.companyService.createFinancialYear(companyId, userId, dto);
  }

  @Patch(':id/activate')
  @RequirePermissions(PERMISSIONS.COMPANY_MANAGE)
  @ApiOperation({ summary: 'Set this financial year active (deactivates the others)' })
  async activate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentCompany() companyId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.companyService.activateFinancialYear(companyId, userId, id);
  }
}
