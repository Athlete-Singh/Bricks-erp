import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import type { CreateUserDto } from '@brics/shared';
import { Role } from '../auth/entities/role.entity';
import { UserCompany } from '../auth/entities/user-company.entity';
import { UserSite } from '../auth/entities/user-site.entity';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Role) private roleRepo: Repository<Role>,
    @InjectRepository(UserCompany) private userCompanyRepo: Repository<UserCompany>,
    @InjectRepository(UserSite) private userSiteRepo: Repository<UserSite>,
  ) {}

  async findUsersByCompany(companyId: string): Promise<Array<User & { roleCode: string }>> {
    const ucs = await this.userCompanyRepo.find({ where: { companyId } });
    if (ucs.length === 0) return [];

    const userIds = ucs.map((uc) => uc.userId);
    const users = await this.userRepo.findByIds(userIds);

    const roles = await this.roleRepo.find();
    const roleMap = new Map(roles.map((r) => [r.id, r.code]));

    return users.map((u) => {
      const uc = ucs.find((item) => item.userId === u.id);
      const roleCode = uc ? roleMap.get(uc.roleId) || 'supervisor' : 'supervisor';
      return Object.assign(u, { roleCode });
    });
  }

  async createUser(companyId: string, dto: CreateUserDto): Promise<User> {
    const existing = await this.userRepo.findOne({ where: { mobile: dto.mobile } });
    if (existing) {
      throw new BadRequestException('User with this mobile number already exists');
    }

    const role = await this.roleRepo.findOne({ where: { code: dto.roleCode } });
    if (!role) {
      throw new NotFoundException(`Role with code ${dto.roleCode} not found`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      email: dto.email || null,
      mobile: dto.mobile,
      name: dto.name,
      passwordHash,
      isActive: true,
      isSuperAdmin: false,
    });
    const savedUser = await this.userRepo.save(user);

    await this.userCompanyRepo.save(
      this.userCompanyRepo.create({
        userId: savedUser.id,
        companyId,
        roleId: role.id,
        isDefault: true,
      }),
    );

    if (dto.siteIds && dto.siteIds.length > 0) {
      const siteEntities = dto.siteIds.map((siteId) => this.userSiteRepo.create({ userId: savedUser.id, siteId }));
      await this.userSiteRepo.save(siteEntities);
    }

    return savedUser;
  }

  async findAllRoles(): Promise<Role[]> {
    return this.roleRepo.find({ order: { name: 'ASC' } });
  }
}
