import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, Repository } from 'typeorm';
import type { CreatePartyDto, PartyQueryDto, PartyType, UpdatePartyDto } from '@brics/shared';
import { AuditService } from '../audit/audit.service';
import { applySince, withTombstone, type WithTombstone } from '../../common/sync/delta-pull';
import { LedgerGroup } from '../../accounting/entities/ledger-group.entity';
import { Ledger } from '../../accounting/entities/ledger.entity';
import { Party } from './entities/party.entity';
import { FinancialYear } from '../company/entities/financial-year.entity';

export interface Paginated<T> {
  items: T[];
  meta: { page: number; limit: number; total: number };
}

/**
 * ADR-020: every party auto-creates exactly one ledger, inside the same
 * transaction. The group is picked by type precedence:
 *   customer → Sundry Debtors
 *   supplier | transporter → Sundry Creditors
 *   sardar | employee → Labour Payables
 *   other → Sundry Creditors
 */
const GROUP_CODE_BY_TYPE: Record<PartyType, string> = {
  customer: 'SUNDRY_DEBTORS',
  supplier: 'SUNDRY_CREDITORS',
  transporter: 'SUNDRY_CREDITORS',
  sardar: 'LABOUR_PAYABLES',
  employee: 'LABOUR_PAYABLES',
  other: 'SUNDRY_CREDITORS',
};

const TYPE_PRECEDENCE: readonly PartyType[] = ['customer', 'supplier', 'transporter', 'sardar', 'employee', 'other'];

export function ledgerGroupCodeForTypes(types: PartyType[]): string {
  for (const t of TYPE_PRECEDENCE) {
    if (types.includes(t)) return GROUP_CODE_BY_TYPE[t];
  }
  return 'SUNDRY_CREDITORS';
}

@Injectable()
export class PartyService {
  constructor(
    @InjectRepository(Party) private partyRepo: Repository<Party>,
    @InjectRepository(LedgerGroup) private groupRepo: Repository<LedgerGroup>,
    @InjectRepository(Ledger) private ledgerRepo: Repository<Ledger>,
    @InjectRepository(FinancialYear) private fyRepo: Repository<FinancialYear>,
    private audit: AuditService,
    private dataSource: DataSource,
  ) {}

  async create(companyId: string, userId: string, dto: CreatePartyDto): Promise<Party> {
    const duplicate = await this.partyRepo.findOne({
      where: { companyId, name: ILike(dto.name) },
    });
    if (duplicate) {
      throw new BadRequestException(`A party named '${dto.name}' already exists`);
    }

    const groupCode = ledgerGroupCodeForTypes(dto.partyTypes);
    const group = await this.groupRepo.findOne({ where: { companyId, code: groupCode } });
    if (!group) {
      throw new Error(`Ledger group '${groupCode}' missing for company ${companyId}. Re-run the chart seed.`);
    }

    const activeFy = await this.fyRepo.findOne({ where: { companyId, isActive: true } });

    return this.dataSource.transaction(async (manager) => {
      const ledgerRepo = manager.getRepository(Ledger);
      const partyRepo = manager.getRepository(Party);

      const openingDebit = dto.openingDebit ?? '0.00';
      const openingCredit = dto.openingCredit ?? '0.00';

      const ledger = await ledgerRepo.save(
        ledgerRepo.create({
          companyId,
          groupId: group.id,
          name: dto.name,
          code: null,
          isSystem: false,
          openingDebit,
          openingCredit,
          openingFinancialYearId: activeFy?.id ?? null,
          createdBy: userId,
          updatedBy: userId,
        }),
      );

      const party = await partyRepo.save(
        partyRepo.create({
          companyId,
          name: dto.name,
          partyTypes: dto.partyTypes,
          gstin: dto.gstin ?? null,
          pan: dto.pan ?? null,
          stateCode: dto.stateCode ?? null,
          address: dto.address ?? null,
          phone: dto.phone ?? null,
          email: dto.email ?? null,
          openingDebit: dto.openingDebit ?? '0.00',
          openingCredit: dto.openingCredit ?? '0.00',
          ledgerId: ledger.id,
          createdBy: userId,
          updatedBy: userId,
        }),
      );

      await ledgerRepo.update({ id: ledger.id }, { partyId: party.id });

      await this.audit.record(
        {
          companyId,
          userId,
          entityName: 'parties',
          entityId: party.id,
          action: 'CREATE',
          after: { name: party.name, partyTypes: party.partyTypes, ledgerId: ledger.id },
        },
        manager,
      );

      return party;
    });
  }

  async update(companyId: string, userId: string, id: string, dto: UpdatePartyDto): Promise<Party> {
    const party = await this.requireParty(companyId, id);
    const before = this.diffable(party);

    if (dto.name && dto.name !== party.name) {
      const duplicate = await this.partyRepo.findOne({
        where: { companyId, name: ILike(dto.name) },
      });
      if (duplicate && duplicate.id !== id) {
        throw new BadRequestException(`A party named '${dto.name}' already exists`);
      }
      party.name = dto.name;
    }

    if (dto.partyTypes) {
      const oldGroupCode = ledgerGroupCodeForTypes(party.partyTypes);
      const newGroupCode = ledgerGroupCodeForTypes(dto.partyTypes);
      party.partyTypes = dto.partyTypes;

      if (oldGroupCode !== newGroupCode) {
        const newGroup = await this.groupRepo.findOne({ where: { companyId, code: newGroupCode } });
        if (!newGroup) {
          throw new Error(`Ledger group '${newGroupCode}' missing for company ${companyId}`);
        }
        await this.ledgerRepo.update({ id: party.ledgerId, companyId }, { groupId: newGroup.id, updatedBy: userId });
      }
    }

    if (dto.gstin !== undefined) party.gstin = dto.gstin ?? null;
    if (dto.pan !== undefined) party.pan = dto.pan ?? null;
    if (dto.stateCode !== undefined) party.stateCode = dto.stateCode ?? null;
    if (dto.address !== undefined) party.address = dto.address ?? null;
    if (dto.phone !== undefined) party.phone = dto.phone ?? null;
    if (dto.email !== undefined) party.email = dto.email ?? null;
    if (dto.isActive !== undefined) party.isActive = dto.isActive;

    // Keep the ledger name in sync with the party name
    if (dto.name && dto.name !== before.name) {
      await this.ledgerRepo.update({ id: party.ledgerId, companyId }, { name: party.name, updatedBy: userId });
    }

    party.updatedBy = userId;
    const saved = await this.partyRepo.save(party);

    await this.audit.record({
      companyId,
      userId,
      entityName: 'parties',
      entityId: id,
      action: 'UPDATE',
      before,
      after: this.diffable(saved),
    });

    return saved;
  }

  async findAll(companyId: string, query: PartyQueryDto): Promise<Paginated<WithTombstone<Party>>> {
    const qb = this.partyRepo.createQueryBuilder('p').where('p.company_id = :companyId', { companyId });

    if (query.search) {
      qb.andWhere('p.name ILIKE :search', { search: `%${query.search}%` });
    }
    if (query.type) {
      qb.andWhere(':type = ANY(p.party_types)', { type: query.type });
    }
    if (query.isActive !== undefined) {
      qb.andWhere('p.is_active = :isActive', { isActive: query.isActive });
    }

    applySince(qb, 'p', query.since);

    const sortField = query.sort?.startsWith('-') ? query.sort.slice(1) : (query.sort ?? 'created_at');
    const sortDir = query.sort?.startsWith('-') ? 'DESC' : 'ASC';
    const allowed = ['name', 'created_at', 'updated_at'];
    const col = allowed.includes(sortField) ? sortField : 'created_at';
    qb.orderBy(`p.${col}`, sortDir);

    const total = await qb.getCount();
    const rows = await qb
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getMany();

    return { items: rows.map(withTombstone), meta: { page: query.page, limit: query.limit, total } };
  }

  async findOne(companyId: string, id: string): Promise<Party> {
    return this.requireParty(companyId, id);
  }

  private async requireParty(companyId: string, id: string): Promise<Party> {
    const party = await this.partyRepo.findOne({ where: { id, companyId } });
    if (!party) throw new NotFoundException('Party not found');
    return party;
  }

  private diffable(party: Party): Record<string, unknown> {
    return {
      name: party.name,
      partyTypes: party.partyTypes,
      gstin: party.gstin,
      pan: party.pan,
      stateCode: party.stateCode,
      address: party.address,
      phone: party.phone,
      email: party.email,
      isActive: party.isActive,
    };
  }
}
