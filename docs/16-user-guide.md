# 16 — User guide

For the people who will use BRICS every day: the owner, the accountant, the
manager, the store keeper. It follows the order of a working day rather than
the order of the menu.

## Signing in

Email or mobile, and a password. The owner's account is created once when the
system is set up; everyone else is added by the owner under **Settings →
Users**, with a role that decides what they can see and do.

Change your password under your own name in the top bar. Changing it signs out
every other device, which is the point.

## Setting up, once

Do these in order. Each one is needed by the one after it.

1. **Settings → Company** — name, GSTIN and state. The state matters: it decides
   whether a sale is CGST + SGST or IGST, and the system refuses the wrong one.
2. **Settings → Kilns** — one per chimney. Everything else hangs off a kiln.
3. **Masters → Inventory** — units first, then items. A brick grade is created
   with the item it is sold as: production sorts into the grade, and an invoice
   takes out of the same pile.
4. **Masters → Parties** — customers, suppliers, Sardars. One party can be more
   than one of those; a Sardar who also sells you coal is one party, not two.
5. **Settings → Go-live import** — if you have this in a spreadsheet already,
   import it instead of typing it. See below.

## The go-live import

**Settings → Go-live import.** Four kinds of file, each with a template to
download and fill in:

| File                   | What it brings                                                   |
| ---------------------- | ---------------------------------------------------------------- |
| Parties                | Customers, suppliers and Sardars, with what each owed on day one |
| Items and brick grades | What you stock and sell                                          |
| Opening balances       | What each ledger starts at                                       |
| Opening stock          | What is in the yard                                              |

Past bills and payments are **not** imported. The opening balances stand in for
all of it — what a customer still owes you is their opening balance, not a pile
of old invoices.

Two steps, always:

- **Check the file** reads it and tells you what would happen. Nothing is saved.
- **Import** writes it — and only if every row is good. If one row is wrong,
  nothing goes in. The line numbers it shows are the line numbers in your
  spreadsheet, so a problem is easy to find.

For opening balances: everything the kiln owns is a debit, so credit the total
to **Owner's Capital** to make the set balance.

## A working day

### Production

**Production → Batches.** A batch moves through its stages: making → drying →
firing → sorting. Record each as it happens.

Sorting is the one that matters to stock: the good bricks go into the yard by
grade, and the broken and reject are recorded but not stocked. Fuel and soil
consumed are entered on the stage that used them.

### Labour

**Labour → Attendance** each day — by gang or by worker. The system refuses the
same worker marked twice on one day, because that is how a day gets paid twice.

**Advances** are money paid before the work. The screen warns when a Sardar's
outstanding advance is getting large, because recovering it is the problem that
shows up at settlement, not before.

**Wages** are accrued for a period and then settled. An overlapping period is
refused — wages for 1–15 and then 1–31 would pay the first fortnight twice.

### Buying

**Purchases → Orders** for what you have ordered, **Goods in** when the truck
arrives (that is what puts it into stock), **Bills** when the supplier's invoice
comes (that is what puts the value into the books), then **Payments**.

Receiving goods and booking a bill is the store keeper's job. **Paying needs a
second permission**, because releasing money is somebody else's signature.

### Selling

**Sales → Invoices.** Pick the customer, the kiln, the lines. The tax is chosen
for you: in-state is CGST + SGST, out-of-state is IGST, and the screen says
which applies and why. Issuing an invoice takes the bricks out of the yard and
posts the journal in one step — if the yard would go negative, nothing is saved.

**Receipts** are recorded against specific invoices, so you always know which
bill is still open rather than only the total.

**Credit notes** take money off a bill. If bricks actually came back, give the
quantity and a yard — that puts them back into stock. If it is only a rate
correction, leave the quantity blank.

### Dispatch

**Dispatch → Challans.** Raise it, then confirm it when the truck actually
leaves — that is when the stock moves, not when the paper is written. Delivery
is recorded separately, by whoever receives the signed copy.

A load can be billed before or after it leaves. Either way the bricks leave the
yard exactly once, and the challan row says which document did it.

**Gate report** is the one to read daily: every truck that left, what was
billed against it, and what was not. Trucks that left with no bill at all are
counted at the top.

## Money

**Reports → Expenses** for everything else the kiln spends — electricity,
diesel, repairs, food. Say how it was settled: paid from cash or a bank
account, or left owed to someone. An unpaid expense is shown as _owed_, not as
money that moved.

**Reports → Cash & bank** shows every movement with the other side of the entry
on the same row and a running balance.

**Accounts → Day book / Ledgers / Trial balance** are the books themselves.

## What the owner reads

**Dashboard** — production, stock, sold, collected, what is owed to you and by
you, expenses, estimated profit, and **cost per 1,000 bricks** against the
₹4,100 benchmark. A month with no firing shows _Not yet_ rather than ₹0,
because zero would read as "it costs nothing to make a brick".

**Reports → Cost per 1,000** breaks that down by kiln, month and brick type,
with what the grade actually fetched beside what it cost.

**Reports → Daily** is one page for one day across every module — the answer to
"what happened yesterday".

**Reports → Statements** is the P&L and the Balance Sheet. Price the closing
stock first: a grade nobody has priced is left out of both and the page says so
rather than counting it as worthless.

## GST

**Reports → GST** leads with the reconciliation, because the question is "can I
file this month?". A month whose numbers agree but whose invoices have no HSN
is shown as **not ready** — the portal rejects those rows.

GSTR-1 and GSTR-3B are below it, and GSTR-1 exports as CSV for your CA.

## Things the system will refuse, and why

These are not bugs. Each one is a mistake that is expensive to find later.

- **Stock going negative.** Only a counted adjustment may do it, and it needs a
  reason typed in.
- **A sale charged the wrong tax for where it is going.** Tax paid to the wrong
  government costs interest at filing.
- **A document dated in the future.** A mistyped year quietly distorts every
  report.
- **Wages accrued twice for overlapping periods**, or **a worker marked twice
  in a day**.
- **Closing a financial year twice.** Doing so would double every opening
  balance with nothing on screen to show it.
- **An invoice for more than the challan carried.**

## When something looks wrong

Every change to money or stock is recorded — who, what, when, and the values
before and after. **Audit log** in the sidebar, for the owner.
