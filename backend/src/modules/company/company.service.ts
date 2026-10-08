import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { CreateCompanyDto, CreateSiteDto, UpdateCompanyDto } from '@brics/shared';
import { Company } from './entities/company.entity';
import { FinancialYear } from './entities/financial-year.entity';
import { Site } from './entities/site.entity';

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Company) private companyRepo: Repository<Company>,
    @InjectRepository(Site) private siteRepo: Repository<Site>,
    @InjectRepository(FinancialYear) private fyRepo: Repository<FinancialYear>,
  ) {}

  async findAllCompanies(): Promise<Company[]> {
    return this.companyRepo.find({ order: { name: 'ASC' } });
  }

  async findCompanyById(id: string): Promise<Company> {
    const company = await this.companyRepo.findOneBy({ id });
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    return company;
  }

  async createCompany(dto: CreateCompanyDto): Promise<Company> {
    const company = this.companyRepo.create({
      name: dto.name,
      gstin: dto.gstin || null,
      pan: dto.pan || null,
      stateCode: dto.stateCode,
      address: dto.address || null,
      logoUrl: dto.logoUrl || null,
    });
    return this.companyRepo.save(company);
  }

  async updateCompany(id: string, dto: UpdateCompanyDto): Promise<Company> {
    const company = await this.findCompanyById(id);
    Object.assign(company, dto);
    return this.companyRepo.save(company);
  }

  async findSitesByCompany(companyId: string): Promise<Site[]> {
    return this.siteRepo.find({ where: { companyId }, order: { name: 'ASC' } });
  }

  async createSite(companyId: string, dto: CreateSiteDto): Promise<Site> {
    const site = this.siteRepo.create({
      companyId,
      name: dto.name,
      code: dto.code,
      type: dto.type,
      address: dto.address || null,
    });
    return this.siteRepo.save(site);
  }

  async findFinancialYears(companyId: string): Promise<FinancialYear[]> {
    return this.fyRepo.find({ where: { companyId }, order: { startDate: 'DESC' } });
  }

  async createFinancialYear(
    companyId: string,
    dto: { name: string; startDate: string; endDate: string },
  ): Promise<FinancialYear> {
    const fy = this.fyRepo.create({
      companyId,
      name: dto.name,
      startDate: dto.startDate,
      endDate: dto.endDate,
      isActive: true,
      isLocked: false,
    });
    return this.fyRepo.save(fy);
  }
}
