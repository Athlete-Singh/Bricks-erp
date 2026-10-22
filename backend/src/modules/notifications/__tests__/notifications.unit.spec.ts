import { Msg91Provider } from '../providers/msg91.provider';
import { ProviderError, type OutgoingMessage } from '../providers/notification-provider';
import { providerFromEnv } from '../providers/provider.factory';
import { TwilioProvider } from '../providers/twilio.provider';
import { normalizeIndianMobile, renderTemplate, smsDate, smsMoney, smsQuantity } from '../notification-templates';

const message: OutgoingMessage = {
  to: '919876543210',
  channel: 'sms',
  event: 'dispatch_sent',
  body: 'Shree Bricks: Challan DC-00031 - 5,000 left our kiln on 22 Oct 2026. Thank you.',
  variables: { company: 'Shree Bricks', challan: 'DC-00031', quantity: '5,000', date: '22 Oct 2026' },
};

const respond = (status: number, body: unknown) =>
  jest.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe('NTF-01 templates', () => {
  it('fills every variable, in plain ASCII', () => {
    const text = renderTemplate('payment_received', {
      company: 'Shree Bricks',
      amount: smsMoney('125000.5'),
      date: smsDate('2026-10-22'),
      receipt: 'RCT/2026-27/000004',
    });
    expect(text).toBe(
      'Shree Bricks: Received Rs. 1,25,000.50 on 22 Oct 2026, receipt RCT/2026-27/000004. Thank you for your payment.',
    );
    expect(/^[\x20-\x7E]*$/.test(text)).toBe(true);
    expect(smsQuantity('125000')).toBe('1,25,000');
  });

  it.each([
    ['98765 43210', '919876543210'],
    ['+91-98765-43210', '919876543210'],
    ['09876543210', '919876543210'],
    ['919876543210', '919876543210'],
    ['0522 2234567', null], // a landline cannot take an SMS
    ['12345', null],
    [null, null],
  ])('normalises %p to %p', (raw, expected) => {
    expect(normalizeIndianMobile(raw)).toBe(expected);
  });
});

describe('MSG91 provider', () => {
  it('sends the DLT template with the variables and the mobile', async () => {
    const http = respond(200, { type: 'success', message: 'req-42' });
    const provider = new Msg91Provider({ authKey: 'k', templates: { dispatch_sent: 'tpl-1' } }, http);

    await expect(provider.send(message)).resolves.toEqual({ messageId: 'req-42' });
    const [, init] = (http as unknown as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({
      template_id: 'tpl-1',
      short_url: '0',
      recipients: [{ mobiles: '919876543210', ...message.variables }],
    });
    expect((init.headers as Record<string, string>).authkey).toBe('k');
  });

  it('refuses without a template id, and will not retry that', async () => {
    const provider = new Msg91Provider({ authKey: 'k', templates: {} }, respond(200, {}));
    await expect(provider.send(message)).rejects.toMatchObject({ retryable: false });
  });

  it('retries a gateway outage but not a rejected key', async () => {
    const down = new Msg91Provider({ authKey: 'k', templates: { dispatch_sent: 't' } }, respond(503, {}));
    await expect(down.send(message)).rejects.toMatchObject({ retryable: true });
    const badKey = new Msg91Provider(
      { authKey: 'k', templates: { dispatch_sent: 't' } },
      respond(401, { type: 'error', message: 'Invalid authkey' }),
    );
    await expect(badKey.send(message)).rejects.toThrow(/Invalid authkey/);
    await expect(badKey.send(message)).rejects.toMatchObject({ retryable: false });
  });

  it('treats an unreachable gateway as retryable', async () => {
    const http = jest.fn().mockRejectedValue(new Error('ECONNRESET')) as unknown as typeof fetch;
    const provider = new Msg91Provider({ authKey: 'k', templates: { dispatch_sent: 't' } }, http);
    await expect(provider.send(message)).rejects.toBeInstanceOf(ProviderError);
    await expect(provider.send(message)).rejects.toMatchObject({ retryable: true });
  });
});

describe('Twilio provider', () => {
  it('posts the text from a number, with basic auth', async () => {
    const http = respond(201, { sid: 'SM123' });
    const provider = new TwilioProvider({ accountSid: 'AC1', authToken: 't', from: '+15550001111' }, http);

    await expect(provider.send(message)).resolves.toEqual({ messageId: 'SM123' });
    const [url, init] = (http as unknown as jest.Mock).mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.twilio.com/2010-04-01/Accounts/AC1/Messages.json');
    const form = new URLSearchParams(init.body as string);
    expect(form.get('To')).toBe('+919876543210');
    expect(form.get('From')).toBe('+15550001111');
    expect(form.get('Body')).toBe(message.body);
  });

  it('uses a Messaging Service, and the whatsapp: prefix on WhatsApp', async () => {
    const http = respond(201, { sid: 'SM9' });
    await new TwilioProvider({ accountSid: 'AC1', authToken: 't', from: 'MG42' }, http).send({
      ...message,
      channel: 'whatsapp',
    });
    const form = new URLSearchParams(
      ((http as unknown as jest.Mock).mock.calls[0] as [string, RequestInit])[1].body as string,
    );
    expect(form.get('To')).toBe('whatsapp:+919876543210');
    expect(form.get('MessagingServiceSid')).toBe('MG42');
    expect(form.get('From')).toBeNull();
  });

  it('does not retry a number Twilio says is invalid', async () => {
    const provider = new TwilioProvider(
      { accountSid: 'AC1', authToken: 't', from: '+1' },
      respond(400, { message: "The 'To' number is not a valid phone number." }),
    );
    await expect(provider.send(message)).rejects.toMatchObject({ retryable: false });
  });
});

describe('provider from the environment', () => {
  it('logs only, unless a gateway and its credentials are both set', () => {
    expect(providerFromEnv({ NOTIFY_PROVIDER: 'log' }).name).toBe('log');
    expect(providerFromEnv({ NOTIFY_PROVIDER: 'msg91' }).name).toBe('log');
    expect(providerFromEnv({ NOTIFY_PROVIDER: 'msg91', MSG91_AUTH_KEY: 'k' }).name).toBe('msg91');
    expect(providerFromEnv({ NOTIFY_PROVIDER: 'twilio', TWILIO_ACCOUNT_SID: 'a', TWILIO_AUTH_TOKEN: 'b' }).name).toBe(
      'log',
    );
    expect(
      providerFromEnv({ NOTIFY_PROVIDER: 'twilio', TWILIO_ACCOUNT_SID: 'a', TWILIO_AUTH_TOKEN: 'b', TWILIO_FROM: '+1' })
        .name,
    ).toBe('twilio');
  });
});
