import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { createUserSchema } from '@brics/shared';
import { CurrentCompany, RequirePermissions } from '../../common/decorators/auth.decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { UserService } from './user.service';

@ApiTags('Users & Roles')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@ApiBearerAuth()
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  @RequirePermissions('users.manage')
  @ApiOperation({ summary: 'List all users for current company' })
  async findAll(@CurrentCompany() companyId: string) {
    const data = await this.userService.findUsersByCompany(companyId);
    return { data };
  }

  @Post()
  @RequirePermissions('users.manage')
  @ApiOperation({ summary: 'Create a new user and assign role/site access' })
  async create(@CurrentCompany() companyId: string, @Body() body: unknown) {
    const dto = createUserSchema.parse(body);
    const data = await this.userService.createUser(companyId, dto);
    return { data };
  }

  @Get('roles')
  @ApiOperation({ summary: 'List all available system roles' })
  async findRoles() {
    const data = await this.userService.findAllRoles();
    return { data };
  }
}
