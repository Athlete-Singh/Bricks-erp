import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Decimal from 'decimal.js';
import { Repository } from 'typeorm';
import type { FuelVarianceQueryDto, ProductionReportQueryDto, YieldVarianceQueryDto } from '@brics/shared';
import { BrickType } from '../inventory/entities/brick-type.entity';
import { Item } from '../inventory/entities/item.entity';
import { Party } from '../parties/entities/party.entity';
import { Site } from '../company/entities/site.entity';
import { ProductionBatch } from './entities/production-batch.entity';
import { ProductionConsumption } from './entities/production-consumption.entity';
import { ProductionEntry } from './entities/production-entry.entity';
import { ProductionSortingOutput } from './entities/production-sorting-output.entity';
import { BusinessRuleException } from '../../common/exceptions/business-rule.exception';

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
   * `greenMoulded − (goodTotal + broken + rejects)` — the figure LEK-01 names.
   *
   * **`null` until the batch has been sorted.** Before sorting, good/broken/
   * rejects are all zero because nobody has counted them yet, and subtracting
   * them would report every batch still in the kiln as a total loss. A number
   * here means the batch is closed and the figure is real.
   */
  unexplained: string | null;
  /** False while any batch in this row is still unsorted — `unexplained` is then null. */
  sortingComplete: boolean;
  /** How many batches this row covers, and how many are still waiting to be sorted. */
  batchCount: number;
  pendingSortCount: number;
  /**
   * `greenMoulded − fired`: bricks lost between moulding and firing. This is
   * ordinary drying and handling breakage — large, seasonal and not theft —
   * and it is split out so it stops masquerading as leakage.
   */
  preFiringLoss: string;
  /**
   * `fired − (goodTotal + broken + rejects)`: bricks that went into the kiln
   * and never came out of sorting. **This is the theft signal**; unlike
   * `unexplained` it is not inflated by normal pre-firing loss. Null until
   * sorted.
   */
  postFiringLoss: string | null;
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
/** One batch's fuel picture, before grouping. */
interface FuelBatchRow {
  batch: ProductionBatch;
  fired: Decimal;
  fuel: Decimal;
  fuelRecorded: boolean;
  /** The date the chamber was fired — the basis for the window and the month. */
  firedDate: string;
}

export interface FuelVarianceRow {
  /** The grouping key — a batchId, a siteId, or a `YYYY-MM` string. */
  groupId: string;
  groupLabel: string;
  siteId: string | null;
  chamber: string | null;
  periodMonth: string | null;
  firedTotal: string;
  fuelConsumed: string;
  /**
   * `fuelConsumed / (firedTotal / 1000)` — null when no bricks were fired, and
   * null when **no fuel was recorded at all**. The second case used to report
   * `0.000`, which is not a frugal kiln but a missing data-entry row, and it
   * dragged the median down for every other batch in the window.
   */
  ratio: string | null;
  /** False when nothing was booked against this fuel item — chase the entry, do not read the ratio. */
  fuelRecorded: boolean;
  /** Which side of the median an outlier sits on; null when not an outlier. */
  direction: 'over' | 'under' | null;
  /**
   * True when `|ratio − median| / median > 0.15` within the result set — a
   * batch using 15 % more or less fuel per 1,000 bricks than the median
   * batch in the window, which is far more than normal day-to-day drift.
   */
  isOutlier: boolean;
}

/** One line of PRD-07: a period, a kiln and a grade, with what was produced. */
export interface ProductionReportRow {
  /** `YYYY-MM-DD`, `YYYY-MM` or `YYYY`, following `groupBy`. */
  period: string;
  siteId: string;
  siteName: string;
  brickTypeId: string;
  grade: string;
  /** Good bricks of this grade that entered finished stock. */
  goodBricks: string;
  /** Batches that contributed, so a large number can be read in context. */
  batchCount: number;
}

export interface ProductionReport {
  rows: ProductionReportRow[];
  totals: { goodBricks: string; batchCount: number };
}

@Injectable()
export class ProductionReportsService {
  constructor(
    @InjectRepository(ProductionBatch) private readonly batchRepo: Repository<ProductionBatch>,
    @InjectRepository(ProductionEntry) private readonly entryRepo: Repository<ProductionEntry>,
    @InjectRepository(ProductionSortingOutput)
    private readonly outputRepo: Repository<ProductionSortingOutput>,
    @InjectRepository(ProductionConsumption)
    private readonly consumptionRepo: Repository<ProductionConsumption>,
    @InjectRepository(Item) private readonly itemRepo: Repository<Item>,
    @InjectRepository(Site) private readonly siteRepo: Repository<Site>,
    @InjectRepository(Party) private readonly partyRepo: Repository<Party>,
  ) {}

  /**
   * PRD-07 — what each kiln actually produced, by grade, over a period.
   *
   * Counted from sorting outputs rather than fired bricks: a brick is only
   * production once it has been graded into finished stock. The period is the
   * sorting entry's date, which is when the bricks became sellable.
   */
  async productionReport(companyId: string, query: ProductionReportQueryDto): Promise<ProductionReport> {
    const qb = this.outputRepo
      .createQueryBuilder('o')
      .innerJoin(ProductionEntry, 'e', 'e.id = o.entry_id AND e.deleted_at IS NULL')
      .innerJoin(ProductionBatch, 'b', 'b.id = e.batch_id AND b.deleted_at IS NULL')
      .innerJoin(Site, 's', 's.id = b.site_id')
      .innerJoin(BrickType, 'bt', 'bt.id = o.brick_type_id')
      .where('o.company_id = :companyId', { companyId })
      .andWhere('o.deleted_at IS NULL')
      .andWhere('e.stage = :stage', { stage: 'sorting' })
      .andWhere('e.entry_date BETWEEN :from AND :to', { from: query.from, to: query.to });

    if (query.siteId) qb.andWhere('b.site_id = :siteId', { siteId: query.siteId });
    if (query.brickTypeId) qb.andWhere('o.brick_type_id = :brickTypeId', { brickTypeId: query.brickTypeId });

    // `to_char` keeps the bucketing in Postgres on a `date` column, so no JS
    // Date is constructed and no timezone can shift a day (the IST trap).
    const format = { day: 'YYYY-MM-DD', month: 'YYYY-MM', year: 'YYYY' }[query.groupBy];
    const period = `to_char(e.entry_date, '${format}')`;

    // The batch count is taken from its own builder: adding a GROUP BY below
    // would otherwise turn the total into one row per group.
    const totalBatches = await qb.clone().select('COUNT(DISTINCT b.id)', 'n').getRawOne<{ n: string }>();

    const raw = await qb
      .select(period, 'period')
      .addSelect('b.site_id', 'siteId')
      .addSelect('s.name', 'siteName')
      .addSelect('o.brick_type_id', 'brickTypeId')
      .addSelect('bt.grade', 'grade')
      .addSelect('SUM(o.quantity)', 'goodBricks')
      .addSelect('COUNT(DISTINCT b.id)', 'batchCount')
      // Grouped and ordered by the expression, not the alias: Postgres resolves
      // an output name in GROUP BY only in limited positions, and TypeORM's
      // escaping pushed this one outside them.
      .groupBy(period)
      .addGroupBy('b.site_id')
      .addGroupBy('s.name')
      .addGroupBy('o.brick_type_id')
      .addGroupBy('bt.grade')
      .orderBy(period, 'DESC')
      .addOrderBy('s.name', 'ASC')
      .addOrderBy('bt.grade', 'ASC')
      .getRawMany<{
        period: string;
        siteId: string;
        siteName: string;
        brickTypeId: string;
        grade: string;
        goodBricks: string;
        batchCount: string;
      }>();

    const rows: ProductionReportRow[] = raw.map((r) => ({
      period: r.period,
      siteId: r.siteId,
      siteName: r.siteName,
      brickTypeId: r.brickTypeId,
      grade: r.grade,
      goodBricks: new Decimal(r.goodBricks ?? 0).toFixed(3),
      batchCount: Number(r.batchCount ?? 0),
    }));

    const goodBricks = rows.reduce((acc, r) => acc.plus(r.goodBricks), new Decimal(0)).toFixed(3);
    // Distinct across the whole window — summing the per-row counts would
    // double-count a batch that produced more than one grade.
    return { rows, totals: { goodBricks, batchCount: Number(totalBatches?.n ?? 0) } };
  }

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
      // Keyed by site too: `chamber` is a free-text label unique only within a
      // kiln, so two kilns both calling one "Chamber 1" were merged into a
      // single row and attributed to whichever happened to be seen first.
      return this.aggregate(
        filtered,
        (row) => `${row.batch.siteId}|${row.batch.chamber}`,
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

    // Batches with no named Sardar get their own bucket rather than vanishing.
    // Dropping them silently made the gang view fail to reconcile with the
    // batch view, and unattributed production is exactly where a loss would
    // be parked.
    const UNASSIGNED = '(unassigned)';
    return this.aggregate(
      filtered,
      (row) => row.making?.sardarPartyId ?? UNASSIGNED,
      (sample) => {
        const id = sample.making?.sardarPartyId ?? null;
        return {
          siteId: null,
          chamber: null,
          sardarPartyId: id,
          label: id ? (sardarName.get(id) ?? '(unknown Sardar)') : 'No Sardar recorded',
        };
      },
    );
  }

  /**
   * LEK-02 — fuel consumed per 1,000 bricks fired, within one date window,
   * for one explicitly-named fuel item. Grouping chooses the comparison frame:
   * `batch` compares every batch, `kiln` sums per site, `month` sums per
   * calendar month. The outlier flag is the median within the frame — a
   * threshold on the mean would be pulled around by the outlier itself.
   */
  async fuelVariance(companyId: string, query: FuelVarianceQueryDto): Promise<FuelVarianceRow[]> {
    const item = await this.itemRepo.findOne({ where: { id: query.itemId, companyId } });
    if (!item) {
      throw new BusinessRuleException(
        'PRODUCTION_FUEL_ITEM_NOT_FOUND',
        'That fuel item does not exist in this company',
      );
    }

    // The window is on the FIRING date, not the batch date: the coal burns when
    // the chamber is fired, which can be weeks after the batch was loaded. On
    // batch_date a batch loaded 28 Sep and fired 3 Oct filed its October coal
    // under September and vanished from the October report entirely.
    const batchFilter = this.batchRepo
      .createQueryBuilder('b')
      .where('b.company_id = :companyId', { companyId })
      .andWhere('b.deleted_at IS NULL');
    if (query.siteId) batchFilter.andWhere('b.site_id = :siteId', { siteId: query.siteId });
    const batches = await batchFilter.getMany();
    if (batches.length === 0) return [];
    const batchIds = batches.map((b) => b.id);

    // Firing stage entries carry the fired count. A batch that was opened but
    // never fired has nothing to show here, so it drops out of the join below.
    const firingEntries = await this.entryRepo
      .createQueryBuilder('e')
      .where('e.company_id = :companyId', { companyId })
      .andWhere('e.deleted_at IS NULL')
      .andWhere('e.stage = :stage', { stage: 'firing' })
      .andWhere('e.entry_date BETWEEN :from AND :to', { from: query.from, to: query.to })
      .andWhere('e.batch_id IN (:...batchIds)', { batchIds })
      .getMany();
    if (firingEntries.length === 0) return [];
    const firingEntryIds = firingEntries.map((e) => e.id);
    const firingByBatch = new Map(firingEntries.map((e) => [e.batchId, e]));

    const consumptionRows = await this.consumptionRepo
      .createQueryBuilder('c')
      .where('c.company_id = :companyId', { companyId })
      .andWhere('c.deleted_at IS NULL')
      .andWhere('c.item_id = :itemId', { itemId: query.itemId })
      .andWhere('c.entry_id IN (:...entryIds)', { entryIds: firingEntryIds })
      .select(['c.entry_id as "entryId"', 'SUM(c.quantity) as "quantity"'])
      .groupBy('c.entry_id')
      .getRawMany<{ entryId: string; quantity: string }>();
    const fuelByEntry = new Map(consumptionRows.map((r) => [r.entryId, r.quantity ?? '0']));

    // One record per batch, built from the firing entry.
    const perBatch = batches
      .map((batch) => {
        const firing = firingByBatch.get(batch.id);
        if (!firing) return null;
        const fired = new Decimal(firing.firedBricks ?? 0);
        const booked = fuelByEntry.get(firing.id);
        return {
          batch,
          fired,
          fuel: new Decimal(booked ?? 0),
          // Absent is not zero. Kept apart so a missing row cannot pose as frugality.
          fuelRecorded: booked !== undefined,
          firedDate: firing.entryDate,
        };
      })
      .filter((row): row is FuelBatchRow => row !== null);

    // Site names, for the kiln grouping's label.
    const siteIds = Array.from(new Set(perBatch.map((r) => r.batch.siteId)));
    const sites = siteIds.length
      ? await this.siteRepo
          .createQueryBuilder('s')
          .where('s.company_id = :companyId', { companyId })
          .andWhere('s.id IN (:...ids)', { ids: siteIds })
          .getMany()
      : [];
    const siteName = new Map(sites.map((s) => [s.id, s.name]));

    let rows: FuelVarianceRow[];
    if (query.groupBy === 'batch') {
      rows = perBatch.map((r) => this.fuelRowForBatch(r));
    } else if (query.groupBy === 'kiln') {
      rows = this.aggregateFuel(
        perBatch,
        (r) => r.batch.siteId,
        (sample) => ({
          siteId: sample.batch.siteId,
          chamber: null,
          periodMonth: null,
          label: siteName.get(sample.batch.siteId) ?? '(unknown kiln)',
        }),
      );
    } else {
      // 'month' — YYYY-MM of the FIRING date, which is when the fuel was burned.
      rows = this.aggregateFuel(
        perBatch,
        (r) => r.firedDate.slice(0, 7),
        (sample) => ({
          siteId: null,
          chamber: null,
          periodMonth: sample.firedDate.slice(0, 7),
          label: sample.firedDate.slice(0, 7),
        }),
      );
    }

    this.flagFuelOutliers(rows);
    return rows;
  }

  private fuelRowForBatch(row: FuelBatchRow): FuelVarianceRow {
    const measurable = !row.fired.isZero() && row.fuelRecorded;
    return {
      groupId: row.batch.id,
      groupLabel: `${row.batch.chamber} · ${row.batch.batchDate}`,
      siteId: row.batch.siteId,
      chamber: row.batch.chamber,
      periodMonth: null,
      firedTotal: row.fired.toFixed(3),
      fuelConsumed: row.fuel.toFixed(3),
      ratio: measurable ? row.fuel.div(row.fired).mul(1000).toFixed(3) : null,
      fuelRecorded: row.fuelRecorded,
      direction: null,
      isOutlier: false,
    };
  }

  private aggregateFuel<K extends string>(
    rows: FuelBatchRow[],
    keyOf: (r: FuelBatchRow) => K,
    labelFrom: (sample: FuelBatchRow) => {
      siteId: string | null;
      chamber: string | null;
      periodMonth: string | null;
      label: string;
    },
  ): FuelVarianceRow[] {
    const buckets = new Map<
      K,
      { sample: FuelBatchRow; fired: Decimal; fuel: Decimal; recordedFired: Decimal; anyRecorded: boolean }
    >();
    for (const row of rows) {
      const key = keyOf(row);
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = {
          sample: row,
          fired: new Decimal(0),
          fuel: new Decimal(0),
          recordedFired: new Decimal(0),
          anyRecorded: false,
        };
        buckets.set(key, bucket);
      }
      bucket.fired = bucket.fired.plus(row.fired);
      bucket.fuel = bucket.fuel.plus(row.fuel);
      if (row.fuelRecorded) {
        // The ratio divides by the bricks whose fuel we actually know, so a
        // batch with no coal booked cannot dilute the group's figure.
        bucket.recordedFired = bucket.recordedFired.plus(row.fired);
        bucket.anyRecorded = true;
      }
    }
    const out: FuelVarianceRow[] = [];
    for (const [key, b] of buckets) {
      const label = labelFrom(b.sample);
      const measurable = b.anyRecorded && !b.recordedFired.isZero();
      out.push({
        groupId: String(key),
        groupLabel: label.label,
        siteId: label.siteId,
        chamber: label.chamber,
        periodMonth: label.periodMonth,
        firedTotal: b.fired.toFixed(3),
        fuelConsumed: b.fuel.toFixed(3),
        ratio: measurable ? b.fuel.div(b.recordedFired).mul(1000).toFixed(3) : null,
        fuelRecorded: b.anyRecorded,
        direction: null,
        isOutlier: false,
      });
    }
    return out;
  }

  /** ±15 % from the median ratio. Median not mean, so the outlier can't skew its own threshold. */
  /**
   * Flags a group whose fuel-per-1,000 sits more than 15 % from the median.
   *
   * Needs at least `MIN_SAMPLE` comparable rows. Two is the broken case: the
   * "median" of two values is their mean, so both rows sit equidistant from it
   * and the flag is all-or-nothing — a 20 % gap between two batches passed
   * silently, while a 36 % gap flagged the **efficient** batch alongside the
   * wasteful one. Three is the smallest sample where the median lands on an
   * actual observation, which is what makes the comparison mean something.
   *
   * Rows with no fuel booked carry `ratio: null` and are excluded here — they
   * are a missing data-entry row, not a frugal kiln, and letting them in
   * re-based the threshold for everyone else.
   */
  private flagFuelOutliers(rows: FuelVarianceRow[]): void {
    const MIN_SAMPLE = 3;
    const ratios = rows
      .map((r) => (r.ratio == null ? null : new Decimal(r.ratio)))
      .filter((d): d is Decimal => d !== null)
      .sort((a, b) => a.comparedTo(b));
    if (ratios.length < MIN_SAMPLE) return;

    const mid = Math.floor(ratios.length / 2);
    const lower = ratios[mid - 1]!;
    const upper = ratios[mid]!;
    const median = ratios.length % 2 === 0 ? lower.plus(upper).div(2) : upper;
    if (median.isZero()) return;

    const threshold = new Decimal('0.15');
    for (const row of rows) {
      if (row.ratio == null) continue;
      const r = new Decimal(row.ratio);
      const drift = r.minus(median).abs().div(median);
      if (drift.greaterThan(threshold)) {
        row.isOutlier = true;
        // Which way it drifts is the actionable part: over-consumption is fuel
        // going missing, under-consumption usually means coal booked elsewhere.
        row.direction = r.greaterThan(median) ? 'over' : 'under';
      }
    }
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
    const sorted = row.sorting !== null;
    const accounted = good.plus(broken).plus(rejects);
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
      unexplained: sorted ? green.minus(accounted).toFixed(3) : null,
      sortingComplete: sorted,
      batchCount: 1,
      pendingSortCount: sorted ? 0 : 1,
      preFiringLoss: green.minus(fired).toFixed(3),
      postFiringLoss: sorted ? fired.minus(accounted).toFixed(3) : null,
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
        batchCount: number;
        pendingSortCount: number;
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
          batchCount: 0,
          pendingSortCount: 0,
        };
        buckets.set(key, bucket);
      }
      const green = new Decimal(row.making?.greenBricks ?? 0);
      const fired = new Decimal(row.firing?.firedBricks ?? 0);
      bucket.green = bucket.green.plus(green);
      bucket.fired = bucket.fired.plus(fired);
      bucket.good = bucket.good.plus(row.goodTotal);
      bucket.broken = bucket.broken.plus(row.sorting?.brokenBricks ?? 0);
      bucket.rejects = bucket.rejects.plus(row.sorting?.rejectBricks ?? 0);
      bucket.batchCount += 1;
      // A group's loss is only meaningful once every batch in it has been
      // sorted, so the count of stragglers is what decides whether to report
      // a figure at all.
      if (!row.sorting) bucket.pendingSortCount += 1;
    }
    const out: YieldVarianceRow[] = [];
    for (const [key, b] of buckets) {
      const label = labelFrom(b.sample);
      // Every batch in the group must be sorted before a group loss means anything.
      const complete = b.pendingSortCount === 0;
      const accounted = b.good.plus(b.broken).plus(b.rejects);
      const unexplained = complete ? b.green.minus(accounted).toFixed(3) : null;
      const postFiringLoss = complete ? b.fired.minus(accounted).toFixed(3) : null;
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
        unexplained,
        sortingComplete: complete,
        batchCount: b.batchCount,
        pendingSortCount: b.pendingSortCount,
        preFiringLoss: b.green.minus(b.fired).toFixed(3),
        postFiringLoss,
      });
    }
    return out;
  }
}
