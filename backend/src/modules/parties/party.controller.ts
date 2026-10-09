import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { createPartySchema, partyQuerySchema, updatePartySchema } from '@brics/shared';
import { CurrentCompany, CurrentUser, RequirePermissions } from '../../common/decorators/auth.decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { PartyService } from './party.service';

@Controller('parties')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class PartyController {
  constructor(private readonly partyService: PartyService) {}

  @Post()
  @RequirePermissions('parties.manage')
  create(
    @CurrentCompany() companyId: string,
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(createPartySchema)) dto: ReturnType<typeof createPartySchema.parse>,
  ) {
    return this.partyService.create(companyId, userId, dto);
  }

  @Get()
  @RequirePermissions('parties.view')
  findAll(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(partyQuerySchema)) query: ReturnType<typeof partyQuerySchema.parse>,
  ) {
    return this.partyService.findAll(companyId, query);
  }

  @Get(':id')
  @RequirePermissions('parties.view')
  findOne(@CurrentCompany() companyId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.partyService.findOne(companyId, id);
  }

  @Patch(':id')
  @RequirePermissions('parties.manage')
  update(
    @CurrentCompany() companyId: string,
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updatePartySchema)) dto: ReturnType<typeof updatePartySchema.parse>,
  ) {
    return this.partyService.update(companyId, userId, id, dto);
  }
}
