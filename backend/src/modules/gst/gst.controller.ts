import { Controller, Get, Header, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  gstPeriodSchema,
  gstRegisterQuerySchema,
  PERMISSIONS,
  type GstPeriodDto,
  type GstRegisterQueryDto,
} from '@brics/shared';
import { CurrentCompany, RequirePermissions } from '../../common/decorators/auth.decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { GstService } from './gst.service';

@ApiTags('GST')
@ApiBearerAuth()
@Controller('gst')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class GstController {
  constructor(private readonly gst: GstService) {}

  @Get('gstr-1')
  @RequirePermissions(PERMISSIONS.TAXES_VIEW)
  @ApiOperation({ summary: 'GST-04 — GSTR-1 register: B2B, B2C and the HSN summary' })
  async gstr1(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(gstPeriodSchema)) query: GstPeriodDto,
  ) {
    return this.gst.gstr1(companyId, query);
  }

  /** GST-04's export — CSV, which opens in Excel and in the accountant's own tools. */
  @Get('gstr-1/export')
  @RequirePermissions(PERMISSIONS.TAXES_VIEW)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async gstr1Export(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(gstPeriodSchema)) query: GstPeriodDto,
    @Res() res: Response,
  ) {
    const csv = await this.gst.gstr1Csv(companyId, query);
    res.setHeader('Content-Disposition', `attachment; filename="GSTR1-${query.month}.csv"`);
    res.end(csv);
  }

  @Get('gstr-3b')
  @RequirePermissions(PERMISSIONS.TAXES_VIEW)
  @ApiOperation({ summary: 'GST-05 — GSTR-3B summary: output tax, input credit, net payable' })
  async gstr3b(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(gstPeriodSchema)) query: GstPeriodDto,
  ) {
    return this.gst.gstr3b(companyId, query);
  }

  @Get('sales-register')
  @RequirePermissions(PERMISSIONS.TAXES_VIEW)
  @ApiOperation({ summary: 'GST-06 — GST on sales, invoice by invoice' })
  async salesRegister(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(gstRegisterQuerySchema)) query: GstRegisterQueryDto,
  ) {
    return this.gst.taxRegister(companyId, 'sales', query);
  }

  @Get('purchase-register')
  @RequirePermissions(PERMISSIONS.TAXES_VIEW)
  @ApiOperation({ summary: 'GST-06 — GST on purchases, bill by bill' })
  async purchaseRegister(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(gstRegisterQuerySchema)) query: GstRegisterQueryDto,
  ) {
    return this.gst.taxRegister(companyId, 'purchase', query);
  }

  @Get('reconciliation')
  @RequirePermissions(PERMISSIONS.TAXES_VIEW)
  @ApiOperation({ summary: 'GST-07 — the registers against the books, with the differences listed' })
  async reconciliation(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(gstPeriodSchema)) query: GstPeriodDto,
  ) {
    return this.gst.reconciliation(companyId, query);
  }
}
