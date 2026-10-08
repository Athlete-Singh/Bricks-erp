import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { createCompanySchema, createSiteSchema, updateCompanySchema } from '@brics/shared';
import { CurrentCompany, RequirePermissions } from '../../common/decorators/auth.decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CompanyService } from './company.service';

@ApiTags('Companies & Sites')
@Controller('companies')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@ApiBearerAuth()
export class CompanyController {
  constructor(private companyService: CompanyService) {}

  @Get()
  @RequirePermissions('company.view')
  @ApiOperation({ summary: 'List all companies' })
  async findAll() {
    const data = await this.companyService.findAllCompanies();
    return { data };
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current company details from JWT tenant context' })
  async findCurrent(@CurrentCompany() companyId: string) {
    const data = await this.companyService.findCompanyById(companyId);
    return { data };
  }

  @Get(':id')
  @RequirePermissions('company.view')
  @ApiOperation({ summary: 'Get company by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.companyService.findCompanyById(id);
    return { data };
  }

  @Post()
  @RequirePermissions('company.manage')
  @ApiOperation({ summary: 'Create a new company' })
  async create(@Body() body: unknown) {
    const dto = createCompanySchema.parse(body);
    const data = await this.companyService.createCompany(dto);
    return { data };
  }

  @Put(':id')
  @RequirePermissions('company.manage')
  @ApiOperation({ summary: 'Update company details' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown) {
    const dto = updateCompanySchema.parse(body);
    const data = await this.companyService.updateCompany(id, dto);
    return { data };
  }

  @Get(':companyId/sites')
  @RequirePermissions('company.view')
  @ApiOperation({ summary: 'List all sites/kilns for a company' })
  async findSites(@Param('companyId', ParseUUIDPipe) companyId: string) {
    const data = await this.companyService.findSitesByCompany(companyId);
    return { data };
  }

  @Post(':companyId/sites')
  @RequirePermissions('company.manage')
  @ApiOperation({ summary: 'Create a new site/kiln for a company' })
  async createSite(@Param('companyId', ParseUUIDPipe) companyId: string, @Body() body: unknown) {
    const dto = createSiteSchema.parse(body);
    const data = await this.companyService.createSite(companyId, dto);
    return { data };
  }

  @Get(':companyId/financial-years')
  @RequirePermissions('company.view')
  @ApiOperation({ summary: 'List financial years for a company' })
  async findFinancialYears(@Param('companyId', ParseUUIDPipe) companyId: string) {
    const data = await this.companyService.findFinancialYears(companyId);
    return { data };
  }
}
