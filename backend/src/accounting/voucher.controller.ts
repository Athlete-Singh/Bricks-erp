import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  createVoucherSchema,
  reverseVoucherSchema,
  voucherQuerySchema,
  PERMISSIONS,
  type CreateVoucherDto,
  type ReverseVoucherDto,
  type VoucherQueryDto,
} from '@brics/shared';
import { CurrentCompany, CurrentUser, RequirePermissions } from '../common/decorators/auth.decorators';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { VoucherService } from './voucher.service';

/**
 * Manual vouchers (ACC-03). There is no update route on purpose: a posted
 * voucher is immutable, and a correction is a reversal (ACC-02).
 */
@ApiTags('Vouchers')
@Controller('vouchers')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@ApiBearerAuth()
export class VoucherController {
  constructor(private vouchers: VoucherService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.ACCOUNTS_VIEW)
  @ApiOperation({ summary: 'List vouchers, newest first — the Day Book feed' })
  async find(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(voucherQuerySchema)) query: VoucherQueryDto,
  ) {
    return this.vouchers.find(companyId, query);
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.ACCOUNTS_VIEW)
  @ApiOperation({ summary: 'One voucher with its lines' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentCompany() companyId: string) {
    return this.vouchers.findOne(companyId, id);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.ACCOUNTS_MANAGE)
  @ApiOperation({ summary: 'Post a manual voucher: receipt, payment, contra or journal' })
  async create(
    @CurrentCompany() companyId: string,
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(createVoucherSchema)) dto: CreateVoucherDto,
  ) {
    return this.vouchers.create(companyId, userId, dto);
  }

  @Post(':id/reverse')
  @RequirePermissions(PERMISSIONS.ACCOUNTS_MANAGE)
  @ApiOperation({ summary: 'Reverse a posted voucher by writing its mirror' })
  async reverse(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentCompany() companyId: string,
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(reverseVoucherSchema)) dto: ReverseVoucherDto,
  ) {
    return this.vouchers.reverse(companyId, userId, id, dto);
  }
}
