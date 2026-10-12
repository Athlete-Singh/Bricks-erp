import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  acknowledgeDeliverySchema,
  cancelDispatchSchema,
  confirmDispatchSchema,
  createDispatchSchema,
  dispatchQuerySchema,
  gateReconciliationQuerySchema,
  PERMISSIONS,
  type AcknowledgeDeliveryDto,
  type CancelDispatchDto,
  type ConfirmDispatchDto,
  type CreateDispatchDto,
  type DispatchQueryDto,
  type GateReconciliationQueryDto,
} from '@brics/shared';
import {
  CurrentCompany,
  CurrentUser,
  IdempotencyKey,
  JwtPayload,
  RequirePermissions,
} from '../../common/decorators/auth.decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { DispatchService } from './dispatch.service';
import { ChallanPdfService } from './pdf/challan-pdf.service';

@ApiTags('Dispatch')
@ApiBearerAuth()
@Controller('dispatches')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class DispatchController {
  constructor(
    private readonly dispatch: DispatchService,
    private readonly challanPdf: ChallanPdfService,
  ) {}

  // ── DSP-01 ─────────────────────────────────────────────────────────────────

  @Post()
  @RequirePermissions(PERMISSIONS.DISPATCH_MANAGE)
  @ApiOperation({ summary: 'DSP-01 — raise a delivery challan' })
  async create(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createDispatchSchema)) dto: CreateDispatchDto,
    @IdempotencyKey() key: string | null,
  ) {
    return this.dispatch.createDispatch(companyId, user.sub, dto, key);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.DISPATCH_VIEW)
  async list(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(dispatchQuerySchema)) query: DispatchQueryDto,
  ) {
    return this.dispatch.listDispatches(companyId, query);
  }

  /**
   * LEK-04. Declared before `:id` so the literal path is not swallowed by the
   * uuid route — Nest matches in declaration order.
   */
  @Get('gate-reconciliation')
  @RequirePermissions(PERMISSIONS.DISPATCH_VIEW)
  @ApiOperation({ summary: 'LEK-04 — dispatched vs invoiced vs stock, with unbilled challans listed' })
  async gateReconciliation(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(gateReconciliationQuerySchema)) query: GateReconciliationQueryDto,
  ) {
    return this.dispatch.gateReconciliation(companyId, query);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.DISPATCH_VIEW)
  async get(@CurrentCompany() companyId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.dispatch.getDispatch(companyId, id);
  }

  /** DSP-05 — the challan the driver carries. */
  @Get(':id/pdf')
  @RequirePermissions(PERMISSIONS.DISPATCH_VIEW)
  @Header('Content-Type', 'application/pdf')
  async pdf(@CurrentCompany() companyId: string, @Param('id', new ParseUUIDPipe()) id: string, @Res() res: Response) {
    const { buffer, challanNo } = await this.challanPdf.render(companyId, id);
    res.setHeader('Content-Disposition', `inline; filename="${challanNo}.pdf"`);
    res.setHeader('Content-Length', String(buffer.length));
    res.end(buffer);
  }

  // ── DSP-02 ─────────────────────────────────────────────────────────────────

  @Patch(':id/confirm')
  @RequirePermissions(PERMISSIONS.DISPATCH_MANAGE)
  @ApiOperation({ summary: 'DSP-02 — confirm the truck out of the gate; deducts stock when unbilled' })
  async confirm(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(confirmDispatchSchema)) dto: ConfirmDispatchDto,
  ) {
    return this.dispatch.confirmDispatch(companyId, user.sub, id, dto);
  }

  // ── DSP-03 ─────────────────────────────────────────────────────────────────

  /**
   * Held by `dispatch.acknowledge`, not `dispatch.manage`: signing for a load
   * and opening the gate are different acts, and the roles that do them differ.
   */
  @Patch(':id/acknowledge')
  @RequirePermissions(PERMISSIONS.DISPATCH_ACKNOWLEDGE)
  @ApiOperation({ summary: 'DSP-03 — record who received the load and when' })
  async acknowledge(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(acknowledgeDeliverySchema)) dto: AcknowledgeDeliveryDto,
  ) {
    return this.dispatch.acknowledgeDelivery(companyId, user.sub, id, dto);
  }

  @Patch(':id/cancel')
  @RequirePermissions(PERMISSIONS.DISPATCH_MANAGE)
  async cancel(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(cancelDispatchSchema)) dto: CancelDispatchDto,
  ) {
    return this.dispatch.cancelDispatch(companyId, user.sub, id, dto);
  }
}
