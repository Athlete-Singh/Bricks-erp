import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Decimal from 'decimal.js';
import { Repository } from 'typeorm';
import type { YieldVarianceQueryDto } from '@brics/shared';
import { Party } from '../parties/entities/party.entity';
import { ProductionBatch } from './entities/production-batch.entity';
import { ProductionEntry } from './entities/production-entry.entity';
import { ProductionSortingOutput } from './entities/production-sorting-output.entity';

Decimal.set({ precision: 30, rounding: Decimal.ROUND_HALF_UP });

export interface YieldVarianceRow {
  /** The grouping key — a batchId, a chamber label, or a Sardar partyId. */
  groupId: string;
  groupLabel: string;
  siteId: string | null;
  chamber: string | null;
  sardarPartyId: string | null;
  greenMoulded: string;
  fired: string;
  goodTotal: string;
  broken: string;
  rejects: string;
  /**
   * `greenMoulded − (goodTotal + broken + rejects)`. Positive means more bricks
   * were reported moulded than ever came out of sorting — the exact leakage
   * LEK-01 exists to show.
   */
  unexplained: string;
}

/**
 * LEK-01 — brick yield variance.
 *
 * One pass per source table (making entries, firing entries, sorting entries,
 * sorting outputs) then arithmetic in Decimal — no float ever touches a count.
 * The report is readable by groupBy=batch (default, one row per batch),
 * groupBy=chamber (a chamber's cumulative yield across dates), or
 * groupBy=sardar (a gang's total output, which is the labour-leakage view).
 */
@Injectable()
export class ProductionReportsService {
  constructor(
    @InjectRepository(ProductionBatch) private readonly batchRepo: Repository<ProductionBatch>,
    @InjectRepository(ProductionEntry) private readonly entryRepo: Repository<ProductionEntry>,
    @InjectRepository(ProductionSortingOutput)
    private readonly outputRepo: Repository<ProductionSortingOutput>,
    @InjectRepository(Party) private readonly partyRepo: Repository<Party>,
  ) {}

  async yieldVariance(companyId: string, query: YieldVarianceQueryDto): Promise<YieldVarianceRow[]> {
    const batchFilter = this.batchRepo
      .createQueryBuilder('b')
      .where('b.company_id = :companyId', { companyId })
      .andWhere('b.deleted_at IS NULL')
      .andWhere('b.batch_date BETWEEN :from AND :to', { from: query.from, to: query.to });
    if (query.siteId) batchFilter.andWhere('b.site_id = :siteId', { siteId: query.siteId });
    if (query.chamber) batchFilter.andWhere('b.chamber = :chamber', { chamber: query.chamber });
    const batches = await batchFilter.getMany();
    const batchIds = batches.map((b) => b.id);
    if (batchIds.length === 0) return [];

    const entries = await this.entryRepo
      .createQueryBuilder('e')
      .where('e.company_id = :companyId', { companyId })
      .andWhere('e.deleted_at IS NULL')
      .andWhere('e.batch_id IN (:...batchIds)', { batchIds })
      .getMany();

    const outputs = await this.outputRepo
      .createQueryBuilder('o')
      .innerJoin(ProductionEntry, 'e', 'e.id = o.entry_id')
      .where('o.company_id = :companyId', { companyId })
      .andWhere('o.deleted_at IS NULL')
      .andWhere('e.batch_id IN (:...batchIds)', { batchIds })
      .select(['o.entry_id as "entryId"', 'SUM(o.quantity) as "quantity"'])
      .groupBy('o.entry_id')
      .getRawMany<{ entryId: string; quantity: string }>();
    const outputByEntry = new Map(outputs.map((o) => [o.entryId, o.quantity ?? '0']));

    // Per-batch aggregates, keyed by batchId.
    const perBatch = new Map<
      string,
      {
        batch: ProductionBatch;
        making: ProductionEntry | null;
        firing: ProductionEntry | null;
        sorting: ProductionEntry | null;
        goodTotal: Decimal;
      }
    >();
    for (const b of batches) {
      perBatch.set(b.id, {
        batch: b,
        making: null,
        firing: null,
        sorting: null,
        goodTotal: new Decimal(0),
      });
    }
    for (const e of entries) {
      const bucket = perBatch.get(e.batchId);
      if (!bucket) continue;
      if (e.stage === 'making') bucket.making = e;
      else if (e.stage === 'firing') bucket.firing = e;
      else if (e.stage === 'sorting') {
        bucket.sorting = e;
        const outQty = outputByEntry.get(e.id) ?? '0';
        bucket.goodTotal = new Decimal(outQty);
      }
    }

    // Filter by sardar: a batch counts only if its making entry names the sardar.
    const filtered = Array.from(perBatch.values()).filter((row) => {
      if (!query.sardarPartyId) return true;
      return row.making?.sardarPartyId === query.sardarPartyId;
    });

    // Group.
    if (query.groupBy === 'batch') {
      return filtered.map((row) => this.rowForBatch(row));
    }

    if (query.groupBy === 'chamber') {
      return this.aggregate(
        filtered,
        (row) => row.batch.chamber,
        (sample) => ({
          siteId: sample.batch.siteId,
          chamber: sample.batch.chamber,
          sardarPartyId: null,
          label: `${sample.batch.chamber}`,
        }),
      );
    }

    // groupBy === 'sardar'
    const sardarIds = Array.from(
      new Set(filtered.map((r) => r.making?.sardarPartyId).filter((id): id is string => Boolean(id))),
    );
    const sardarRows = sardarIds.length
      ? await this.partyRepo
          .createQueryBuilder('p')
          .where('p.id IN (:...ids)', { ids: sardarIds })
          .andWhere('p.company_id = :companyId', { companyId })
          .getMany()
      : [];
    const sardarName = new Map(sardarRows.map((p) => [p.id, p.name]));

    return this.aggregate(
      filtered.filter((row) => row.making?.sardarPartyId),
      (row) => row.making!.sardarPartyId!,
      (sample) => ({
        siteId: null,
        chamber: null,
        sardarPartyId: sample.making!.sardarPartyId!,
        label: sardarName.get(sample.making!.sardarPartyId!) ?? '(unknown Sardar)',
      }),
    );
  }

  private rowForBatch(row: {
    batch: ProductionBatch;
    making: ProductionEntry | null;
    firing: ProductionEntry | null;
    sorting: ProductionEntry | null;
    goodTotal: Decimal;
  }): YieldVarianceRow {
    const green = new Decimal(row.making?.greenBricks ?? 0);
    const fired = new Decimal(row.firing?.firedBricks ?? 0);
    const broken = new Decimal(row.sorting?.brokenBricks ?? 0);
    const rejects = new Decimal(row.sorting?.rejectBricks ?? 0);
    const good = row.goodTotal;
    const unexplained = green.minus(good).minus(broken).minus(rejects);
    return {
      groupId: row.batch.id,
      groupLabel: `${row.batch.chamber} · ${row.batch.batchDate}`,
      siteId: row.batch.siteId,
      chamber: row.batch.chamber,
      sardarPartyId: row.making?.sardarPartyId ?? null,
      greenMoulded: green.toFixed(3),
      fired: fired.toFixed(3),
      goodTotal: good.toFixed(3),
      broken: broken.toFixed(3),
      rejects: rejects.toFixed(3),
      unexplained: unexplained.toFixed(3),
    };
  }

  private aggregate<K extends string>(
    rows: Array<{
      batch: ProductionBatch;
      making: ProductionEntry | null;
      firing: ProductionEntry | null;
      sorting: ProductionEntry | null;
      goodTotal: Decimal;
    }>,
    keyOf: (row: {
      batch: ProductionBatch;
      making: ProductionEntry | null;
      firing: ProductionEntry | null;
      sorting: ProductionEntry | null;
      goodTotal: Decimal;
    }) => K,
    labelFrom: (sample: { batch: ProductionBatch; making: ProductionEntry | null }) => {
      siteId: string | null;
      chamber: string | null;
      sardarPartyId: string | null;
      label: string;
    },
  ): YieldVarianceRow[] {
    const buckets = new Map<
      K,
      {
        sample: { batch: ProductionBatch; making: ProductionEntry | null };
        green: Decimal;
        fired: Decimal;
        good: Decimal;
        broken: Decimal;
        rejects: Decimal;
      }
    >();
    for (const row of rows) {
      const key = keyOf(row);
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = {
          sample: { batch: row.batch, making: row.making },
          green: new Decimal(0),
          fired: new Decimal(0),
          good: new Decimal(0),
          broken: new Decimal(0),
          rejects: new Decimal(0),
        };
        buckets.set(key, bucket);
      }
      bucket.green = bucket.green.plus(row.making?.greenBricks ?? 0);
      bucket.fired = bucket.fired.plus(row.firing?.firedBricks ?? 0);
      bucket.good = bucket.good.plus(row.goodTotal);
      bucket.broken = bucket.broken.plus(row.sorting?.brokenBricks ?? 0);
      bucket.rejects = bucket.rejects.plus(row.sorting?.rejectBricks ?? 0);
    }
    const out: YieldVarianceRow[] = [];
    for (const [key, b] of buckets) {
      const label = labelFrom(b.sample);
      const unexplained = b.green.minus(b.good).minus(b.broken).minus(b.rejects);
      out.push({
        groupId: String(key),
        groupLabel: label.label,
        siteId: label.siteId,
        chamber: label.chamber,
        sardarPartyId: label.sardarPartyId,
        greenMoulded: b.green.toFixed(3),
        fired: b.fired.toFixed(3),
        goodTotal: b.good.toFixed(3),
        broken: b.broken.toFixed(3),
        rejects: b.rejects.toFixed(3),
        unexplained: unexplained.toFixed(3),
      });
    }
    return out;
  }
}
