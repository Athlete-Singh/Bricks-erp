import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { auditLogQuerySchema, PERMISSIONS, type AuditLogQueryDto } from '@brics/shared';
import { CurrentCompany, RequirePermissions } from '../../common/decorators/auth.decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuditService } from './audit.service';

/** The Owner's audit-log viewer (ADM-07), scoped to the JWT tenant. */
@ApiTags('Audit')
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@ApiBearerAuth()
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.AUDIT_VIEW)
  @ApiOperation({ summary: 'List audit entries for the current company, newest first' })
  async findAll(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(auditLogQuerySchema)) query: AuditLogQueryDto,
  ) {
    return this.auditService.find(companyId, query);
  }
}
