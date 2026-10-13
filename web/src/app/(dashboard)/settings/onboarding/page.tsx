'use client';

import { Download, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { ONBOARDING_KINDS, PERMISSIONS, type OnboardingKind } from '@brics/shared';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { messageOf, useSession } from '@/features/auth/use-auth';
import { commitImport, previewImport, type OnboardingReport } from '@/features/onboarding/api';
import { parseCsv, TEMPLATES } from '@/features/onboarding/csv';
import { downloadCsv } from '@/features/dashboard/csv';

const LABELS: Record<OnboardingKind, string> = {
  parties: 'Parties — customers, suppliers, Sardars',
  items: 'Items and brick grades',
  'opening-balances': 'Opening balances',
  'opening-stock': 'Opening stock',
};

/**
 * ONB-01 — the go-live import.
 *
 * Two steps on purpose. **Check** reads the file and says what would happen,
 * writing nothing; **Import** does it, and only if every row is good. A
 * half-imported party list at go-live is worse than none: nobody can tell
 * which half landed, re-running duplicates it, and the kiln's first week of
 * entries is made against a master list no one trusts.
 */
export default function OnboardingPage() {
  const { can } = useSession();
  const [kind, setKind] = useState<OnboardingKind>('parties');
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState('');
  const [fileProblems, setFileProblems] = useState<string[]>([]);
  const [report, setReport] = useState<OnboardingReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  if (!can(PERMISSIONS.ACCOUNTS_MANAGE)) {
    return <Alert variant="info">You do not have access to the go-live import.</Alert>;
  }

  const reset = () => {
    setRows([]);
    setFileName('');
    setFileProblems([]);
    setReport(null);
    setError(null);
  };

  /**
   * Read with a FileReader rather than `file.text()`. The latter is tidier and
   * is not available everywhere this has to run — it returns nothing under
   * jsdom, which is where the screen is tested, and a reader that silently
   * yields an empty file is the worst possible kind.
   */
  const readFile = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(new Error('That file could not be read'));
      reader.readAsText(file);
    });

  const onFile = async (file: File) => {
    reset();
    setFileName(file.name);
    try {
      const parsed = parseCsv(await readFile(file));
      setRows(parsed.rows);
      setFileProblems(parsed.problems);
    } catch (err) {
      setFileProblems([messageOf(err)]);
    }
  };

  const run = async (mode: 'preview' | 'commit') => {
    setBusy(true);
    setError(null);
    try {
      const result = mode === 'preview' ? await previewImport(kind, rows) : await commitImport(kind, rows);
      setReport(result);
    } catch (err) {
      // A refused commit carries the same per-row report, so the screen can
      // show exactly which lines stopped it rather than one flat message.
      const details = (err as { details?: OnboardingReport }).details;
      if (details?.rows) setReport({ ...details, imported: false });
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  };

  const template = TEMPLATES[kind]!;
  const ready = rows.length > 0 && fileProblems.length === 0;
  const clean = report !== null && report.problemCount === 0 && !report.imported;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-lg font-semibold">Go-live import</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bring in what the kiln already has: who it deals with, what it stocks, what the books open at, and what is in
          the yard. Past transactions are not imported — the opening balances stand in for everything before day one.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <Select
          label="What are you importing?"
          value={kind}
          onChange={(e) => {
            setKind(e.target.value as OnboardingKind);
            reset();
            if (fileInput.current) fileInput.current.value = '';
          }}
        >
          {ONBOARDING_KINDS.map((k) => (
            <option key={k} value={k}>
              {LABELS[k]}
            </option>
          ))}
        </Select>
        <Button
          variant="outline"
          onClick={() => downloadCsv(`${kind}-template.csv`, template.columns, [template.example])}
          aria-label={`Download the ${kind} template`}
        >
          <Download className="mr-2 h-4 w-4" aria-hidden /> Template
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">{template.note}</p>

      <div className="rounded-lg border border-dashed border-border p-4">
        <label className="flex flex-col items-start gap-2 text-sm">
          <span className="font-medium">Choose the CSV</span>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onFile(file);
            }}
            className="text-sm"
          />
          <span className="text-xs text-muted-foreground">
            The file is read here in your browser. Nothing is uploaded or stored.
          </span>
        </label>

        {fileName && (
          <p className="mt-3 text-sm">
            <span className="font-medium">{fileName}</span> — {rows.length} row{rows.length === 1 ? '' : 's'}
          </p>
        )}
        {fileProblems.map((p) => (
          <Alert key={p} variant="error" className="mt-2">
            {p}
          </Alert>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={!ready || busy} onClick={() => void run('preview')}>
          Check the file
        </Button>
        <Button disabled={!clean || busy} onClick={() => void run('commit')}>
          <Upload className="mr-2 h-4 w-4" aria-hidden /> Import {report?.okCount ?? ''} rows
        </Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {report?.imported && (
        <Alert variant="success">
          {report.okCount} row{report.okCount === 1 ? '' : 's'} imported.
        </Alert>
      )}

      {report && !report.imported && report.problemCount === 0 && (
        <Alert variant="info">
          Every row reads correctly. Nothing has been saved yet — press Import to write them.
        </Alert>
      )}

      {report && report.problemCount > 0 && (
        <Alert variant="warning">
          {report.problemCount} of {report.rows.length} rows cannot be imported, so none were. Fix them in the
          spreadsheet and check again — the line numbers below match your file.
        </Alert>
      )}

      {report && (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[32rem] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">Line</th>
                <th className="px-3 py-2 font-medium">Row</th>
                <th className="px-3 py-2 font-medium">What happens</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row) => (
                <tr key={row.line} className="border-b border-border/60 last:border-0 align-top">
                  <td className="px-3 py-2 tabular-nums">{row.line}</td>
                  <td className="px-3 py-2">
                    {row.ok ? <Badge variant="success">ok</Badge> : <Badge variant="danger">fix</Badge>}
                  </td>
                  <td className="px-3 py-2">
                    {row.ok ? (
                      row.summary
                    ) : (
                      <ul className="flex flex-col gap-0.5">
                        {row.problems.map((p) => (
                          <li key={p} className="text-danger">
                            {p}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
