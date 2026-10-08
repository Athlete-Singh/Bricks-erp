import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  createCompanySchema,
  updateCompanySchema,
  PERMISSIONS,
  type CreateCompanyDto,
  type UpdateCompanyDto,
} from '@brics/shared';
import { CurrentCompany, CurrentUser, RequirePermissions } from '../../common/decorators/auth.decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CompanyService } from './company.service';

// Handlers return the payload raw; ResponseEnvelopeInterceptor adds `{ data }`.
@ApiTags('Companies')
@Controller('companies')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@ApiBearerAuth()
export class CompanyController {
  constructor(private companyService: CompanyService) {}

  /** Bearer-only: returns just the caller's own companies, which the switcher needs. */
  @Get()
  @ApiOperation({ summary: 'List the companies the signed-in user belongs to' })
  async findAll(@CurrentUser('sub') userId: string, @CurrentUser('isSuperAdmin') isSuperAdmin: boolean) {
    return this.companyService.findCompaniesForUser(userId, isSuperAdmin);
  }

  @Get('current')
  @ApiOperation({ summary: 'Get the active company from the JWT tenant context' })
  async findCurrent(
    @CurrentUser('sub') userId: string,
    @CurrentCompany() companyId: string,
    @CurrentUser('isSuperAdmin') isSuperAdmin: boolean,
  ) {
    return this.companyService.findCompanyForUser(userId, companyId, isSuperAdmin);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.COMPANY_VIEW)
  @ApiOperation({ summary: 'Get a company the user belongs to' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('isSuperAdmin') isSuperAdmin: boolean,
  ) {
    return this.companyService.findCompanyForUser(userId, id, isSuperAdmin);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.COMPANY_MANAGE)
  @ApiOperation({ summary: 'Create a company (the creator becomes its Owner)' })
  async create(
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(createCompanySchema)) dto: CreateCompanyDto,
  ) {
    return this.companyService.createCompany(userId, dto);
  }

  @Put(':id')
  @RequirePermissions(PERMISSIONS.COMPANY_MANAGE)
  @ApiOperation({ summary: 'Update a company the user belongs to' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('isSuperAdmin') isSuperAdmin: boolean,
    @Body(new ZodValidationPipe(updateCompanySchema)) dto: UpdateCompanyDto,
  ) {
    return this.companyService.updateCompany(userId, id, dto, isSuperAdmin);
  }
}
