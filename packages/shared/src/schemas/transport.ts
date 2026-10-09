import { z } from 'zod';

export enum VehicleType {
  TRUCK = 'truck',
  TRACTOR = 'tractor',
  TIPPER = 'tipper',
  OTHER = 'other',
}

export enum VehicleOwnerType {
  OWN = 'own',
  HIRED = 'hired',
}

export const createDriverSchema = z.object({
  name: z.string().min(1, 'Driver name is required').max(100),
  phone: z.string().max(20).optional().nullable(),
  licenseNo: z.string().max(50).optional().nullable(),
  isActive: z.boolean().default(true),
});
export type CreateDriverDto = z.infer<typeof createDriverSchema>;

export const updateDriverSchema = createDriverSchema.partial();
export type UpdateDriverDto = z.infer<typeof updateDriverSchema>;

export const createVehicleSchema = z.object({
  registrationNo: z.string().min(1, 'Registration number is required').max(50),
  type: z.nativeEnum(VehicleType),
  ownerType: z.nativeEnum(VehicleOwnerType),
  partyId: z.string().uuid().optional().nullable(), // For hired vehicles
  isActive: z.boolean().default(true),
});
export type CreateVehicleDto = z.infer<typeof createVehicleSchema>;

export const updateVehicleSchema = createVehicleSchema.partial();
export type UpdateVehicleDto = z.infer<typeof updateVehicleSchema>;
