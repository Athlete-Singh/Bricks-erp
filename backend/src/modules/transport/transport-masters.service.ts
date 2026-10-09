import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { Driver } from './entities/driver.entity';
import { Vehicle } from './entities/vehicle.entity';
import { AuditService } from '../audit/audit.service';
import { CreateDriverDto, UpdateDriverDto, CreateVehicleDto, UpdateVehicleDto } from '@brics/shared';

@Injectable()
export class TransportMastersService {
  constructor(
    @InjectEntityManager() private readonly em: EntityManager,
    private readonly audit: AuditService,
  ) {}

  private diffable(entity: unknown): Record<string, unknown> {
    const raw = entity as Record<string, unknown>;
    const copy = { ...raw };
    delete copy.id;
    delete copy.companyId;
    delete copy.createdAt;
    delete copy.updatedAt;
    delete copy.createdBy;
    delete copy.updatedBy;
    return copy;
  }

  async createDriver(companyId: string, userId: string, dto: CreateDriverDto) {
    return this.em.transaction(async (manager) => {
      const driver = manager.create(Driver, {
        companyId,
        createdBy: userId,
        updatedBy: userId,
        name: dto.name,
        phone: dto.phone ?? null,
        licenseNo: dto.licenseNo ?? null,
        isActive: dto.isActive ?? true,
      });

      await manager.save(driver);

      await this.audit.record(
        {
          companyId,
          userId,
          action: 'CREATE',
          entityName: 'transport_drivers',
          entityId: driver.id,
          after: this.diffable(driver),
        },
        manager,
      );

      return driver;
    });
  }

  async updateDriver(companyId: string, userId: string, id: string, dto: UpdateDriverDto) {
    return this.em.transaction(async (manager) => {
      const driver = await manager.findOne(Driver, {
        where: { id, companyId },
      });

      if (!driver) throw new NotFoundException('Driver not found');

      const oldValues = { ...driver };

      if (dto.name !== undefined) driver.name = dto.name;
      if (dto.phone !== undefined) driver.phone = dto.phone ?? null;
      if (dto.licenseNo !== undefined) driver.licenseNo = dto.licenseNo ?? null;
      if (dto.isActive !== undefined) driver.isActive = dto.isActive;

      driver.updatedBy = userId;

      await manager.save(driver);

      await this.audit.record(
        {
          companyId,
          userId,
          action: 'UPDATE',
          entityName: 'transport_drivers',
          entityId: driver.id,
          before: this.diffable(oldValues),
          after: this.diffable(driver),
        },
        manager,
      );

      return driver;
    });
  }

  async listDrivers(companyId: string) {
    return this.em.find(Driver, {
      where: { companyId },
      order: { name: 'ASC' },
    });
  }

  async createVehicle(companyId: string, userId: string, dto: CreateVehicleDto) {
    return this.em.transaction(async (manager) => {
      const vehicle = manager.create(Vehicle, {
        companyId,
        createdBy: userId,
        updatedBy: userId,
        registrationNo: dto.registrationNo,
        type: dto.type,
        ownerType: dto.ownerType,
        partyId: dto.partyId ?? null,
        isActive: dto.isActive ?? true,
      });

      await manager.save(vehicle);

      await this.audit.record(
        {
          companyId,
          userId,
          action: 'CREATE',
          entityName: 'transport_vehicles',
          entityId: vehicle.id,
          after: this.diffable(vehicle),
        },
        manager,
      );

      return vehicle;
    });
  }

  async updateVehicle(companyId: string, userId: string, id: string, dto: UpdateVehicleDto) {
    return this.em.transaction(async (manager) => {
      const vehicle = await manager.findOne(Vehicle, {
        where: { id, companyId },
      });

      if (!vehicle) throw new NotFoundException('Vehicle not found');

      const oldValues = { ...vehicle };

      if (dto.registrationNo !== undefined) vehicle.registrationNo = dto.registrationNo;
      if (dto.type !== undefined) vehicle.type = dto.type;
      if (dto.ownerType !== undefined) vehicle.ownerType = dto.ownerType;
      if (dto.partyId !== undefined) vehicle.partyId = dto.partyId ?? null;
      if (dto.isActive !== undefined) vehicle.isActive = dto.isActive;

      vehicle.updatedBy = userId;

      await manager.save(vehicle);

      await this.audit.record(
        {
          companyId,
          userId,
          action: 'UPDATE',
          entityName: 'transport_vehicles',
          entityId: vehicle.id,
          before: this.diffable(oldValues),
          after: this.diffable(vehicle),
        },
        manager,
      );

      return vehicle;
    });
  }

  async listVehicles(companyId: string) {
    return this.em.find(Vehicle, {
      where: { companyId },
      order: { registrationNo: 'ASC' },
    });
  }
}
