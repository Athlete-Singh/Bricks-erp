import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import Decimal from 'decimal.js';
import { EntityManager } from 'typeorm';
import type { GstPeriodDto, GstRegisterQueryDto } from '@brics/shared';
import { BusinessRuleException } from '../../common/exceptions/business-rule.exception';

Decimal.set({ precision: 30, rounding: Decimal.ROUND_HALF_UP });

const money = (v: Decimal.Value): string => new Decimal(v).toFixed(2);
const qty = (v: Decimal.Value): string => new Decimal(v).toFixed(3);

/** First and last calendar day of a `YYYY-MM` month. */
function monthWindow(month: string): { fromDate: string; toDate: string } {
  const [year, mon] = month.split('-').map(Number) as [number, number];
  const last = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  return { fromDate: `${month}-01`, toDate: `${month}-${String(last).padStart(2, '0')}` };
}

@Injectable()
export class GstService {
  constructor(@InjectEntityManager() private readonly em: EntityManager) {}

  private siteFilter(params: unknown[], siteId: string | undefined, alias: string): string {
    if (!siteId) return '';
    params.push(siteId);
    return ` AND ${alias}."site_id" = $${params.length}`;
  }

  // ── GST-04 GSTR-1 register ─────────────────────────────────────────────────

  /**
   * Outward supplies for a month, split the way GSTR-1 asks for them.
   *
   * **B2B** is every invoice to a customer who has a GSTIN; **B2C** is the
   * rest. The split is on the customer's GSTIN at the time of reading, which
   * is how the portal treats it — a customer who registers later does not
   * retrospectively move last month's invoices.
   */
  async gstr1(companyId: string, dto: GstPeriodDto) {
    const { fromDate, toDate } = monthWindow(dto.month);
    const params: unknown[] = [companyId, fromDate, toDate];
    const site = this.siteFilter(params, dto.siteId, 'si');

    const invoices = await this.em.query<
      {
        invoice_id: string;
        invoice_no: string;
        invoice_date: string;
        customer_name: string;
        gstin: string | null;
        state_code: string | null;
        taxable: string;
        cgst: string;
        sgst: string;
        igst: string;
        total: string;
      }[]
    >(
      `
      SELECT
        si."id" AS invoice_id,
        si."invoice_no",
        si."invoice_date"::text AS invoice_date,
        p."name" AS customer_name,
        p."gstin",
        p."state_code",
        si."taxable_amount"::text AS taxable,
        si."cgst_amount"::text AS cgst,
        si."sgst_amount"::text AS sgst,
        si."igst_amount"::text AS igst,
        si."total_amount"::text AS total
      FROM "sales_invoices" si
      JOIN "parties" p ON p."id" = si."customer_party_id"
      WHERE si."company_id" = $1 AND si."deleted_at" IS NULL
        AND si."status" <> 'cancelled'
        AND si."invoice_date" BETWEEN $2 AND $3${site}
      ORDER BY si."invoice_date", si."invoice_no"
      `,
      params,
    );

    const hsnParams: unknown[] = [companyId, fromDate, toDate];
    const hsnSite = this.siteFilter(hsnParams, dto.siteId, 'si');
    const hsn = await this.em.query<
      {
        hsn_code: string | null;
        description: string;
        quantity: string;
        taxable: string;
        cgst: string;
        sgst: string;
        igst: string;
      }[]
    >(
      `
      SELECT
        COALESCE(sil."hsn_code", '(none)') AS hsn_code,
        MIN(i."name") AS description,
        SUM(sil."quantity")::text AS quantity,
        SUM(sil."taxable_amount")::text AS taxable,
        SUM(sil."cgst_amount")::text AS cgst,
        SUM(sil."sgst_amount")::text AS sgst,
        SUM(sil."igst_amount")::text AS igst
      FROM "sales_invoice_lines" sil
      JOIN "sales_invoices" si ON si."id" = sil."sales_invoice_id"
      JOIN "items" i ON i."id" = sil."item_id"
      WHERE sil."company_id" = $1 AND sil."deleted_at" IS NULL AND si."deleted_at" IS NULL
        AND si."status" <> 'cancelled'
        AND si."invoice_date" BETWEEN $2 AND $3${hsnSite}
      GROUP BY COALESCE(sil."hsn_code", '(none)')
      ORDER BY 1
      `,
      hsnParams,
    );

    const noteParams: unknown[] = [companyId, fromDate, toDate];
    const noteSite = this.siteFilter(noteParams, dto.siteId, 'cn');
    const creditNotes = await this.em.query<
      { note_no: string; note_date: string; customer_name: string; taxable: string; tax: string; total: string }[]
    >(
      `
      SELECT cn."note_no", cn."note_date"::text AS note_date, p."name" AS customer_name,
             cn."taxable_amount"::text AS taxable, cn."tax_amount"::text AS tax, cn."total_amount"::text AS total
      FROM "credit_notes" cn
      JOIN "parties" p ON p."id" = cn."customer_party_id"
      WHERE cn."company_id" = $1 AND cn."deleted_at" IS NULL
        AND cn."note_date" BETWEEN $2 AND $3${noteSite}
      ORDER BY cn."note_date", cn."note_no"
      `,
      noteParams,
    );

    const toLine = (r: (typeof invoices)[number]) => ({
      invoiceId: r.invoice_id,
      invoiceNo: r.invoice_no,
      invoiceDate: r.invoice_date,
      customerName: r.customer_name,
      gstin: r.gstin,
      stateCode: r.state_code,
      taxableAmount: money(r.taxable),
      cgstAmount: money(r.cgst),
      sgstAmount: money(r.sgst),
      igstAmount: money(r.igst),
      totalAmount: money(r.total),
    });

    const b2b = invoices.filter((r) => r.gstin).map(toLine);
    const b2c = invoices.filter((r) => !r.gstin).map(toLine);

    const sum = (rows: ReturnType<typeof toLine>[], pick: (r: ReturnType<typeof toLine>) => string) =>
      money(rows.reduce((a, r) => a.plus(pick(r)), new Decimal(0)));

    return {
      items: [],
      meta: {
        month: dto.month,
        fromDate,
        toDate,
        b2b,
        b2c,
        hsnSummary: hsn.map((h) => ({
          hsnCode: h.hsn_code,
          description: h.description,
          quantity: qty(h.quantity),
          taxableAmount: money(h.taxable),
          cgstAmount: money(h.cgst),
          sgstAmount: money(h.sgst),
          igstAmount: money(h.igst),
        })),
        creditNotes: creditNotes.map((n) => ({
          noteNo: n.note_no,
          noteDate: n.note_date,
          customerName: n.customer_name,
          taxableAmount: money(n.taxable),
          taxAmount: money(n.tax),
          totalAmount: money(n.total),
        })),
        totals: {
          b2bCount: b2b.length,
          b2cCount: b2c.length,
          taxableAmount: money(
            new Decimal(sum(b2b, (r) => r.taxableAmount)).plus(sum(b2c, (r) => r.taxableAmount)),
          ),
          cgstAmount: money(new Decimal(sum(b2b, (r) => r.cgstAmount)).plus(sum(b2c, (r) => r.cgstAmount))),
          sgstAmount: money(new Decimal(sum(b2b, (r) => r.sgstAmount)).plus(sum(b2c, (r) => r.sgstAmount))),
          igstAmount: money(new Decimal(sum(b2b, (r) => r.igstAmount)).plus(sum(b2c, (r) => r.igstAmount))),
          creditNoteTax: money(creditNotes.reduce((a, n) => a.plus(n.tax), new Decimal(0))),
        },
      },
    };
  }

  /**
   * GST-04's export. CSV rather than a binary workbook: it opens in Excel and
   * in the accountant's own tooling, it is diffable, and it needs no dependency
   * whose output nobody can read without the app.
   */
  async gstr1Csv(companyId: string, dto: GstPeriodDto): Promise<string> {
    const report = await this.gstr1(companyId, dto);
    const { b2b, b2c, hsnSummary } = report.meta;

    const esc = (v: string | null) => {
      const text = v ?? '';
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const rows: string[] = [];

    rows.push(`GSTR-1 register,${esc(dto.month)}`);
    rows.push('');
    rows.push('Section,Invoice no,Date,Customer,GSTIN,State,Taxable,CGST,SGST,IGST,Total');
    for (const [section, lines] of [
      ['B2B', b2b],
      ['B2C', b2c],
    ] as const) {
      for (const l of lines) {
        rows.push(
          [
            section,
            esc(l.invoiceNo),
            l.invoiceDate,
            esc(l.customerName),
            esc(l.gstin),
            esc(l.stateCode),
            l.taxableAmount,
            l.cgstAmount,
            l.sgstAmount,
            l.igstAmount,
            l.totalAmount,
          ].join(','),
        );
      }
    }
    rows.push('');
    rows.push('HSN summary');
    rows.push('HSN,Description,Quantity,Taxable,CGST,SGST,IGST');
    for (const h of hsnSummary) {
      rows.push(
        [
          esc(h.hsnCode),
          esc(h.description),
          h.quantity,
          h.taxableAmount,
          h.cgstAmount,
          h.sgstAmount,
          h.igstAmount,
        ].join(','),
      );
    }
    return rows.join('\n');
  }

  // ── GST-05 GSTR-3B summary ─────────────────────────────────────────────────

  /**
   * Output tax less input tax for the month, which is what 3B asks for in one
   * line each. Credit and debit notes move the output side; purchase returns
   * move the input side.
   */
  async gstr3b(companyId: string, dto: GstPeriodDto) {
    const { fromDate, toDate } = monthWindow(dto.month);

    const one = async (sql: string, params: unknown[]) => {
      const rows = await this.em.query<{ taxable: string; cgst: string; sgst: string; igst: string }[]>(sql, params);
      const r = rows[0] ?? { taxable: '0', cgst: '0', sgst: '0', igst: '0' };
      return {
        taxableAmount: money(r.taxable),
        cgstAmount: money(r.cgst),
        sgstAmount: money(r.sgst),
        igstAmount: money(r.igst),
      };
    };

    const outward = await one(
      `SELECT COALESCE(SUM("taxable_amount"),0)::text AS taxable, COALESCE(SUM("cgst_amount"),0)::text AS cgst,
              COALESCE(SUM("sgst_amount"),0)::text AS sgst, COALESCE(SUM("igst_amount"),0)::text AS igst
         FROM "sales_invoices"
        WHERE "company_id" = $1 AND "deleted_at" IS NULL AND "status" <> 'cancelled'
          AND "invoice_date" BETWEEN $2 AND $3`,
      [companyId, fromDate, toDate],
    );

    const inward = await one(
      `SELECT COALESCE(SUM("taxable_amount"),0)::text AS taxable, COALESCE(SUM("cgst_amount"),0)::text AS cgst,
              COALESCE(SUM("sgst_amount"),0)::text AS sgst, COALESCE(SUM("igst_amount"),0)::text AS igst
         FROM "purchase_bills"
        WHERE "company_id" = $1 AND "deleted_at" IS NULL
          AND "bill_date" BETWEEN $2 AND $3`,
      [companyId, fromDate, toDate],
    );

    const creditNotes = await this.em.query<{ taxable: string; tax: string }[]>(
      `SELECT COALESCE(SUM("taxable_amount"),0)::text AS taxable, COALESCE(SUM("tax_amount"),0)::text AS tax
         FROM "credit_notes"
        WHERE "company_id" = $1 AND "deleted_at" IS NULL AND "note_date" BETWEEN $2 AND $3`,
      [companyId, fromDate, toDate],
    );
    const purchaseReturns = await this.em.query<{ taxable: string; tax: string }[]>(
      `SELECT COALESCE(SUM("taxable_amount"),0)::text AS taxable, COALESCE(SUM("tax_amount"),0)::text AS tax
         FROM "purchase_returns"
        WHERE "company_id" = $1 AND "deleted_at" IS NULL AND "return_date" BETWEEN $2 AND $3`,
      [companyId, fromDate, toDate],
    );

    const outputTax = new Decimal(outward.cgstAmount)
      .plus(outward.sgstAmount)
      .plus(outward.igstAmount)
      .minus(creditNotes[0]?.tax ?? 0);
    const inputCredit = new Decimal(inward.cgstAmount)
      .plus(inward.sgstAmount)
      .plus(inward.igstAmount)
      .minus(purchaseReturns[0]?.tax ?? 0);
    const payable = outputTax.minus(inputCredit);

    return {
      items: [],
      meta: {
        month: dto.month,
        fromDate,
        toDate,
        outwardSupplies: outward,
        inwardSupplies: inward,
        creditNotes: { taxableAmount: money(creditNotes[0]?.taxable ?? 0), taxAmount: money(creditNotes[0]?.tax ?? 0) },
        purchaseReturns: {
          taxableAmount: money(purchaseReturns[0]?.taxable ?? 0),
          taxAmount: money(purchaseReturns[0]?.tax ?? 0),
        },
        totals: {
          outputTax: money(outputTax),
          inputCredit: money(inputCredit),
          /** Positive is payable to the department; negative carries forward. */
          netPayable: money(payable),
        },
      },
    };
  }

  // ── GST-06 sales and purchase GST reports ──────────────────────────────────

  async taxRegister(companyId: string, kind: 'sales' | 'purchase', query: GstRegisterQueryDto) {
    if (query.toDate < query.fromDate) {
      throw new BusinessRuleException('DATE_RANGE_INVALID', 'The end of the window is before its start');
    }

    const sql =
      kind === 'sales'
        ? `
        SELECT si."invoice_no" AS doc_no, si."invoice_date"::text AS doc_date, p."name" AS party_name, p."gstin",
               si."taxable_amount"::text AS taxable, si."cgst_amount"::text AS cgst,
               si."sgst_amount"::text AS sgst, si."igst_amount"::text AS igst, si."total_amount"::text AS total
          FROM "sales_invoices" si JOIN "parties" p ON p."id" = si."customer_party_id"
         WHERE si."company_id" = $1 AND si."deleted_at" IS NULL AND si."status" <> 'cancelled'
           AND si."invoice_date" BETWEEN $2 AND $3
         ORDER BY si."invoice_date", si."invoice_no"`
        : `
        SELECT pb."supplier_invoice_no" AS doc_no, pb."bill_date"::text AS doc_date, p."name" AS party_name, p."gstin",
               pb."taxable_amount"::text AS taxable, pb."cgst_amount"::text AS cgst,
               pb."sgst_amount"::text AS sgst, pb."igst_amount"::text AS igst, pb."total_amount"::text AS total
          FROM "purchase_bills" pb JOIN "parties" p ON p."id" = pb."supplier_party_id"
         WHERE pb."company_id" = $1 AND pb."deleted_at" IS NULL
           AND pb."bill_date" BETWEEN $2 AND $3
         ORDER BY pb."bill_date", pb."supplier_invoice_no"`;

    const rows = await this.em.query<
      {
        doc_no: string;
        doc_date: string;
        party_name: string;
        gstin: string | null;
        taxable: string;
        cgst: string;
        sgst: string;
        igst: string;
        total: string;
      }[]
    >(sql, [companyId, query.fromDate, query.toDate]);

    const items = rows.map((r) => ({
      documentNo: r.doc_no,
      documentDate: r.doc_date,
      partyName: r.party_name,
      gstin: r.gstin,
      taxableAmount: money(r.taxable),
      cgstAmount: money(r.cgst),
      sgstAmount: money(r.sgst),
      igstAmount: money(r.igst),
      totalAmount: money(r.total),
    }));

    const sum = (pick: (r: (typeof items)[number]) => string) =>
      money(items.reduce((a, r) => a.plus(pick(r)), new Decimal(0)));

    return {
      items,
      meta: {
        kind,
        fromDate: query.fromDate,
        toDate: query.toDate,
        documentCount: items.length,
        taxableAmount: sum((r) => r.taxableAmount),
        cgstAmount: sum((r) => r.cgstAmount),
        sgstAmount: sum((r) => r.sgstAmount),
        igstAmount: sum((r) => r.igstAmount),
        totalAmount: sum((r) => r.totalAmount),
      },
    };
  }

  // ── GST-07 reconciliation ──────────────────────────────────────────────────

  /**
   * The registers against the books.
   *
   * GSTR-1 is built from the sales invoices; the books hold the same tax on the
   * `OUTPUT_*` ledgers. If those two disagree, either a journal was posted by
   * hand or an invoice is missing from the register — and the client named
   * "delayed GST reconciliation" as a problem BRICS exists to solve, so the
   * answer has to be a list of differences rather than a single number.
   */
  async reconciliation(companyId: string, dto: GstPeriodDto) {
    const { fromDate, toDate } = monthWindow(dto.month);

    const ledgerTax = async (codes: string[]) => {
      const rows = await this.em.query<{ code: string; debit: string; credit: string }[]>(
        `
        SELECT l."code",
               COALESCE(SUM(CASE WHEN v."id" IS NOT NULL THEN vl."debit" ELSE 0 END), 0)::text AS debit,
               COALESCE(SUM(CASE WHEN v."id" IS NOT NULL THEN vl."credit" ELSE 0 END), 0)::text AS credit
          FROM "ledgers" l
          LEFT JOIN "voucher_lines" vl ON vl."ledger_id" = l."id" AND vl."deleted_at" IS NULL
          LEFT JOIN "vouchers" v ON v."id" = vl."voucher_id" AND v."deleted_at" IS NULL
            AND v."voucher_date" BETWEEN $3 AND $4
         WHERE l."company_id" = $1 AND l."code" = ANY($2) AND l."deleted_at" IS NULL
         GROUP BY l."code"
        `,
        [companyId, codes, fromDate, toDate],
      );
      const byCode = new Map(rows.map((r) => [r.code, r]));
      return (code: string) => {
        const row = byCode.get(code);
        if (!row) return new Decimal(0);
        // Output GST is a liability (credit); input GST is an asset (debit).
        return code.startsWith('OUTPUT')
          ? new Decimal(row.credit).minus(row.debit)
          : new Decimal(row.debit).minus(row.credit);
      };
    };

    const tax = await ledgerTax(['OUTPUT_CGST', 'OUTPUT_SGST', 'OUTPUT_IGST', 'INPUT_CGST', 'INPUT_SGST', 'INPUT_IGST']);
    const register = await this.gstr1(companyId, dto);
    const summary = await this.gstr3b(companyId, dto);

    const compare = (label: string, perRegister: Decimal.Value, perBooks: Decimal.Value) => {
      const register = new Decimal(perRegister);
      const books = new Decimal(perBooks);
      const difference = register.minus(books);
      return {
        label,
        perRegister: money(register),
        perBooks: money(books),
        difference: money(difference),
        matches: difference.isZero(),
      };
    };

    const lines = [
      compare('Output CGST', register.meta.totals.cgstAmount, tax('OUTPUT_CGST')),
      compare('Output SGST', register.meta.totals.sgstAmount, tax('OUTPUT_SGST')),
      compare('Output IGST', register.meta.totals.igstAmount, tax('OUTPUT_IGST')),
      compare('Input CGST', summary.meta.inwardSupplies.cgstAmount, tax('INPUT_CGST')),
      compare('Input SGST', summary.meta.inwardSupplies.sgstAmount, tax('INPUT_SGST')),
      compare('Input IGST', summary.meta.inwardSupplies.igstAmount, tax('INPUT_IGST')),
    ];

    // An invoice with no HSN cannot be filed — the portal rejects the row.
    const missingHsn = register.meta.hsnSummary.filter((h) => h.hsnCode === '(none)');
    const mismatched = lines.filter((l) => !l.matches);

    return {
      items: lines,
      meta: {
        month: dto.month,
        fromDate,
        toDate,
        mismatchCount: mismatched.length,
        /** Rows the portal will refuse, listed so they can be fixed before filing. */
        invoicesMissingHsn: missingHsn.length,
        missingHsnTaxable: money(missingHsn.reduce((a, h) => a.plus(h.taxableAmount), new Decimal(0))),
        clean: mismatched.length === 0 && missingHsn.length === 0,
      },
    };
  }
}
