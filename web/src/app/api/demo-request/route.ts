import { NextResponse } from 'next/server';
import { validateDemoRequest } from '@/lib/demo-request';

/**
 * POST /api/demo-request — the home page's "Book a Demo" form.
 *
 * TODO(demo-leads): this only validates and logs. Before launch, send each
 * lead somewhere a person will see it: an email to sales, a WhatsApp message
 * through the notifications outbox (NTF-01), or a `demo_requests` table via the
 * API. Until then leads exist only in the Vercel function logs.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: 'BAD_JSON', message: 'Body must be JSON' } }, { status: 400 });
  }
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request' } }, { status: 422 });
  }

  const result = validateDemoRequest(body as Record<string, unknown>);
  if (!result.ok) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Please check the form', fields: result.errors } },
      { status: 422 },
    );
  }

  // eslint-disable-next-line no-console -- the only lead sink until TODO(demo-leads) above is done
  console.info('[demo-request]', JSON.stringify({ ...result.data, receivedAt: new Date().toISOString() }));
  return NextResponse.json({ data: { received: true } }, { status: 201 });
}
