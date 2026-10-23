/**
 * Every word and number on the public home page lives here, so copy, prices
 * and contact details change without touching a component. Plain, short
 * English for kiln owners; money in ₹ with Indian grouping (1,21,200).
 *
 * Values marked PLACEHOLDER must be replaced before launch.
 */

export const brand = {
  name: 'BRICS',
  fullName: 'BRICS — Brick Kiln ERP & Accounting',
  tagline: 'Know every brick, every rupee.',
  shortPitch: 'Production, coal, labour, dispatch and accounts for your brick kiln, in one place.',
  company: 'TVAM KEY SOFTWARE PRIVATE LIMITED',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bricks-erp-web.vercel.app',
  appHost: 'bricks-erp-web.vercel.app',
};

export const contact = {
  phone: '+91 90000 00000', // PLACEHOLDER
  phoneHref: 'tel:+919000000000', // PLACEHOLDER
  whatsappNumber: '919000000000', // PLACEHOLDER — digits only, with country code
  whatsappMessage: 'Hello, I want a demo of BRICS for my brick kiln.',
  email: 'hello@example.com', // PLACEHOLDER
};

export const appLinks = {
  android: 'https://play.google.com/store', // PLACEHOLDER
  ios: 'https://www.apple.com/app-store/', // PLACEHOLDER
};

export const seo = {
  title: 'BRICS — Brick Kiln ERP & Accounting Software',
  description:
    'Run your brick kiln with full control. BRICS tracks production, coal, labour advances, dispatch, GST and accounts on your phone and laptop — even offline at the kiln.',
};

export const nav = {
  links: [
    { label: 'Why BRICS', href: '#why' },
    { label: 'How It Works', href: '#how' },
    { label: 'Product Tour', href: '#tour' },
    { label: 'Mobile App', href: '#mobile' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
  ],
  login: 'Login',
  openDashboard: 'Open Dashboard',
  demo: 'Book a Demo',
};

export const hero = {
  eyebrow: 'Brick Kiln ERP & Accounting',
  headline: 'Run your brick kiln with full control.',
  headlineAccent: 'Know every brick, every rupee.',
  /** Part of the accent line that gets the animated underline. */
  underline: 'every rupee',
  sub: 'BRICS tracks production, coal, labour advances, dispatch and accounts in one place, on your phone and your laptop. See your whole kiln live from anywhere.',
  primaryCta: 'Login to Dashboard',
  secondaryCta: 'Watch Live Demo',
  trust: [
    { icon: 'wifiOff', label: 'Works offline at the kiln' },
    { icon: 'gst', label: 'GST ready' },
    { icon: 'shield', label: 'Your data stays private' },
    { icon: 'smile', label: 'Simple for staff' },
  ],
  kpis: {
    fired: 175900,
    onHand: 121200,
    costPer1000: 2950,
    benchmarkPer1000: 4100,
  },
  phoneTiles: ['Production', 'Attendance', 'Goods receipt', 'Dispatch'],
  sampleLabel: 'Sample',
  liveAlerts: [
    { icon: 'coal', tone: 'bad', text: 'Coal used is 15% above normal' },
    { icon: 'truck', tone: 'bad', text: 'Truck left without a bill' },
    { icon: 'sardar', tone: 'warn', text: 'Sardar advance in Watch zone' },
    { icon: 'sorted', tone: 'good', text: '1,200 bricks sorted just now' },
  ],
} as const;

export const statsBar: { count?: number; label: string }[] = [
  { count: 6, label: 'stages tracked' },
  { count: 5, label: 'leak alerts' },
  { label: 'Works offline' },
  { label: 'GST ready' },
];

export const why = {
  eyebrow: 'Why BRICS',
  title: 'Where kiln owners lose money every season',
  subtitle: 'Small gaps every day add up to lakhs by the end of the season.',
  fixLabel: 'How BRICS fixes this',
  pains: [
    {
      icon: 'advance',
      title: 'Labour advances',
      pain: 'A Sardar takes an advance, but the work done is less.',
      fix: 'Every advance sits next to the work done. You see who owes how much.',
    },
    {
      icon: 'coal',
      title: 'Coal & fuel leakage',
      pain: 'More coal is burnt than normal, and there is no proof.',
      fix: 'Coal per 1,000 bricks is counted for every firing and compared to normal.',
    },
    {
      icon: 'truck',
      title: 'Trucks leaving without a bill',
      pain: 'Stock goes out, but no invoice is made.',
      fix: 'Each truck at the gate is matched to a challan and an invoice.',
    },
    {
      icon: 'diary',
      title: "Dependence on the Munshi's diary",
      pain: 'The owner has no live picture of the kiln.',
      fix: 'Staff enter work on the phone. You see it live, from anywhere.',
    },
  ],
  loss: {
    lead: 'A typical kiln can lose',
    from: 5,
    to: 8,
    tail: 'every season to these gaps.',
    note: 'Industry estimate, for illustration.',
  },
} as const;

export type MiniTone = 'good' | 'warn' | 'bad' | 'info';

export interface MiniCard {
  title: string;
  rows: { label: string; value: string }[];
  status: { text: string; tone: MiniTone };
}

export interface FlowStep {
  key: string;
  label: string;
  short: string;
  kiln: string;
  staff: string;
  owner: string;
  card: MiniCard;
}

export const how: {
  eyebrow: string;
  title: string;
  subtitle: string;
  blocks: [string, string, string];
  steps: FlowStep[];
} = {
  eyebrow: 'How it works',
  title: 'From soil to sale, everything in one flow',
  subtitle: 'Tap a step to see what happens at the kiln, and what you get.',
  blocks: ['What happens at the kiln', 'What your staff enters in the app', 'What you get automatically'],
  steps: [
    {
      key: 'making',
      label: 'Making',
      short: 'Green bricks',
      kiln: 'The gang moulds green bricks from soil.',
      staff: 'Bricks moulded, Sardar name, soil used.',
      owner: "Each gang's output and the soil stock, updated live.",
      card: {
        title: 'Chamber 3 · Making',
        rows: [
          { label: 'Green bricks', value: '1,00,000' },
          { label: 'Sardar', value: 'Ramesh gang' },
          { label: 'Soil used', value: '42 trolleys' },
        ],
        status: { text: 'Saved on phone, sent when online', tone: 'good' },
      },
    },
    {
      key: 'drying',
      label: 'Drying',
      short: 'In the sun',
      kiln: 'Green bricks dry in the open yard.',
      staff: 'One tap: the date drying finished.',
      owner: 'How many days each batch took to dry.',
      card: {
        title: 'Chamber 3 · Drying',
        rows: [
          { label: 'Started', value: '12 Oct' },
          { label: 'Finished', value: '19 Oct' },
          { label: 'Days', value: '7' },
        ],
        status: { text: 'Ready for firing', tone: 'info' },
      },
    },
    {
      key: 'firing',
      label: 'Firing',
      short: 'Coal tracked',
      kiln: 'Bricks go into the kiln and coal is burnt.',
      staff: 'Bricks fired and coal taken from the store.',
      owner: 'Coal per 1,000 bricks, checked against normal.',
      card: {
        title: 'Chamber 3 · Firing',
        rows: [
          { label: 'Bricks fired', value: '95,000' },
          { label: 'Coal used per 1,000 bricks', value: '180 kg' },
          { label: 'Normal', value: '180 kg' },
        ],
        status: { text: 'Coal use is normal', tone: 'good' },
      },
    },
    {
      key: 'sorting',
      label: 'Sorting',
      short: 'Class 1 / 2 / 3',
      kiln: 'Fired bricks are sorted by quality.',
      staff: 'Count of Class 1, Class 2, Class 3 and broken.',
      owner: 'Finished stock by class, and the exact wastage.',
      card: {
        title: 'Chamber 3 · Sorting',
        rows: [
          { label: 'Class 1', value: '62,000' },
          { label: 'Class 2', value: '20,000' },
          { label: 'Class 3', value: '6,000' },
        ],
        status: { text: 'Broken 7,000 · 7% wastage', tone: 'warn' },
      },
    },
    {
      key: 'dispatch',
      label: 'Dispatch',
      short: 'Challan + gate',
      kiln: 'Trucks load bricks and leave the gate.',
      staff: 'Challan, vehicle number, gate check.',
      owner: 'Every truck that left, matched to a bill.',
      card: {
        title: 'CHL-00004 · UP32 HT 4521',
        rows: [
          { label: 'Class 1 bricks', value: '4,000' },
          { label: 'Gate check', value: '10:42 am' },
          { label: 'Invoice', value: 'INV-00012' },
        ],
        status: { text: 'Truck billed', tone: 'good' },
      },
    },
    {
      key: 'sales',
      label: 'Sales & Accounts',
      short: 'GST, books, profit',
      kiln: 'The customer pays, now or later.',
      staff: 'GST invoice and payment received.',
      owner: 'Books, GST reports and profit, without extra work.',
      card: {
        title: 'October · Profit & Loss',
        rows: [
          { label: 'Sales', value: '₹18,40,000' },
          { label: 'Expenses', value: '₹12,95,000' },
          { label: 'Profit', value: '₹5,45,000' },
        ],
        status: { text: 'Books balanced', tone: 'good' },
      },
    },
  ],
};

/* ── Product tour ─────────────────────────────────────────────────────────── */

export type Tone = 'good' | 'warn' | 'bad' | 'info' | 'neutral';

export interface TourTable {
  columns: string[];
  /** Columns holding numbers or money: right-aligned. */
  numeric?: number[];
  rows: { cells: string[]; status?: { text: string; tone: Tone } }[];
}

interface TourBase {
  key: string;
  label: string;
  title: string;
  why: string;
  /** Tooltip text by the element it points at. */
  hotspots: Record<string, string>;
}

export type TourModule =
  | (TourBase & {
      kind: 'dashboard';
      kpis: { label: string; value: string; note: string }[];
      cost: { value: number; benchmark: number };
      trend: number[];
    })
  | (TourBase & { kind: 'table'; table: TourTable })
  | (TourBase & {
      kind: 'attendance';
      date: string;
      people: { name: string; role: string; status: 'Present' | 'Half Day' | 'Absent' }[];
    })
  | (TourBase & {
      kind: 'sales';
      table: TourTable;
      ageing: { label: string; amount: string; percent: number }[];
    })
  | (TourBase & { kind: 'reports'; tabs: string[]; rows: { label: string; value: string; bold?: boolean }[] })
  | (TourBase & { kind: 'settings'; fields: { label: string; value: string }[] });

export const tour: {
  eyebrow: string;
  title: string;
  subtitle: string;
  autoplay: string;
  callouts: { text: string; side: 'left' | 'right'; top: string }[];
  whyLabel: string;
  modules: TourModule[];
} = {
  eyebrow: 'Product tour',
  title: 'See BRICS live',
  subtitle: 'The real screens your office uses. Tap a module to look around.',
  autoplay: 'Auto-play tour',
  callouts: [
    { text: 'Live cost per 1,000', side: 'left', top: '30%' },
    { text: 'Every module, one login', side: 'left', top: '68%' },
    { text: 'Updates as staff save', side: 'right', top: '22%' },
    { text: 'Alerts before money leaks', side: 'right', top: '62%' },
  ],
  whyLabel: 'Why this matters for you',
  modules: [
    {
      key: 'dashboard',
      label: 'Dashboard',
      title: 'Dashboard',
      kind: 'dashboard',
      why: 'Your whole kiln on one screen, every morning, without calling anyone.',
      hotspots: {
        cost: 'Cost per 1,000 bricks, compared to the normal for your area.',
        kpi: 'Updated the moment your staff save an entry.',
      },
      kpis: [
        { label: 'Production', value: '1,75,900', note: 'bricks fired' },
        { label: 'Bricks on hand', value: '1,21,200', note: 'all classes' },
        { label: 'Receivables', value: '₹6,85,000', note: '14 customers' },
        { label: 'Payables', value: '₹4,00,000', note: '6 suppliers' },
      ],
      cost: { value: 2950, benchmark: 4100 },
      trend: [3600, 3400, 3480, 3200, 3150, 3020, 2950],
    },
    {
      key: 'production',
      label: 'Production',
      title: 'Production batches',
      kind: 'table',
      why: 'Know which chamber is at which stage, and how many bricks each one gave.',
      hotspots: { status: 'Every batch moves Making → Drying → Firing → Sorting.' },
      table: {
        columns: ['Batch', 'Started', 'Bricks', 'Stage'],
        numeric: [2],
        rows: [
          { cells: ['Chamber 1', '02 Oct', '98,000'], status: { text: 'Firing', tone: 'warn' } },
          { cells: ['Chamber 36', '18 Oct', '1,02,000'], status: { text: 'Open', tone: 'info' } },
          { cells: ['Kushinagar', '24 Sep', '1,05,500'], status: { text: 'Sorted', tone: 'good' } },
          { cells: ['Chamber 5', '06 Oct', '96,400'], status: { text: 'Firing', tone: 'warn' } },
        ],
      },
    },
    {
      key: 'labour',
      label: 'Labour & Sardar',
      title: 'Attendance · Today',
      kind: 'attendance',
      why: 'Wages and advances match the days actually worked.',
      hotspots: { advance: "Red alert if a Sardar's advance is more than his work." },
      date: 'Thu, 23 Oct',
      people: [
        { name: 'Moulding Gang', role: 'Sardar: Ramesh · 18 workers', status: 'Present' },
        { name: 'Ramu', role: 'Firing', status: 'Present' },
        { name: 'Sita Devi', role: 'Loading', status: 'Half Day' },
        { name: 'Mohan', role: 'Sorting', status: 'Absent' },
      ],
    },
    {
      key: 'purchases',
      label: 'Purchases',
      title: 'Purchase orders',
      kind: 'table',
      why: 'Coal ordered, coal received and coal paid for, all matched.',
      hotspots: { status: 'Open until the coal is received at your store.' },
      table: {
        columns: ['PO No.', 'Supplier', 'Item', 'Amount', 'Status'],
        numeric: [3],
        rows: [
          {
            cells: ['PO-00001', 'Bharat Coal Traders', 'Steam coal · 40 t', '₹4,40,000'],
            status: { text: 'Open', tone: 'info' },
          },
          {
            cells: ['PO-00002', 'Shiv Soil Supply', 'Brick soil · 60 trolleys', '₹72,000'],
            status: { text: 'Received', tone: 'good' },
          },
        ],
      },
    },
    {
      key: 'sales',
      label: 'Sales',
      title: 'GST invoices',
      kind: 'sales',
      why: 'GST bills in seconds, and you see who has not paid, and for how long.',
      hotspots: { ageing: 'Money stuck for more than 60 days is shown in red.' },
      table: {
        columns: ['Invoice', 'Customer', 'Amount (incl. GST)', 'Status'],
        numeric: [2],
        rows: [
          { cells: ['INV-00012', 'Gupta Builders', '₹1,12,000'], status: { text: 'Paid', tone: 'good' } },
          { cells: ['INV-00013', 'Shree Ram Constructions', '₹2,24,000'], status: { text: 'Due', tone: 'warn' } },
          { cells: ['INV-00014', 'Verma Traders', '₹56,000'], status: { text: 'Overdue', tone: 'bad' } },
        ],
      },
      ageing: [
        { label: '0–30 days', amount: '₹3,40,000', percent: 50 },
        { label: '31–60 days', amount: '₹2,05,000', percent: 30 },
        { label: '60+ days', amount: '₹1,40,000', percent: 20 },
      ],
    },
    {
      key: 'dispatch',
      label: 'Dispatch',
      title: 'Delivery challans',
      kind: 'table',
      why: 'No truck leaves the gate without a challan and a bill.',
      hotspots: { status: 'Checked at the gate before the truck leaves.' },
      table: {
        columns: ['Challan', 'Vehicle', 'Bricks', 'Status'],
        numeric: [2],
        rows: [
          { cells: ['CHL-00003', 'UP32 HT 4521', '4,000'], status: { text: 'Delivered', tone: 'good' } },
          { cells: ['CHL-00004', 'UP32 HT 4521', '4,000'], status: { text: 'Confirmed', tone: 'info' } },
          { cells: ['CHL-00005', 'UP32 HT 4521', '3,500'], status: { text: 'Confirmed', tone: 'info' } },
        ],
      },
    },
    {
      key: 'stock',
      label: 'Stock',
      title: 'Brick stock',
      kind: 'table',
      why: 'Opening + made − sold = closing. Always. Nothing goes missing quietly.',
      hotspots: { closing: 'Closing stock is worked out for you, never typed in.' },
      table: {
        columns: ['Class', 'Opening', 'Produced', 'Sold', 'Closing'],
        numeric: [1, 2, 3, 4],
        rows: [
          { cells: ['Class 1', '40,000', '62,000', '48,000', '54,000'] },
          { cells: ['Class 2', '25,000', '20,000', '9,000', '36,000'] },
          { cells: ['Class 3', '28,000', '6,000', '2,800', '31,200'] },
        ],
      },
    },
    {
      key: 'accounts',
      label: 'Accounts',
      title: 'Day Book',
      kind: 'table',
      why: 'Proper books, made from daily work. Your CA gets clean records.',
      hotspots: { status: 'Every entry is balanced: debit always equals credit.' },
      table: {
        columns: ['Date', 'Particulars', 'Debit', 'Credit'],
        numeric: [2, 3],
        rows: [
          { cells: ['23 Oct', 'Gupta Builders — receipt', '₹1,12,000', '—'] },
          { cells: ['23 Oct', 'Bharat Coal Traders — payment', '—', '₹2,00,000'] },
          { cells: ['22 Oct', 'Wages — Moulding Gang', '—', '₹54,000'] },
          { cells: ['22 Oct', 'Diesel — JCB', '—', '₹8,400'] },
        ],
      },
    },
    {
      key: 'reports',
      label: 'Reports',
      title: 'Reports',
      kind: 'reports',
      why: 'Profit, GST and cost per 1,000 bricks, ready whenever you ask.',
      hotspots: { profit: 'Real profit after coal, wages and every expense.' },
      tabs: ['Expenses', 'Cash & bank', 'P&L', 'GST', 'Cost per 1,000'],
      rows: [
        { label: 'Brick sales', value: '₹18,40,000' },
        { label: 'Coal', value: '₹7,20,000' },
        { label: 'Wages', value: '₹4,10,000' },
        { label: 'Other expenses', value: '₹1,65,000' },
        { label: 'Net profit', value: '₹5,45,000', bold: true },
      ],
    },
    {
      key: 'audit',
      label: 'Audit Log',
      title: 'Audit log',
      kind: 'table',
      why: 'Every change is recorded. Nobody can quietly edit or delete an entry.',
      hotspots: { status: 'Kept forever. It cannot be edited or deleted.' },
      table: {
        columns: ['When', 'Who', 'What changed'],
        rows: [
          { cells: ['23 Oct, 10:42', 'Suresh (Munshi)', 'Challan CHL-00004 confirmed'] },
          { cells: ['23 Oct, 09:15', 'Anil (Supervisor)', 'Firing: Chamber 5, coal 18 t'] },
          { cells: ['22 Oct, 18:30', 'Owner', 'Advance ₹20,000 to Ramesh'] },
          { cells: ['22 Oct, 17:05', 'Suresh (Munshi)', 'Invoice INV-00014 created'] },
        ],
      },
    },
    {
      key: 'settings',
      label: 'Settings',
      title: 'Company profile',
      kind: 'settings',
      why: 'Set up once: your kilns, staff and what each person may see.',
      hotspots: { gstin: 'Your GSTIN prints on every invoice.' },
      fields: [
        { label: 'Company name', value: 'Shri Balaji Brick Field' },
        { label: 'GSTIN', value: '09ABCDE1234F1Z5' },
        { label: 'Kilns', value: 'Kiln 1 · Rampur Kiln No. 2' },
        { label: 'Financial year', value: '2026–27' },
      ],
    },
  ],
};

/* ── Leak alerts ──────────────────────────────────────────────────────────── */

export const guards = {
  eyebrow: 'Leak alerts',
  title: '5 smart alerts that protect your money',
  subtitle: 'BRICS watches the numbers all day and tells you when something looks wrong.',
  alertLabel: 'BRICS alerts you when',
  tapHint: 'Tap to see it work',
  cards: [
    {
      key: 'loss',
      code: 'LEK-01',
      title: 'Brick Loss Guard',
      problem: 'Bricks go missing between making, firing and sorting.',
      alert: 'wastage between stages is higher than normal.',
      funnel: [
        { label: 'Made', value: 100000 },
        { label: 'Fired', value: 95000 },
        { label: 'Sorted', value: 88000 },
      ],
    },
    {
      key: 'coal',
      code: 'LEK-02',
      title: 'Coal Guard',
      problem: 'More coal is burnt than the bricks need.',
      alert: 'coal per 1,000 bricks is 15% above normal.',
      normalKg: 180,
      actualKg: 240,
      thresholdPercent: 15,
    },
    {
      key: 'sardar',
      code: 'LEK-03',
      title: 'Sardar Exposure',
      problem: 'Advances given are more than the work done.',
      alert: "a Sardar's advance runs ahead of his gang's work.",
      sardars: [
        { name: 'Ramesh', advance: 80000, work: 92000 },
        { name: 'Kallu', advance: 60000, work: 52000 },
        { name: 'Bhola', advance: 75000, work: 41000 },
      ],
    },
    {
      key: 'gate',
      code: 'LEK-04',
      title: 'Gate Guard',
      problem: 'A truck leaves the gate, but no bill is made.',
      alert: 'a truck has left without an invoice.',
      trucksOut: 12,
      invoiced: 11,
    },
    {
      key: 'audit',
      code: 'Audit',
      title: 'Audit Trail',
      problem: 'Entries are changed later, and nobody knows who did it.',
      alert: 'always — every change shows who, what and when, and cannot be deleted.',
      entries: [
        { who: 'Munshi', what: 'Coal 18 t → 16 t', when: '09:15' },
        { who: 'Owner', what: 'Advance ₹20,000', when: '18:30' },
      ],
    },
  ],
  meter: {
    title: 'Try it: Sardar Risk Meter',
    subtitle: 'Move the sliders to see how BRICS judges a Sardar’s advance.',
    advanceLabel: 'Advance given to Sardar (₹)',
    workLabel: 'Work done by his gang (₹)',
    max: 200000,
    step: 1000,
    initialAdvance: 60000,
    initialWork: 80000,
    reset: 'Reset',
    /** Advance ÷ work at or below `watchFrom` is safe; above `highFrom` is high risk. */
    watchFrom: 1,
    highFrom: 1.25,
    levels: {
      safe: { label: 'Safe', message: 'Advance is covered by work done. All good.' },
      watch: { label: 'Watch', message: 'Advance is running ahead of work. Keep an eye on it.' },
      high: { label: 'High Risk', message: 'Do not give more advance to this Sardar.' },
    },
  },
} as const;

/* ── Later sections (content ready, sections built in later steps) ─────────── */

export const mobile = {
  eyebrow: 'Mobile app',
  title: 'Built for the kiln, not the office',
  subtitle:
    'Your supervisor records work on the spot. No signal? No problem — entries wait on the phone and go when the network comes back.',
  tabs: ['Production', 'Attendance', 'Goods receipt', 'Dispatch'],
  batch: {
    name: 'Chamber 36',
    stages: [
      { key: 'making', label: 'Making', doneNote: '11,000 green', done: true },
      { key: 'drying', label: 'Drying', doneNote: 'Dried in 7 days', optional: true, done: false },
      { key: 'firing', label: 'Firing', doneNote: '10,600 fired', done: false },
      { key: 'sorting', label: 'Sorting', doneNote: '9,900 good', done: false },
    ],
    record: 'Record',
    recorded: 'Recorded',
    optional: 'optional',
  },
  attendance: [
    { name: 'Moulding Gang', status: 'Present' },
    { name: 'Ramu', status: 'Present' },
    { name: 'Sita Devi', status: 'Half Day' },
    { name: 'Mohan', status: 'Absent' },
  ],
  receipt: { supplier: 'Bharat Coal Traders', item: 'Steam coal', quantity: '12.5 t', store: 'Coal & Soil Store' },
  dispatch: { challan: 'CHL-00006', vehicle: 'UP32 HT 4521', bricks: '4,000 · Class 1', gate: 'Gate check pending' },
  offline: {
    label: 'Internet',
    on: 'ON',
    off: 'OFF',
    add: 'Save an entry',
    waiting: 'Waiting',
    sent: 'Sent',
    attention: 'Need attention',
    sampleEntries: ['Firing · Chamber 36', 'Attendance · 18 present', 'Coal received · 12.5 t', 'Challan CHL-00006'],
    hint: 'Turn the internet off, save an entry, then turn it back on.',
  },
  features: ['Works without internet', 'Auto-sync', 'Big, simple buttons', 'Made for kiln staff'],
  orbit: ['Works offline', 'Auto-sync', 'Simple buttons'],
  getApp: 'Get the app',
  stores: { android: 'Google Play', ios: 'App Store' },
};

export const flow = {
  eyebrow: 'One entry, everything updates',
  title: 'Your staff enters once. BRICS does the rest.',
  subtitle: 'No double entry, no waiting for the Munshi to update the books.',
  nodes: [
    { icon: 'phone', title: 'Staff records firing', text: 'Supervisor saves bricks fired and coal used.' },
    { icon: 'boxes', title: 'Stock updates', text: 'Coal goes down, fired bricks go up.' },
    { icon: 'book', title: 'Accounts entry posts', text: 'The journal entry is made automatically.' },
    { icon: 'calc', title: 'Cost per 1,000 updates', text: 'Your brick cost is worked out again.' },
    { icon: 'chart', title: 'Owner sees it live', text: 'It shows on your dashboard right away.' },
  ],
} as const;

export const roi = {
  eyebrow: 'Savings calculator',
  title: 'How much could you save?',
  subtitle: 'Move the sliders to match your kiln.',
  bricks: { label: 'Bricks produced per season', unit: 'lakh', min: 10, max: 200, step: 5, initial: 50 },
  price: { label: 'Average selling price per 1,000 bricks', min: 5000, max: 10000, step: 250, initial: 7000 },
  leakage: { label: 'Estimated leakage', unit: '%', min: 1, max: 10, step: 0.5, initial: 5 },
  /** Share of the leakage BRICS is assumed to stop. PLACEHOLDER assumption, for illustration. */
  recoveredShare: 0.7,
  resultLead: 'You could save about',
  resultTail: 'per season',
  chart: { without: 'Lost without BRICS', with: 'Lost with BRICS' },
  disclaimer: 'Estimate for illustration only.',
  cta: 'Get this for my kiln',
};

export const marquee = {
  label: 'Everything a kiln needs',
  modules: [
    { icon: 'production', label: 'Production' },
    { icon: 'labour', label: 'Labour' },
    { icon: 'purchases', label: 'Purchases' },
    { icon: 'sales', label: 'Sales' },
    { icon: 'dispatch', label: 'Dispatch' },
    { icon: 'stock', label: 'Stock' },
    { icon: 'accounts', label: 'Accounts' },
    { icon: 'gst', label: 'GST' },
    { icon: 'audit', label: 'Audit Log' },
    { icon: 'reports', label: 'Reports' },
  ],
} as const;

export const liveFeed = {
  eyebrow: 'Today at the kiln',
  title: 'Every entry shows up as it happens',
  subtitle: 'This is what an owner sees through the day. Staff save on the phone; it appears here.',
  demoLabel: 'Demo data',
  events: [
    { icon: 'production', time: '06:40', text: 'Chamber 36 loaded 11,000 bricks' },
    { icon: 'labour', time: '07:15', text: 'Moulding Gang marked present · 18 workers' },
    { icon: 'stock', time: '09:05', text: 'Coal received · 12.5 t from Bharat Coal Traders' },
    { icon: 'dispatch', time: '10:42', text: 'Challan CHL-00005 confirmed' },
    { icon: 'accounts', time: '12:20', text: 'Payment ₹1,60,000 posted to Bharat Coal Traders' },
    { icon: 'sales', time: '15:10', text: 'Invoice INV-00015 made for Gupta Builders' },
  ],
} as const;

export const beforeAfter = {
  eyebrow: 'Before vs after',
  title: 'From the diary to a clear screen',
  subtitle: 'Drag the handle to compare.',
  before: 'Before: the Munshi’s diary',
  after: 'After: BRICS',
  handle: 'Drag to compare before and after',
  diaryLines: [
    '12/10 — Ramesh adv 20,000 ??',
    'Coal 18t (or 16?)',
    'Truck UP32… bill later',
    'Bricks fired — ask Anil',
    'Gupta ji payment pending',
  ],
} as const;

/**
 * Real customer quotes only. The section stays hidden until `show` is true and
 * `items` holds approved quotes — never placeholder names or invented words.
 */
export const testimonials: {
  show: boolean;
  eyebrow: string;
  title: string;
  items: { quote: string; name: string; kiln: string; place: string }[];
} = {
  show: false,
  eyebrow: 'Kiln owners',
  title: 'What owners say',
  items: [],
};

export const roles = {
  eyebrow: 'For your whole team',
  title: 'Built for everyone on the kiln',
  cards: [
    {
      key: 'owner',
      role: 'Owner',
      lead: 'Your live control room.',
      bullets: ['See production, stock and cash live', 'Get alerts when money leaks', 'Know your real profit'],
    },
    {
      key: 'accountant',
      role: 'Accountant',
      lead: 'Books without retyping.',
      bullets: ['Day Book, ledgers, trial balance', 'GST invoices and returns', 'P&L and balance sheet'],
    },
    {
      key: 'munshi',
      role: 'Munshi / Supervisor',
      lead: 'Simple entries on the phone.',
      bullets: ['Big buttons, plain words', 'Works without internet', 'Done in under a minute'],
    },
  ],
};

export const accounting = {
  eyebrow: 'Accounts & GST',
  title: 'Accounts and GST, built in',
  message: 'No separate accounting software needed.',
  chips: [
    { icon: 'book', label: 'Day Book' },
    { icon: 'ledger', label: 'Ledgers' },
    { icon: 'scale', label: 'Trial Balance' },
    { icon: 'chart', label: 'P&L / Balance Sheet' },
    { icon: 'wallet', label: 'Cash & Bank book' },
    { icon: 'pdf', label: 'GST invoice PDF' },
    { icon: 'export', label: 'GSTR-1 and GSTR-3B export' },
    { icon: 'clock', label: 'Receivables ageing' },
  ],
  dayBook: {
    title: 'Day Book · 23 Oct',
    voucher: 'Payment · PV-00031',
    lines: [
      { account: 'Electricity & Power', debit: '₹18,500', credit: '' },
      { account: 'Cash', debit: '', credit: '₹18,500' },
    ],
    total: '₹18,500',
    balanced: 'Balanced',
  },
} as const;

export const security = {
  eyebrow: 'Security & privacy',
  title: 'Your data is safe, and it stays yours',
  items: [
    {
      icon: 'separate',
      title: "Each kiln's data is fully separate",
      text: 'No other company can ever see your numbers.',
    },
    { icon: 'roles', title: 'Role-based access', text: 'Owner, accountant and staff each see only what they need.' },
    { icon: 'log', title: 'Every action is logged', text: 'Who did what, and when. Nothing is hidden.' },
    {
      icon: 'support',
      title: 'Support access is time-limited and logged',
      text: 'Our team can help only when you allow it, for a short time.',
    },
    { icon: 'backup', title: 'Cloud backup', text: 'Your data is backed up every day. A lost phone loses nothing.' },
  ],
} as const;

export const pricing = {
  eyebrow: 'Pricing',
  title: 'Simple pricing for your kiln',
  subtitle: 'No hidden charges. GST extra as applicable.',
  plans: [
    {
      key: 'season',
      name: 'Per Kiln / Season',
      price: 35000, // PLACEHOLDER
      unit: 'per kiln, per season',
      note: 'Pay once for the whole season.',
      featured: true,
    },
    {
      key: 'monthly',
      name: 'Setup + Monthly',
      setup: 15000, // PLACEHOLDER
      price: 4500, // PLACEHOLDER
      unit: 'per kiln, per month',
      note: 'Small one-time setup, then pay monthly.',
      featured: false,
    },
  ],
  included: [
    'Web dashboard + Mobile app',
    'Hosting and daily backup',
    'Phone & WhatsApp support',
    'Setup and staff training',
    'GST reports',
    'All 5 leak alerts',
  ],
  cta: 'Book a Demo',
  popular: 'Most popular',
} as const;

export const faq = {
  eyebrow: 'FAQ',
  title: 'Questions kiln owners ask',
  items: [
    {
      q: 'My Munshi does not know computers.',
      a: 'That is fine. The phone app has big buttons and plain words, like WhatsApp. Most Munshis learn it in one day, and we train your staff ourselves.',
    },
    {
      q: 'We have no internet at the kiln.',
      a: 'The app works without internet. Entries are saved on the phone and sent on their own when the network comes back.',
    },
    {
      q: 'Can I manage more than one kiln?',
      a: 'Yes. Switch between kilns in one tap, or see all your kilns together on one screen.',
    },
    {
      q: 'Is my data safe?',
      a: "Yes. Each company's data is fully separate, every change is logged, and everything is backed up daily. Only people you allow can see it.",
    },
    {
      q: 'Can my CA get GST reports?',
      a: 'Yes. GST invoices, GSTR-1 and GSTR-3B exports, ledgers and trial balance are ready for your CA.',
    },
    {
      q: 'How long does setup take?',
      a: 'Usually 2–3 days. We enter your opening stock and balances with you and train your staff.',
    },
  ],
};

export const finalCta = {
  title: 'Stop guessing. Start seeing your kiln clearly.',
  subtitle: 'Book a free demo. We will show you BRICS with your own kiln’s numbers.',
  demo: 'Book a Demo',
  login: 'Login',
};

export const footer = {
  tagline: 'The simple way to run a brick kiln: production, labour, stock, GST and accounts in one place.',
  quickLinksTitle: 'Quick links',
  contactTitle: 'Contact',
  login: 'Login to Dashboard',
  whatsapp: 'WhatsApp us',
  backToTop: 'Back to top',
};

export const demo = {
  title: 'Book a free demo',
  subtitle: 'Share a few details. We will call you within one working day.',
  fields: {
    name: 'Your name',
    mobile: 'Mobile number',
    kilnName: 'Kiln name',
    location: 'Location (town / district)',
    kilnCount: 'Number of kilns',
  },
  submit: 'Request demo',
  submitting: 'Sending…',
  successTitle: 'Thank you!',
  successText: 'We got your request. Our team will call you soon.',
  close: 'Close',
  error: 'Could not send. Please try again, or WhatsApp us.',
};

export function whatsappHref(): string {
  return `https://wa.me/${contact.whatsappNumber}?text=${encodeURIComponent(contact.whatsappMessage)}`;
}
