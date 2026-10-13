/**
 * A CSV reader for the go-live import (ONB-01).
 *
 * The file is read here, in the browser, and only the rows are sent. Nothing is
 * uploaded, so there is no file to store, scan or clean up — and the person
 * importing sees every problem against their own spreadsheet before a single
 * row is written.
 *
 * Deliberately small rather than a library: it handles quoted fields, escaped
 * quotes and either line ending, which is what a sheet exported from Excel or
 * Google Sheets actually produces. Anything stranger than that belongs in a
 * spreadsheet, not in this parser.
 */

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
  /** Problems with the file itself, before any row is validated. */
  problems: string[];
}

function splitLine(line: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        // A doubled quote inside a quoted field is one literal quote.
        if (line[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      cells.push(cell);
      cell = '';
    } else {
      cell += ch;
    }
  }
  cells.push(cell);
  return cells.map((c) => c.trim());
}

export function parseCsv(text: string): ParsedCsv {
  const lines = text.split(/\r\n|\n|\r/).filter((l) => l.trim() !== '');
  if (lines.length === 0) return { headers: [], rows: [], problems: ['The file is empty.'] };

  // Strip the byte-order mark Excel writes at the start of a UTF-8 file; it
  // would otherwise make the first heading not match its own name.
  const headers = splitLine(lines[0]!).map((h) => h.replace(/^﻿/, ''));
  const problems: string[] = [];
  if (headers.some((h) => h === '')) problems.push('One of the column headings is blank.');

  const rows = lines.slice(1).map((line) => {
    const cells = splitLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = cells[i] ?? '';
    });
    return row;
  });

  if (rows.length === 0) problems.push('The file has headings but no rows.');
  return { headers, rows, problems };
}

/** The columns each kind expects, in the order the template writes them. */
export const TEMPLATES: Record<string, { columns: string[]; example: string[]; note: string }> = {
  parties: {
    columns: [
      'name',
      'types',
      'gstin',
      'pan',
      'stateCode',
      'phone',
      'email',
      'address',
      'openingDebit',
      'openingCredit',
    ],
    example: ['Shri Krishna Builders', 'customer', '', '', '09', '9876543210', '', '', '35840', '0'],
    note: 'types can be several, comma-separated inside quotes: "sardar,supplier". openingDebit is what they owe you; openingCredit is what you owe them.',
  },
  items: {
    columns: ['name', 'category', 'unit', 'hsnCode', 'brickGrade'],
    example: ['Class 1 Brick', 'other', 'Thousand', '', 'Class 1'],
    note: 'Fill brickGrade only for bricks — the grade and its item are created together. unit must already exist.',
  },
  'opening-balances': {
    columns: ['ledger', 'debit', 'credit'],
    example: ['Cash', '50000', '0'],
    note: 'One side per ledger. Credit the total of your assets to Owner’s Capital so the set balances.',
  },
  'opening-stock': {
    columns: ['warehouse', 'item', 'quantity', 'asOf'],
    example: ['Main Yard', 'Class 1', '50000', ''],
    note: 'item takes a brick grade by its own name. Leave asOf blank to use the financial year’s first day.',
  },
};
