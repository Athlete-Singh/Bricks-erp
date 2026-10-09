import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  currentStockQuerySchema,
  openingStockSchema,
  PERMISSIONS,
  stockAdjustmentSchema,
  stockMovementQuerySchema,
  type CurrentStockQueryDto,
  type OpeningStockDto,
  type StockAdjustmentDto,
  type StockMovementQueryDto,
} from '@brics/shared';
import { CurrentCompany, CurrentUser, JwtPayload, RequirePermissions } from '../common/decorators/auth.decorators';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { StockReportsService } from './stock-reports.service';
import { StockService } from './stock.service';

@ApiTags('Stock')
@ApiBearerAuth()
@Controller('stock')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class StockController {
  constructor(
    private readonly stock: StockService,
    private readonly reports: StockReportsService,
  ) {}

  @Post('opening')
  @RequirePermissions(PERMISSIONS.INVENTORY_MANAGE)
  @ApiOperation({ summary: 'INV-03 — record opening stock for one item or grade in one warehouse' })
  async openingStock(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(openingStockSchema)) dto: OpeningStockDto,
  ) {
    return this.stock.openingStock(companyId, user.sub, dto);
  }

  @Post('adjustments')
  @RequirePermissions(PERMISSIONS.INVENTORY_ADJUST)
  @ApiOperation({ summary: 'INV-06 — correct a balance against a physical count, with a reason' })
  async adjust(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(stockAdjustmentSchema)) dto: StockAdjustmentDto,
  ) {
    return this.stock.adjust(companyId, user.sub, dto);
  }

  @Get('current')
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  @ApiOperation({ summary: 'INV-07 — current stock by kiln, warehouse, item and grade' })
  async currentStock(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(currentStockQuerySchema)) query: CurrentStockQueryDto,
  ) {
    return this.reports.currentStock(companyId, query);
  }

  @Get('register')
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  @ApiOperation({ summary: 'INV-07 — the movement register, with a running balance when narrowed' })
  async register(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(stockMovementQuerySchema)) query: StockMovementQueryDto,
  ) {
    return this.reports.register(companyId, query);
  }

  @Get('balance')
  @RequirePermissions(PERMISSIONS.INVENTORY_VIEW)
  @ApiOperation({ summary: 'The current balance of one item or grade in one warehouse' })
  async balance(
    @CurrentCompany() companyId: string,
    @Query('warehouseId') warehouseId: string,
    @Query('itemId') itemId?: string,
    @Query('brickTypeId') brickTypeId?: string,
  ) {
    const balance = await this.stock.currentBalance(companyId, {
      warehouseId,
      itemId: itemId ?? null,
      brickTypeId: brickTypeId ?? null,
    });
    return { warehouseId, itemId: itemId ?? null, brickTypeId: brickTypeId ?? null, balance };
  }
}
