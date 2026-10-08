import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Permission } from './entities/permission.entity';
import { RolePermission } from './entities/role-permission.entity';
import { Role } from './entities/role.entity';

/** Roles and their permission codes. Owner of the `roles` / `permissions` tables. */
@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role) private roleRepo: Repository<Role>,
    @InjectRepository(Permission) private permissionRepo: Repository<Permission>,
    @InjectRepository(RolePermission) private rolePermissionRepo: Repository<RolePermission>,
  ) {}

  async findAll(): Promise<Role[]> {
    return this.roleRepo.find({ order: { name: 'ASC' } });
  }

  async findById(id: string): Promise<Role | null> {
    return this.roleRepo.findOneBy({ id });
  }

  async findByCode(code: string): Promise<Role | null> {
    return this.roleRepo.findOne({ where: { code } });
  }

  async requireByCode(code: string): Promise<Role> {
    const role = await this.findByCode(code);
    if (!role) {
      throw new NotFoundException(`Role '${code}' is not seeded. Run \`pnpm seed\`.`);
    }
    return role;
  }

  /** Permission codes granted to a role, for the JWT claim and RolesGuard. */
  async permissionCodesFor(roleId: string): Promise<string[]> {
    const links = await this.rolePermissionRepo.find({ where: { roleId } });
    if (links.length === 0) return [];
    const permissions = await this.permissionRepo.find({
      where: { id: In(links.map((l) => l.permissionId)) },
    });
    return permissions.map((p) => p.code).sort();
  }

  /** `roleId -> code`, for listing users without an N+1 lookup. */
  async codeByIdMap(): Promise<Map<string, string>> {
    const roles = await this.roleRepo.find();
    return new Map(roles.map((r) => [r.id, r.code]));
  }
}
