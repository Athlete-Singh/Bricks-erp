import type { DemoErrors, DemoRequest } from '@/lib/demo-request';

export type DemoSubmitResult = { ok: true } | { ok: false; fields: DemoErrors } | { ok: false; fields?: undefined };

/**
 * Posts the home page's demo form to this app's own route handler
 * (`/api/demo-request`), not the BRICS API, which is why it does not go
 * through `lib/api-client`: no token, no tenant, no refresh.
 */
export async function submitDemoRequest(data: DemoRequest): Promise<DemoSubmitResult> {
  const res = await fetch('/api/demo-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (res.status === 422) {
    const body = (await res.json()) as { error?: { fields?: DemoErrors } };
    return { ok: false, fields: body.error?.fields ?? {} };
  }
  if (!res.ok) throw new Error(`Demo request failed: ${res.status}`);
  return { ok: true };
}
