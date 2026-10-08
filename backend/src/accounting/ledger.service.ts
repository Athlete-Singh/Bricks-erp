import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Decimal from 'decimal.js';
import { DataSource, Repository } from 'typeorm';
import type { CreateLedgerDto, SetOpeningBalancesDto, UpdateLedgerDto } from '@brics/shared';
import { normalBalanceSide } from '@brics/shared';
import { Money } from '../common/money/money';
import { BusinessRuleException } from '../common/exceptions/business-rule.exception';
import { LedgerGroup } from './entities/ledger-group.entity';
import { Ledger } from './entities/ledger.entity';

export interface OpeningBalanceSummary {
  totalDebit: string;
  totalCredit: string;
  /** `debit − credit`; non-zero means the opening entries do not tie. */
  difference: string;
  isBalanced: boolean;
}

@Injectable()
export class LedgerService {
  constructor(
    @InjectRepository(Ledger) private ledgerRepo: Repository<Ledger>,
    @InjectRepository(LedgerGroup) private groupRepo: Repository<LedgerGroup>,
    private dataSource: DataSource,
  ) {}

  async create(companyId: string, userId: string, dto: CreateLedgerDto): Promise<Ledger> {
    const group = await this.groupRepo.findOne({ where: { id: dto.groupId, companyId } });
    if (!group) {
      // Scoped by companyId, so a group id from another tenant reads as missing.
      throw new NotFoundException('Ledger group not found');
    }

    const duplicate = await this.ledgerRepo.findOne({ where: { companyId, name: dto.name } });
    if (duplicate) {
      throw new BadRequestException(`A ledger named '${dto.name}' already exists`);
    }

    return this.ledgerRepo.save(
      this.ledgerRepo.create({
        companyId,
        groupId: group.id,
        name: dto.name,
        code: dto.code ?? null,
        createdBy: userId,
        updatedBy: userId,
      }),
    );
  }

  async update(companyId: string, userId: string, id: string, dto: UpdateLedgerDto): Promise<Ledger> {
    const ledger = await this.requireLedger(companyId, id);

    if (dto.groupId && dto.groupId !== ledger.groupId) {
      const group = await this.groupRepo.findOne({ where: { id: dto.groupId, companyId } });
      if (!group) throw new NotFoundException('Ledger group not found');
      // A seeded ledger's group is what posting rules depend on: moving
      // "Output CGST" out of Duties & Taxes would silently break the GST split.
      if (ledger.isSystem) {
        throw new BusinessRuleException(
          'LEDGER_SYSTEM_GROUP_FIXED',
          `'${ledger.name}' is a built-in ledger and cannot be moved to another group`,
        );
      }
      ledger.groupId = dto.groupId;
    }

    if (dto.name && dto.name !== ledger.name) {
      const duplicate = await this.ledgerRepo.findOne({ where: { companyId, name: dto.name } });
      if (duplicate && duplicate.id !== id) {
        throw new BadRequestException(`A ledger named '${dto.name}' already exists`);
      }
      ledger.name = dto.name;
    }

    if (dto.isActive !== undefined) {
      if (ledger.isSystem && dto.isActive === false) {
        throw new BusinessRuleException(
          'LEDGER_SYSTEM_REQUIRED',
          `'${ledger.name}' is a built-in ledger and cannot be deactivated`,
        );
      }
      ledger.isActive = dto.isActive;
    }

    ledger.updatedBy = userId;
    return this.ledgerRepo.save(ledger);
  }

  /**
   * ACC-04. Written in one transaction: a half-applied set of opening balances
   * would leave the trial balance wrong with no way to tell which half landed.
   *
   * Deliberately does **not** force debits to equal credits — real opening
   * figures rarely tie on the first pass. The difference is reported instead,
   * and parks in Opening Balance Difference until the owner resolves it.
   */
  async setOpeningBalances(
    companyId: string,
    userId: string,
    dto: SetOpeningBalancesDto,
  ): Promise<OpeningBalanceSummary> {
    const ids = dto.balances.map((b) => b.ledgerId);
    const ledgers = await this.ledgerRepo.find({ where: { companyId } });
    const byId = new Map(ledgers.map((l) => [l.id, l]));

    const unknown = ids.filter((id) => !byId.has(id));
    if (unknown.length > 0) {
      throw new NotFoundException(`${unknown.length} ledger(s) do not belong to this company`);
    }

    await this.dataSource.transaction(async (manager) => {
      for (const balance of dto.balances) {
        await manager.update(
          Ledger,
          { id: balance.ledgerId, companyId },
          {
            openingDebit: Money.toString(balance.openingDebit),
            openingCredit: Money.toString(balance.openingCredit),
            openingFinancialYearId: dto.financialYearId,
            updatedBy: userId,
          },
        );
      }
    });

    return this.openingBalanceSummary(companyId);
  }

  /** Σ opening debits vs Σ opening credits — what the owner needs to see to tie the books. */
  async openingBalanceSummary(companyId: string): Promise<OpeningBalanceSummary> {
    const ledgers = await this.ledgerRepo.find({ where: { companyId } });
    const totalDebit = Money.sum(ledgers.map((l) => l.openingDebit));
    const totalCredit = Money.sum(ledgers.map((l) => l.openingCredit));
    const difference = totalDebit.minus(totalCredit);

    return {
      totalDebit: Money.toString(totalDebit),
      totalCredit: Money.toString(totalCredit),
      difference: Money.toString(difference),
      isBalanced: difference.isZero(),
    };
  }

  /**
   * The opening balance as a signed amount on the group's natural side — what a
   * trial balance row needs. A credit on an asset ledger is a negative asset,
   * not a liability.
   */
  openingOnNaturalSide(ledger: Ledger, group: LedgerGroup): Decimal {
    const debit = Money.of(ledger.openingDebit);
    const credit = Money.of(ledger.openingCredit);
    return normalBalanceSide(group.nature) === 'debit' ? debit.minus(credit) : credit.minus(debit);
  }

  private async requireLedger(companyId: string, id: string): Promise<Ledger> {
    const ledger = await this.ledgerRepo.findOne({ where: { id, companyId } });
    if (!ledger) throw new NotFoundException('Ledger not found');
    return ledger;
  }
}
