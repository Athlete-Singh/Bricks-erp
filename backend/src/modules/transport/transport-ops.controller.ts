import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  createTripSchema,
  createVehicleExpenseSchema,
  tripQuerySchema,
  vehicleExpenseQuerySchema,
  vehicleProfitabilityQuerySchema,
  PERMISSIONS,
  type CreateTripDto,
  type CreateVehicleExpenseDto,
  type TripQueryDto,
  type VehicleExpenseQueryDto,
  type VehicleProfitabilityQueryDto,
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
import { TransportOpsService } from './transport-ops.service';

/**
 * VEH-02…07. Sits beside `TransportMastersController` on the same `/transport`
 * prefix: vehicles and drivers are the masters, trips and charges are what they
 * do. Route names do not collide (`drivers`, `vehicles` vs `trips`, `expenses`).
 */
@ApiTags('Transport')
@ApiBearerAuth()
@Controller('transport')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class TransportOpsController {
  constructor(private readonly ops: TransportOpsService) {}

  // ── VEH-02 ─────────────────────────────────────────────────────────────────

  @Post('trips')
  @RequirePermissions(PERMISSIONS.TRANSPORT_MANAGE)
  @ApiOperation({ summary: 'VEH-02 — log a trip, optionally charging freight' })
  async createTrip(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createTripSchema)) dto: CreateTripDto,
    @IdempotencyKey() key: string | null,
  ) {
    return this.ops.createTrip(companyId, user.sub, dto, key);
  }

  @Get('trips')
  @RequirePermissions(PERMISSIONS.TRANSPORT_VIEW)
  async listTrips(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(tripQuerySchema)) query: TripQueryDto,
  ) {
    return this.ops.listTrips(companyId, query);
  }

  @Get('trips/:id')
  @RequirePermissions(PERMISSIONS.TRANSPORT_VIEW)
  async getTrip(@CurrentCompany() companyId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.ops.getTrip(companyId, id);
  }

  // ── VEH-03…06 ──────────────────────────────────────────────────────────────

  @Post('expenses')
  @RequirePermissions(PERMISSIONS.TRANSPORT_MANAGE)
  @ApiOperation({ summary: 'VEH-03…06 — diesel, maintenance, loading or hire against a vehicle' })
  async createExpense(
    @CurrentCompany() companyId: string,
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createVehicleExpenseSchema)) dto: CreateVehicleExpenseDto,
    @IdempotencyKey() key: string | null,
  ) {
    return this.ops.createExpense(companyId, user.sub, dto, key);
  }

  @Get('expenses')
  @RequirePermissions(PERMISSIONS.TRANSPORT_VIEW)
  async listExpenses(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(vehicleExpenseQuerySchema)) query: VehicleExpenseQueryDto,
  ) {
    return this.ops.listExpenses(companyId, query);
  }

  // ── VEH-07 ─────────────────────────────────────────────────────────────────

  @Get('vehicle-profitability')
  @RequirePermissions(PERMISSIONS.TRANSPORT_VIEW)
  @ApiOperation({ summary: 'VEH-07 — freight earned minus diesel, repairs, loading and hire, per vehicle' })
  async profitability(
    @CurrentCompany() companyId: string,
    @Query(new ZodValidationPipe(vehicleProfitabilityQuerySchema)) query: VehicleProfitabilityQueryDto,
  ) {
    return this.ops.vehicleProfitability(companyId, query);
  }
}
