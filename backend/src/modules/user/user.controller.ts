import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { createUserSchema, updateUserSchema, PERMISSIONS, type CreateUserDto, type UpdateUserDto } from '@brics/shared';
import { CurrentCompany, CurrentUser, RequirePermissions } from '../../common/decorators/auth.decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { UserService } from './user.service';

// Handlers return the payload raw; ResponseEnvelopeInterceptor adds `{ data }`.
@ApiTags('Users & Roles')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@ApiBearerAuth()
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.USERS_MANAGE)
  @ApiOperation({ summary: 'List users of the current company' })
  async findAll(@CurrentCompany() companyId: string) {
    return this.userService.findUsersByCompany(companyId);
  }

  /** Declared before `:id` routes would be, so it is never read as an id. */
  @Get('roles')
  @ApiOperation({ summary: 'List the seeded roles, for the role picker' })
  async findRoles() {
    return this.userService.findAllRoles();
  }

  @Post()
  @RequirePermissions(PERMISSIONS.USERS_MANAGE)
  @ApiOperation({ summary: 'Create a user and assign role + kiln access' })
  async create(
    @CurrentCompany() companyId: string,
    @CurrentUser('sub') actorId: string,
    @Body(new ZodValidationPipe(createUserSchema)) dto: CreateUserDto,
  ) {
    return this.userService.createUser(companyId, actorId, dto);
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.USERS_MANAGE)
  @ApiOperation({ summary: 'Update a user: role, kiln access, name/email or active flag' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentCompany() companyId: string,
    @CurrentUser('sub') actorId: string,
    @Body(new ZodValidationPipe(updateUserSchema)) dto: UpdateUserDto,
  ) {
    return this.userService.updateUser(companyId, actorId, id, dto);
  }
}
