import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import PdfPrinter from 'pdfmake';
import type { TDocumentDefinitions, Content, TableCell, TFontDictionary } from 'pdfmake/interfaces';
import { EntityManager, In } from 'typeorm';

/**
 * pdfmake ships Roboto base-64 encoded in `build/vfs_fonts.js`. The export
 * shape varies across versions: 0.2.x uses a flat `{ [filename]: base64 }` map;
 * older releases wrapped it under `pdfMake.vfs`. Try both and give a usable
 * error if neither is there. Called once at construction — never on the hot path.
 */
type VfsFlat = Record<string, string>;
interface VfsWrapped {
  pdfMake?: { vfs?: VfsFlat };
  default?: { pdfMake?: { vfs?: VfsFlat } };
}
function loadRobotoFonts(): TFontDictionary {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const vfsModule = require('pdfmake/build/vfs_fonts') as VfsFlat & VfsWrapped;
  const vfs: VfsFlat =
    vfsModule.pdfMake?.vfs ??
    vfsModule.default?.pdfMake?.vfs ??
    // 0.2.x — the module itself is the map.
    (typeof vfsModule === 'object' ? (vfsModule as VfsFlat) : ({} as VfsFlat));
  const getFont = (name: string): Buffer => {
    const b64 = vfs[name];
    if (!b64) throw new Error(`pdfmake vfs is missing font ${name}`);
    return Buffer.from(b64, 'base64');
  };
  return {
    Roboto: {
      normal: getFont('Roboto-Regular.ttf'),
      bold: getFont('Roboto-Medium.ttf'),
      italics: getFont('Roboto-Italic.ttf'),
      bolditalics: getFont('Roboto-MediumItalic.ttf'),
    },
  };
}
import { Company } from '../../company/entities/company.entity';
import { Site } from '../../company/entities/site.entity';
import { Party } from '../../parties/entities/party.entity';
import { Item } from '../../inventory/entities/item.entity';
import { SalesInvoice } from '../entities/sales-invoice.entity';
import { SalesInvoiceLine } from '../entities/sales-invoice-line.entity';
import { SalesCharge } from '../entities/sales-charge.entity';
import { amountInWords } from './amount-in-words';

/**
 * SAL-04 — the A4 GST-compliant invoice PDF.
 *
 * Rule 46 of the CGST Rules fixes the shape: supplier and recipient details
 * (name, address, GSTIN, state code), invoice number, date, HSN per item,
 * taxable value, CGST/SGST/IGST per line, and the amount in words. This
 * renders exactly that, no more and no less, with `pdfmake` on the backend
 * so the same bytes are produced regardless of client (OQ #18).
 *
 * Uses pdfmake's built-in Roboto font — the dependency ships with it, so no
 * extra assets are needed to produce a deterministic PDF.
 */
@Injectable()
export class InvoicePdfService {
  private readonly printer: InstanceType<typeof PdfPrinter>;

  constructor(@InjectEntityManager() private readonly em: EntityManager) {
    this.printer = new PdfPrinter(loadRobotoFonts());
  }

  async render(companyId: string, invoiceId: string): Promise<Buffer> {
    const invoice = await this.em.findOne(SalesInvoice, { where: { id: invoiceId, companyId } });
    if (!invoice) throw new NotFoundException('That invoice does not exist');

    const [company, site, customer, lines, charges] = await Promise.all([
      this.em.findOneOrFail(Company, { where: { id: companyId } }),
      this.em.findOne(Site, { where: { id: invoice.siteId, companyId } }),
      this.em.findOneOrFail(Party, { where: { id: invoice.customerPartyId, companyId } }),
      this.em.find(SalesInvoiceLine, { where: { salesInvoiceId: invoiceId, companyId } }),
      this.em.find(SalesCharge, { where: { parentType: 'sales_invoice', parentId: invoiceId, companyId } }),
    ]);
    const items = await this.em.find(Item, { where: { id: In(lines.map((l) => l.itemId)), companyId } });
    const itemById = new Map(items.map((i) => [i.id, i]));

    const doc = this.build(invoice, company, site, customer, lines, charges, itemById);
    const pdfDoc = this.printer.createPdfKitDocument(doc);
    const chunks: Buffer[] = [];
    return new Promise<Buffer>((resolve, reject) => {
      pdfDoc.on('data', (c) => chunks.push(c as Buffer));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);
      pdfDoc.end();
    });
  }

  private build(
    invoice: SalesInvoice,
    company: Company,
    site: Site | null,
    customer: Party,
    lines: SalesInvoiceLine[],
    charges: SalesCharge[],
    itemById: Map<string, Item>,
  ): TDocumentDefinitions {
    const sameState = Boolean(customer.stateCode && company.stateCode && customer.stateCode === company.stateCode);
    const rightStack: Content[] = [
      { text: 'TAX INVOICE', style: 'invoiceLabel' },
      { text: `Invoice No: ${invoice.invoiceNo}`, style: 'small' },
      { text: `Date: ${invoice.invoiceDate}`, style: 'small' },
    ];
    if (invoice.dueDate) rightStack.push({ text: `Due: ${invoice.dueDate}`, style: 'small' });
    if (invoice.customerPoNo) rightStack.push({ text: `Customer PO: ${invoice.customerPoNo}`, style: 'small' });
    if (site) rightStack.push({ text: `Kiln: ${site.name}`, style: 'small' });

    const header: Content = {
      columns: [
        {
          stack: [
            { text: company.name, style: 'companyName' },
            { text: company.address ?? '', style: 'small' },
            { text: company.gstin ? `GSTIN: ${company.gstin}` : '', style: 'small' },
            { text: company.pan ? `PAN: ${company.pan}` : '', style: 'small' },
            { text: company.stateCode ? `State Code: ${company.stateCode}` : '', style: 'small' },
          ],
          width: '*',
        },
        {
          stack: rightStack,
          width: 200,
          alignment: 'right',
        },
      ],
      margin: [0, 0, 0, 16],
    };

    const partyBlock: Content = {
      columns: [
        {
          stack: [
            { text: 'Bill To', style: 'label' },
            { text: customer.name, bold: true },
            { text: customer.address ?? '', style: 'small' },
            { text: customer.gstin ? `GSTIN: ${customer.gstin}` : '', style: 'small' },
            { text: customer.stateCode ? `State Code: ${customer.stateCode}` : '', style: 'small' },
            {
              text: `Place of Supply: ${customer.stateCode ?? '—'} (${sameState ? 'Intra-state' : 'Inter-state'})`,
              style: 'small',
            },
          ],
          width: '*',
        },
      ],
      margin: [0, 0, 0, 12],
    };

    const lineRows: TableCell[][] = [
      [
        { text: '#', style: 'th' },
        { text: 'Description', style: 'th' },
        { text: 'HSN', style: 'th' },
        { text: 'Qty', style: 'th', alignment: 'right' },
        { text: 'Rate', style: 'th', alignment: 'right' },
        { text: 'Disc', style: 'th', alignment: 'right' },
        { text: 'Taxable', style: 'th', alignment: 'right' },
        { text: sameState ? 'CGST' : 'IGST', style: 'th', alignment: 'right' },
        { text: sameState ? 'SGST' : '', style: 'th', alignment: 'right' },
        { text: 'Total', style: 'th', alignment: 'right' },
      ],
    ];
    lines.forEach((l, idx) => {
      const item = itemById.get(l.itemId);
      const lineTotal = (
        Number(l.taxableAmount) +
        Number(l.cgstAmount) +
        Number(l.sgstAmount) +
        Number(l.igstAmount)
      ).toFixed(2);
      lineRows.push([
        { text: String(idx + 1), style: 'td' },
        { text: `${item?.name ?? '—'}${l.description ? `\n${l.description}` : ''}`, style: 'td' },
        { text: l.hsnCode ?? '—', style: 'td' },
        { text: Number(l.quantity).toFixed(3), style: 'td', alignment: 'right' },
        { text: Number(l.rate).toFixed(2), style: 'td', alignment: 'right' },
        { text: Number(l.discount).toFixed(2), style: 'td', alignment: 'right' },
        { text: Number(l.taxableAmount).toFixed(2), style: 'td', alignment: 'right' },
        {
          text: sameState
            ? `${l.cgstRate}%\n${Number(l.cgstAmount).toFixed(2)}`
            : `${l.igstRate}%\n${Number(l.igstAmount).toFixed(2)}`,
          style: 'td',
          alignment: 'right',
        },
        {
          text: sameState ? `${l.sgstRate}%\n${Number(l.sgstAmount).toFixed(2)}` : '',
          style: 'td',
          alignment: 'right',
        },
        { text: lineTotal, style: 'td', alignment: 'right' },
      ]);
    });
    for (const c of charges) {
      const chargeTotal = (
        Number(c.amount) +
        Number(c.cgstAmount) +
        Number(c.sgstAmount) +
        Number(c.igstAmount)
      ).toFixed(2);
      lineRows.push([
        { text: '', style: 'td' },
        { text: `${c.label} (${c.kind})`, style: 'td', italics: true },
        { text: '', style: 'td' },
        { text: '', style: 'td' },
        { text: '', style: 'td' },
        { text: '', style: 'td' },
        { text: Number(c.amount).toFixed(2), style: 'td', alignment: 'right' },
        {
          text: sameState
            ? `${c.cgstRate}%\n${Number(c.cgstAmount).toFixed(2)}`
            : `${c.igstRate}%\n${Number(c.igstAmount).toFixed(2)}`,
          style: 'td',
          alignment: 'right',
        },
        {
          text: sameState ? `${c.sgstRate}%\n${Number(c.sgstAmount).toFixed(2)}` : '',
          style: 'td',
          alignment: 'right',
        },
        { text: chargeTotal, style: 'td', alignment: 'right' },
      ]);
    }

    const totalsBlock: Content = {
      columns: [
        { text: amountInWords(invoice.totalAmount), italics: true, width: '*', margin: [0, 10, 0, 0] },
        {
          table: {
            widths: ['*', 'auto'],
            body: [
              [
                { text: 'Taxable', style: 'tdBold', alignment: 'right' },
                { text: Number(invoice.taxableAmount).toFixed(2), alignment: 'right' },
              ],
              [
                { text: sameState ? 'CGST' : 'IGST', style: 'tdBold', alignment: 'right' },
                {
                  text: sameState ? Number(invoice.cgstAmount).toFixed(2) : Number(invoice.igstAmount).toFixed(2),
                  alignment: 'right',
                },
              ],
              sameState
                ? [
                    { text: 'SGST', style: 'tdBold', alignment: 'right' },
                    { text: Number(invoice.sgstAmount).toFixed(2), alignment: 'right' },
                  ]
                : [{ text: '', border: [false, false, false, false] }, { text: '' }],
              [
                { text: 'Total', style: 'tdBold', alignment: 'right' },
                { text: Number(invoice.totalAmount).toFixed(2), bold: true, alignment: 'right' },
              ],
            ],
          },
          width: 200,
          layout: 'lightHorizontalLines',
        },
      ],
    };

    return {
      pageSize: 'A4',
      pageMargins: [32, 32, 32, 48],
      content: [
        header,
        partyBlock,
        {
          table: {
            headerRows: 1,
            widths: [16, '*', 36, 40, 40, 36, 56, 48, 48, 56],
            body: lineRows,
          },
          layout: 'lightHorizontalLines',
        },
        totalsBlock,
        {
          text: invoice.notes ?? '',
          style: 'small',
          margin: [0, 16, 0, 0],
        },
        {
          columns: [
            { text: 'Received the goods in good condition.', style: 'small', margin: [0, 32, 0, 0] },
            {
              text: `For ${company.name}\n\n\nAuthorised Signatory`,
              alignment: 'right',
              margin: [0, 32, 0, 0],
            },
          ],
        },
      ],
      styles: {
        companyName: { fontSize: 16, bold: true, marginBottom: 2 },
        invoiceLabel: { fontSize: 14, bold: true, marginBottom: 4 },
        label: { fontSize: 9, color: '#666', marginBottom: 2 },
        small: { fontSize: 9, color: '#333' },
        th: { fontSize: 9, bold: true, fillColor: '#f3f3f3' },
        td: { fontSize: 9 },
        tdBold: { fontSize: 9, bold: true },
      },
      defaultStyle: { font: 'Roboto' },
    };
  }
}
