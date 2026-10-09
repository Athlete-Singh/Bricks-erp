import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CreateBrickTypeDto,
  createBrickTypeSchema,
  CreateItemDto,
  createItemSchema,
  CreateUnitDto,
  createUnitSchema,
  CreateWarehouseDto,
  createWarehouseSchema,
  InventoryMasterQueryDto,
  inventoryMasterQuerySchema,
  UpdateBrickTypeDto,
  updateBrickTypeSchema,
  UpdateItemDto,
  updateItemSchema,
  UpdateUnitDto,
  updateUnitSchema,
  UpdateWarehouseDto,
  updateWarehouseSchema,
} from '@brics/shared';

import { CurrentCompany, CurrentUser, RequirePermissions } from '../../common/decorators/auth.decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { InventoryMastersService } from './inventory-masters.service';

@ApiTags('Inventory Masters')
@ApiBearerAuth()
@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class InventoryMastersController {
  constructor(private readonly service: InventoryMastersService) {}

  // ── Units ─────────────────────────────────────────────────────────────────

  @Post('units')
  @RequirePermissions('inventory.manage')
  @ApiOperation({ summary: 'Create a unit' })
  async createUnit(
    @CurrentCompany() companyId: string,
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(createUnitSchema)) dto: CreateUnitDto,
  ) {
    const data = await this.service.createUnit(companyId, userId, dto);
    return data;
  }

  @Patch('units/:id')
  @RequirePermissions('inventory.manage')
  @ApiOperation({ summary: 'Update a unit' })
  async updateUnit(
    @CurrentCompany() companyId: string,
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateUnitSchema)) dto: UpdateUnitDto,
  ) {
    const data = await this.service.updateUnit(companyId, userId, id, dto);
    return data;
  }

  @Get('units')
  @RequirePermissions('inventory.view')
  @ApiOperation({ summary: 'List units' })
  async listUnits(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(inventoryMasterQuerySchema)) query: InventoryMasterQueryDto,
  ) {
    const data = await this.service.listUnits(companyId, query);
    return data;
  }

  // ── Brick Types ───────────────────────────────────────────────────────────

  @Post('brick-types')
  @RequirePermissions('inventory.manage')
  @ApiOperation({ summary: 'Create a brick type' })
  async createBrickType(
    @CurrentCompany() companyId: string,
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(createBrickTypeSchema)) dto: CreateBrickTypeDto,
  ) {
    const data = await this.service.createBrickType(companyId, userId, dto);
    return data;
  }

  @Patch('brick-types/:id')
  @RequirePermissions('inventory.manage')
  @ApiOperation({ summary: 'Update a brick type' })
  async updateBrickType(
    @CurrentCompany() companyId: string,
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateBrickTypeSchema)) dto: UpdateBrickTypeDto,
  ) {
    const data = await this.service.updateBrickType(companyId, userId, id, dto);
    return data;
  }

  @Get('brick-types')
  @RequirePermissions('inventory.view')
  @ApiOperation({ summary: 'List brick types' })
  async listBrickTypes(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(inventoryMasterQuerySchema)) query: InventoryMasterQueryDto,
  ) {
    const data = await this.service.listBrickTypes(companyId, query);
    return data;
  }

  // ── Warehouses ────────────────────────────────────────────────────────────

  @Post('warehouses')
  @RequirePermissions('inventory.manage')
  @ApiOperation({ summary: 'Create a warehouse' })
  async createWarehouse(
    @CurrentCompany() companyId: string,
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(createWarehouseSchema)) dto: CreateWarehouseDto,
  ) {
    const data = await this.service.createWarehouse(companyId, userId, dto);
    return data;
  }

  @Patch('warehouses/:id')
  @RequirePermissions('inventory.manage')
  @ApiOperation({ summary: 'Update a warehouse' })
  async updateWarehouse(
    @CurrentCompany() companyId: string,
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateWarehouseSchema)) dto: UpdateWarehouseDto,
  ) {
    const data = await this.service.updateWarehouse(companyId, userId, id, dto);
    return data;
  }

  @Get('warehouses')
  @RequirePermissions('inventory.view')
  @ApiOperation({ summary: 'List warehouses' })
  async listWarehouses(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(inventoryMasterQuerySchema)) query: InventoryMasterQueryDto,
  ) {
    const data = await this.service.listWarehouses(companyId, query);
    return data;
  }

  // ── Items ─────────────────────────────────────────────────────────────────

  @Post('items')
  @RequirePermissions('inventory.manage')
  @ApiOperation({ summary: 'Create an item' })
  async createItem(
    @CurrentCompany() companyId: string,
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(createItemSchema)) dto: CreateItemDto,
  ) {
    const data = await this.service.createItem(companyId, userId, dto);
    return data;
  }

  @Patch('items/:id')
  @RequirePermissions('inventory.manage')
  @ApiOperation({ summary: 'Update an item' })
  async updateItem(
    @CurrentCompany() companyId: string,
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateItemSchema)) dto: UpdateItemDto,
  ) {
    const data = await this.service.updateItem(companyId, userId, id, dto);
    return data;
  }

  @Get('items')
  @RequirePermissions('inventory.view')
  @ApiOperation({ summary: 'List items' })
  async listItems(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(inventoryMasterQuerySchema)) query: InventoryMasterQueryDto,
  ) {
    const data = await this.service.listItems(companyId, query);
    return data;
  }
}
