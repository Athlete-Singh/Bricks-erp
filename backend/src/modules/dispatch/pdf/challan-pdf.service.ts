import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import PdfPrinter from 'pdfmake';
import type { TDocumentDefinitions, Content, TableCell, TFontDictionary } from 'pdfmake/interfaces';
import { EntityManager, In } from 'typeorm';
import Decimal from 'decimal.js';

/**
 * pdfmake ships Roboto base-64 encoded in `build/vfs_fonts.js`; the export
 * shape varies across versions. Same loader the invoice PDF uses — see
 * `sales/pdf/invoice-pdf.service.ts` for the full note. Called once at
 * construction, never on the hot path.
 */
type VfsFlat = Record<string, string>;
interface VfsWrapped {
  pdfMake?: { vfs?: VfsFlat };
  default?: { pdfMake?: { vfs?: VfsFlat } };
}
function loadRobotoFonts(): TFontDictionary {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const vfsModule = require('pdfmake/build/vfs_fonts') as VfsFlat & VfsWrapped;
  const vfs: VfsFlat = vfsModule.pdfMake?.vfs ?? vfsModule.default?.pdfMake?.vfs ?? vfsModule;
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
import { Vehicle } from '../../transport/entities/vehicle.entity';
import { Driver } from '../../transport/entities/driver.entity';
import { SalesInvoice } from '../../sales/entities/sales-invoice.entity';
import { Dispatch } from '../entities/dispatch.entity';
import { DispatchLine } from '../entities/dispatch-line.entity';

/**
 * DSP-05 — the delivery challan the driver carries in the cab.
 *
 * Not a tax document: a challan carries no GST and no amounts, because value
 * enters on the invoice (ACCOUNTING_RULES). What it must carry is what a
 * checkpoint or the receiving yard will ask for — who sent it, who it is for,
 * which truck, which driver, how many bricks of which grade, and a line for
 * the receiver to sign.
 */
@Injectable()
export class ChallanPdfService {
  private readonly printer: InstanceType<typeof PdfPrinter>;

  constructor(@InjectEntityManager() private readonly em: EntityManager) {
    this.printer = new PdfPrinter(loadRobotoFonts());
  }

  async render(companyId: string, dispatchId: string): Promise<{ buffer: Buffer; challanNo: string }> {
    const dispatch = await this.em.findOne(Dispatch, { where: { id: dispatchId, companyId } });
    if (!dispatch) throw new NotFoundException('That challan does not exist');

    const [company, site, customer, lines] = await Promise.all([
      this.em.findOneOrFail(Company, { where: { id: companyId } }),
      this.em.findOne(Site, { where: { id: dispatch.siteId, companyId } }),
      this.em.findOneOrFail(Party, { where: { id: dispatch.customerPartyId, companyId } }),
      this.em.find(DispatchLine, { where: { dispatchId, companyId }, order: { createdAt: 'ASC' } }),
    ]);
    const [items, vehicle, driver, invoice] = await Promise.all([
      this.em.find(Item, { where: { id: In(lines.map((l) => l.itemId)), companyId } }),
      dispatch.vehicleId ? this.em.findOne(Vehicle, { where: { id: dispatch.vehicleId, companyId } }) : null,
      dispatch.driverId ? this.em.findOne(Driver, { where: { id: dispatch.driverId, companyId } }) : null,
      dispatch.salesInvoiceId
        ? this.em.findOne(SalesInvoice, { where: { id: dispatch.salesInvoiceId, companyId } })
        : this.em.findOne(SalesInvoice, { where: { dispatchId, companyId } }),
    ]);
    const itemById = new Map(items.map((i) => [i.id, i]));

    const doc = this.build(dispatch, company, site, customer, lines, itemById, vehicle, driver, invoice);
    const pdfDoc = this.printer.createPdfKitDocument(doc);
    const chunks: Buffer[] = [];
    const buffer = await new Promise<Buffer>((resolve, reject) => {
      pdfDoc.on('data', (c) => chunks.push(c as Buffer));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);
      pdfDoc.end();
    });
    return { buffer, challanNo: dispatch.challanNo };
  }

  private build(
    dispatch: Dispatch,
    company: Company,
    site: Site | null,
    customer: Party,
    lines: DispatchLine[],
    itemById: Map<string, Item>,
    vehicle: Vehicle | null,
    driver: Driver | null,
    invoice: SalesInvoice | null,
  ): TDocumentDefinitions {
    const rightStack: Content[] = [
      { text: 'DELIVERY CHALLAN', style: 'docLabel' },
      { text: `Challan No: ${dispatch.challanNo}`, style: 'small' },
      { text: `Date: ${dispatch.dispatchDate}`, style: 'small' },
    ];
    if (invoice) rightStack.push({ text: `Invoice: ${invoice.invoiceNo}`, style: 'small' });
    if (site) rightStack.push({ text: `Kiln: ${site.name}`, style: 'small' });

    const header: Content = {
      columns: [
        {
          stack: [
            { text: company.name, style: 'companyName' },
            { text: company.address ?? '', style: 'small' },
            { text: company.gstin ? `GSTIN: ${company.gstin}` : '', style: 'small' },
          ],
        },
        { stack: rightStack, alignment: 'right' },
      ],
    };

    const transport: Content = {
      columns: [
        {
          stack: [
            { text: 'Consignee', style: 'sectionLabel' },
            { text: customer.name, bold: true },
            { text: customer.address ?? '', style: 'small' },
            { text: customer.gstin ? `GSTIN: ${customer.gstin}` : '', style: 'small' },
            { text: dispatch.deliveryLocation ? `Deliver to: ${dispatch.deliveryLocation}` : '', style: 'small' },
          ],
        },
        {
          stack: [
            { text: 'Transport', style: 'sectionLabel' },
            { text: vehicle ? `Vehicle: ${vehicle.registrationNo}` : 'Vehicle: —', style: 'small' },
            { text: driver ? `Driver: ${driver.name}` : 'Driver: —', style: 'small' },
            { text: driver?.phone ? `Phone: ${driver.phone}` : '', style: 'small' },
            { text: dispatch.loadingLocation ? `Loaded at: ${dispatch.loadingLocation}` : '', style: 'small' },
          ],
        },
      ],
      columnGap: 20,
      margin: [0, 12, 0, 0],
    };

    const body: TableCell[][] = [
      [
        { text: '#', style: 'th' },
        { text: 'Description', style: 'th' },
        { text: 'Quantity', style: 'th', alignment: 'right' },
      ],
    ];
    let total = new Decimal(0);
    lines.forEach((line, index) => {
      total = total.plus(line.quantity);
      body.push([
        { text: String(index + 1), style: 'td' },
        { text: itemById.get(line.itemId)?.name ?? '—', style: 'td' },
        { text: new Decimal(line.quantity).toFixed(0), style: 'td', alignment: 'right' },
      ]);
    });
    body.push([
      { text: '', style: 'td' },
      { text: 'Total', style: 'td', bold: true },
      { text: total.toFixed(0), style: 'td', bold: true, alignment: 'right' },
    ]);

    const content: Content[] = [
      header,
      transport,
      {
        table: { headerRows: 1, widths: [20, '*', 90], body },
        layout: 'lightHorizontalLines',
        margin: [0, 14, 0, 0],
      },
    ];

    if (dispatch.notes) {
      content.push({ text: dispatch.notes, style: 'small', margin: [0, 10, 0, 0] });
    }

    // A challan is a goods document, not a bill — saying so on the page stops
    // it being filed as one.
    content.push({
      text: 'Not a tax invoice. Issued for movement of goods only.',
      style: 'small',
      italics: true,
      margin: [0, 10, 0, 0],
    });

    content.push({
      columns: [
        {
          stack: [
            { text: 'Received the above in good condition', style: 'small' },
            { text: dispatch.receivedBy ? `Received by: ${dispatch.receivedBy}` : 'Received by: ____________________' },
            { text: dispatch.deliveredOn ? `On: ${dispatch.deliveredOn}` : 'On: ____________________', style: 'small' },
          ],
        },
        {
          stack: [
            { text: `For ${company.name}`, style: 'small', alignment: 'right' },
            { text: 'Authorised signatory', style: 'small', alignment: 'right', margin: [0, 26, 0, 0] },
          ],
        },
      ],
      margin: [0, 28, 0, 0],
    });

    return {
      pageSize: 'A4',
      pageMargins: [36, 36, 36, 48],
      content,
      defaultStyle: { font: 'Roboto', fontSize: 9 },
      styles: {
        companyName: { fontSize: 15, bold: true },
        docLabel: { fontSize: 13, bold: true },
        sectionLabel: { fontSize: 8, bold: true, color: '#666666', margin: [0, 0, 0, 2] },
        small: { fontSize: 8 },
        th: { fontSize: 8, bold: true, fillColor: '#f2f2f2', margin: [0, 3, 0, 3] },
        td: { fontSize: 9, margin: [0, 3, 0, 3] },
      },
    };
  }
}
