import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
  itemRowSchema,
  onboardingImportSchema,
  openingBalanceRowSchema,
  openingStockRowSchema,
  partyRowSchema,
  type OnboardingImportDto,
  type OnboardingRowResult,
} from '@brics/shared';
import type { ZodError, ZodType } from 'zod';
import { Ledger } from '../../accounting/entities/ledger.entity';
import { BusinessRuleException } from '../../common/exceptions/business-rule.exception';
import { StockService } from '../../stock/stock.service';
import { FinancialYear } from '../company/entities/financial-year.entity';
import { BrickType } from '../inventory/entities/brick-type.entity';
import { HsnRate } from '../taxes/entities/hsn-rate.entity';
import { Item } from '../inventory/entities/item.entity';
import { Unit } from '../inventory/entities/unit.entity';
import { Warehouse } from '../inventory/entities/warehouse.entity';
import { Party } from '../parties/entities/party.entity';
import { PartyService } from '../parties/party.service';

/** What a planned row will do, once it is known to be valid. */
type Plan = { result: OnboardingRowResult; apply?: (manager: EntityManager) => Promise<void> };

export interface OnboardingReport {
  kind: OnboardingImportDto['kind'];
  rows: OnboardingRowResult[];
  okCount: number;
  problemCount: number;
  /** True only after `commit` actually wrote. */
  imported: boolean;
}

/**
 * ONB-01 — the go-live import.
 *
 * Two passes over the same rows. `preview` reports what would happen and
 * writes nothing; `commit` plans again inside a transaction and writes only if
 * **every** row is good.
 *
 * All-or-nothing is the point. A half-imported party list is worse than none:
 * the operator cannot tell which half, re-running duplicates what landed, and
 * the first week of real entries is made against a master list nobody trusts.
 */
@Injectable()
export class OnboardingService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly stock: StockService,
    private readonly parties: PartyService,
  ) {}

  async preview(companyId: string, dto: OnboardingImportDto): Promise<OnboardingReport> {
    const plans = await this.plan(this.dataSource.manager, companyId, dto);
    return this.report(dto, plans, false);
  }

  async commit(companyId: string, userId: string, dto: OnboardingImportDto): Promise<OnboardingReport> {
    return this.dataSource.transaction(async (manager) => {
      const plans = await this.plan(manager, companyId, dto, userId);
      const report = this.report(dto, plans, false);

      if (report.problemCount > 0) {
        // Nothing is written, and the caller gets the same report the preview
        // would have given — so a file that changed between preview and commit
        // fails here rather than importing half of itself.
        throw new BusinessRuleException(
          'IMPORT_HAS_PROBLEMS',
          `${report.problemCount} of ${report.rows.length} rows cannot be imported. Nothing was saved.`,
          { ...report },
        );
      }

      for (const plan of plans) {
        if (plan.apply) await plan.apply(manager);
      }
      return { ...report, imported: true };
    });
  }

  private report(dto: OnboardingImportDto, plans: Plan[], imported: boolean): OnboardingReport {
    const rows = plans.map((p) => p.result);
    return {
      kind: dto.kind,
      rows,
      okCount: rows.filter((r) => r.ok).length,
      problemCount: rows.filter((r) => !r.ok).length,
      imported,
    };
  }

  // ── planning ───────────────────────────────────────────────────────────────

  private async plan(
    manager: EntityManager,
    companyId: string,
    dto: OnboardingImportDto,
    userId?: string,
  ): Promise<Plan[]> {
    onboardingImportSchema.parse(dto);
    switch (dto.kind) {
      case 'parties':
        return this.planParties(manager, companyId, dto, userId);
      case 'items':
        return this.planItems(manager, companyId, dto, userId);
      case 'opening-balances':
        return this.planOpeningBalances(manager, companyId, dto, userId);
      case 'opening-stock':
        return this.planOpeningStock(manager, companyId, dto, userId);
    }
  }

  /** Turns a Zod failure into one plain sentence per field. */
  private problemsOf(error: ZodError): string[] {
    return error.issues.map((i) => (i.path.length > 0 ? `${String(i.path[0])}: ${i.message}` : i.message));
  }

  private parseRow<T>(schema: ZodType<T>, raw: Record<string, string>): { value?: T; problems: string[] } {
    const parsed = schema.safeParse(raw);
    return parsed.success ? { value: parsed.data, problems: [] } : { problems: this.problemsOf(parsed.error) };
  }

  private async planParties(
    manager: EntityManager,
    companyId: string,
    dto: OnboardingImportDto,
    userId?: string,
  ): Promise<Plan[]> {
    const existing = await manager.find(Party, { where: { companyId }, select: ['name'] });
    const taken = new Set(existing.map((p) => p.name.toLowerCase()));
    const plans: Plan[] = [];

    for (const [index, raw] of dto.rows.entries()) {
      const line = index + 2; // +1 for the header, +1 because people count from one
      const { value, problems } = this.parseRow(partyRowSchema, raw);

      if (value && taken.has(value.name.toLowerCase())) {
        problems.push(`name: a party called '${value.name}' already exists`);
      }
      if (!value || problems.length > 0) {
        plans.push({ result: { line, ok: false, summary: raw.name ?? '', problems } });
        continue;
      }

      // Within one file too: two rows naming the same party would otherwise
      // both pass, and the second would fail at the database.
      taken.add(value.name.toLowerCase());

      plans.push({
        result: { line, ok: true, summary: `${value.name} (${value.types.join(', ')})`, problems: [] },
        // Through PartyService, because a party is never only a party — it
        // carries its own ledger, and inserting the row alone leaves a party
        // nobody can invoice or pay (PTY-01).
        apply: async (m) => {
          await this.parties.createWithin(m, companyId, userId!, {
            name: value.name,
            partyTypes: value.types,
            gstin: value.gstin ?? null,
            pan: value.pan ?? null,
            stateCode: value.stateCode ?? null,
            address: value.address ?? null,
            phone: value.phone ?? null,
            email: value.email ?? null,
            openingDebit: Number(value.openingDebit).toFixed(2),
            openingCredit: Number(value.openingCredit).toFixed(2),
          });
        },
      });
    }
    return plans;
  }

  private async planItems(
    manager: EntityManager,
    companyId: string,
    dto: OnboardingImportDto,
    userId?: string,
  ): Promise<Plan[]> {
    const [units, hsnRates, items, grades] = await Promise.all([
      manager.find(Unit, { where: { companyId } }),
      manager.find(HsnRate, { where: { companyId } }),
      manager.find(Item, { where: { companyId }, select: ['name'] }),
      manager.find(BrickType, { where: { companyId }, select: ['grade'] }),
    ]);
    const unitByName = new Map(
      units.flatMap((u) => [
        [u.name.toLowerCase(), u],
        [u.abbreviation.toLowerCase(), u],
      ]),
    );
    const hsnByCode = new Map(hsnRates.map((h) => [h.hsnCode.toLowerCase(), h]));
    const takenItems = new Set(items.map((i) => i.name.toLowerCase()));
    const takenGrades = new Set(grades.map((g) => g.grade.toLowerCase()));
    const plans: Plan[] = [];

    for (const [index, raw] of dto.rows.entries()) {
      const line = index + 2;
      const { value, problems } = this.parseRow(itemRowSchema, raw);

      let unit: Unit | undefined;
      let hsn: HsnRate | undefined;
      if (value) {
        unit = unitByName.get(value.unit.toLowerCase());
        if (!unit) problems.push(`unit: '${value.unit}' is not a unit in this company — add it first`);
        if (value.hsnCode) {
          hsn = hsnByCode.get(value.hsnCode.toLowerCase());
          if (!hsn) problems.push(`hsnCode: '${value.hsnCode}' has no rate set up`);
        }
        if (takenItems.has(value.name.toLowerCase())) {
          problems.push(`name: an item called '${value.name}' already exists`);
        }
        if (value.brickGrade && takenGrades.has(value.brickGrade.toLowerCase())) {
          problems.push(`brickGrade: '${value.brickGrade}' already exists`);
        }
      }

      if (!value || problems.length > 0) {
        plans.push({ result: { line, ok: false, summary: raw.name ?? '', problems } });
        continue;
      }

      takenItems.add(value.name.toLowerCase());
      if (value.brickGrade) takenGrades.add(value.brickGrade.toLowerCase());

      const unitId = unit!.id;
      const hsnId = hsn?.id ?? null;
      plans.push({
        result: {
          line,
          ok: true,
          summary: value.brickGrade ? `${value.name} (grade ${value.brickGrade})` : value.name,
          problems: [],
        },
        apply: async (m) => {
          const itemRepo = m.getRepository(Item);
          const item = await itemRepo.save(
            itemRepo.create({
              companyId,
              name: value.name,
              category: value.category,
              unitId,
              hsnId,
              createdBy: userId,
              updatedBy: userId,
            }),
          );
          // A brick grade is stocked and sold as its item (ADR-051), so the two
          // are created together or not at all.
          if (value.brickGrade) {
            const gradeRepo = m.getRepository(BrickType);
            await gradeRepo.save(
              gradeRepo.create({
                companyId,
                grade: value.brickGrade,
                itemId: item.id,
                createdBy: userId,
                updatedBy: userId,
              }),
            );
          }
        },
      });
    }
    return plans;
  }

  private async planOpeningBalances(
    manager: EntityManager,
    companyId: string,
    dto: OnboardingImportDto,
    userId?: string,
  ): Promise<Plan[]> {
    const ledgers = await manager.find(Ledger, { where: { companyId } });
    // Matched by name or by code — a sheet from an accountant uses one, a
    // sheet exported from the old system usually uses the other.
    const byKey = new Map(
      ledgers.flatMap((l) => {
        const keys: [string, Ledger][] = [[l.name.toLowerCase(), l]];
        if (l.code) keys.push([l.code.toLowerCase(), l]);
        return keys;
      }),
    );
    const seen = new Set<string>();
    const plans: Plan[] = [];

    for (const [index, raw] of dto.rows.entries()) {
      const line = index + 2;
      const { value, problems } = this.parseRow(openingBalanceRowSchema, raw);

      let ledger: Ledger | undefined;
      if (value) {
        ledger = byKey.get(value.ledger.toLowerCase());
        if (!ledger) problems.push(`ledger: '${value.ledger}' is not a ledger in this company`);
        else if (seen.has(ledger.id)) problems.push(`ledger: '${value.ledger}' appears twice in this file`);
      }

      if (!value || problems.length > 0) {
        plans.push({ result: { line, ok: false, summary: raw.ledger ?? '', problems } });
        continue;
      }

      seen.add(ledger!.id);
      const target = ledger!;
      const debit = Number(value.debit).toFixed(2);
      const credit = Number(value.credit).toFixed(2);
      plans.push({
        result: {
          line,
          ok: true,
          summary: `${target.name} — ${Number(debit) > 0 ? `Dr ${debit}` : `Cr ${credit}`}`,
          problems: [],
        },
        apply: async (m) => {
          await m.update(
            Ledger,
            { id: target.id, companyId },
            { openingDebit: debit, openingCredit: credit, updatedBy: userId },
          );
        },
      });
    }
    return plans;
  }

  private async planOpeningStock(
    manager: EntityManager,
    companyId: string,
    dto: OnboardingImportDto,
    userId?: string,
  ): Promise<Plan[]> {
    const [warehouses, items, grades, year] = await Promise.all([
      manager.find(Warehouse, { where: { companyId } }),
      manager.find(Item, { where: { companyId } }),
      manager.find(BrickType, { where: { companyId } }),
      manager.findOne(FinancialYear, { where: { companyId, isActive: true } }),
    ]);
    const warehouseByName = new Map(warehouses.map((w) => [w.name.toLowerCase(), w]));
    const itemByName = new Map(items.map((i) => [i.name.toLowerCase(), i]));
    const gradeByName = new Map(grades.map((g) => [g.grade.toLowerCase(), g]));
    const seen = new Set<string>();
    const plans: Plan[] = [];

    for (const [index, raw] of dto.rows.entries()) {
      const line = index + 2;
      const { value, problems } = this.parseRow(openingStockRowSchema, raw);

      let warehouse: Warehouse | undefined;
      let itemId: string | undefined;
      let label = '';

      if (value) {
        warehouse = warehouseByName.get(value.warehouse.toLowerCase());
        if (!warehouse) problems.push(`warehouse: '${value.warehouse}' is not a warehouse in this company`);

        // A grade is looked up first: the sheet says "Class 1", and that is the
        // grade's name, not the item's (ADR-051).
        const grade = gradeByName.get(value.item.toLowerCase());
        const item = itemByName.get(value.item.toLowerCase());
        if (grade) {
          itemId = grade.itemId;
          label = grade.grade;
        } else if (item) {
          itemId = item.id;
          label = item.name;
        } else {
          problems.push(`item: '${value.item}' is neither an item nor a brick grade in this company`);
        }

        if (!value.asOf && !year) {
          problems.push('asOf: no financial year is active, so there is no date to default to');
        }

        const key = `${warehouse?.id ?? ''}:${itemId ?? ''}`;
        if (itemId && warehouse && seen.has(key)) {
          problems.push(`item: '${value.item}' already has an opening row for ${value.warehouse} in this file`);
        }
      }

      if (!value || problems.length > 0) {
        plans.push({ result: { line, ok: false, summary: raw.item ?? '', problems } });
        continue;
      }

      const movementDate = value.asOf ?? year!.startDate;
      seen.add(`${warehouse!.id}:${itemId!}`);
      const warehouseId = warehouse!.id;
      const resolvedItemId = itemId!;

      plans.push({
        result: {
          line,
          ok: true,
          summary: `${value.quantity} of ${label} into ${warehouse!.name} as at ${movementDate}`,
          problems: [],
        },
        // Through StockService like every other movement (INV-04): the opening
        // row is one per subject per warehouse, and that rule lives there.
        apply: async (m) => {
          await this.stock.record(m, {
            companyId,
            userId: userId!,
            warehouseId,
            itemId: resolvedItemId,
            movementType: 'opening',
            direction: 'in',
            quantity: value.quantity,
            movementDate,
            sourceType: 'onboarding_import',
            sourceId: null,
            notes: 'Opening stock, imported at go-live',
          });
        },
      });
    }
    return plans;
  }

  /** Every name the importer can match against, so the screen can show them. */
  async referenceData(companyId: string): Promise<{
    units: string[];
    warehouses: string[];
    ledgers: string[];
    items: string[];
    brickGrades: string[];
    hsnCodes: string[];
  }> {
    const m = this.dataSource.manager;
    const [units, warehouses, ledgers, items, grades, hsn] = await Promise.all([
      m.find(Unit, { where: { companyId } }),
      m.find(Warehouse, { where: { companyId } }),
      m.find(Ledger, { where: { companyId } }),
      m.find(Item, { where: { companyId } }),
      m.find(BrickType, { where: { companyId } }),
      m.find(HsnRate, { where: { companyId } }),
    ]);
    return {
      units: units.map((u) => u.name),
      warehouses: warehouses.map((w) => w.name),
      ledgers: ledgers.map((l) => l.name),
      items: items.map((i) => i.name),
      brickGrades: grades.map((g) => g.grade),
      hsnCodes: hsn.map((h) => h.hsnCode),
    };
  }
}
