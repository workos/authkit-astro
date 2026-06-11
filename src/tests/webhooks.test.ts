import { createHmac } from 'node:crypto';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { configureAuthKit } from '../config.js';
import { verifyWebhook } from '../webhooks.js';
import { TEST_CONFIG } from './helpers.js';

const SECRET = 'whsec_test_secret';

function makeWebhookContext(body: unknown, sigHeader?: string) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (sigHeader) headers['workos-signature'] = sigHeader;
  return {
    request: new Request('http://localhost:4321/api/webhooks', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    }),
  };
}

function sign(payload: unknown, secret = SECRET, timestamp = Date.now()): string {
  const signature = createHmac('sha256', secret)
    .update(`${timestamp}.${JSON.stringify(payload)}`)
    .digest('hex');
  return `t=${timestamp}, v1=${signature}`;
}

const EVENT_PAYLOAD = {
  id: 'event_01H',
  event: 'user.created',
  data: { object: 'user', id: 'user_01H', email: 'a@b.com', created_at: 'now', updated_at: 'now' },
  created_at: '2026-01-01T00:00:00.000Z',
};

beforeAll(() => {
  configureAuthKit(TEST_CONFIG);
});

afterEach(() => {
  delete process.env.WORKOS_WEBHOOK_SECRET;
});

describe('verifyWebhook', () => {
  it('rejects when no secret is configured', async () => {
    const ctx = makeWebhookContext(EVENT_PAYLOAD, sign(EVENT_PAYLOAD));
    await expect(verifyWebhook(ctx)).rejects.toThrow(/secret/);
  });

  it('rejects when the workos-signature header is missing', async () => {
    const ctx = makeWebhookContext(EVENT_PAYLOAD);
    await expect(verifyWebhook(ctx, { secret: SECRET })).rejects.toThrow(/workos-signature/);
  });

  it('accepts a correctly signed payload and returns the parsed event', async () => {
    const ctx = makeWebhookContext(EVENT_PAYLOAD, sign(EVENT_PAYLOAD));
    const event = await verifyWebhook(ctx, { secret: SECRET });
    expect(event.id).toBe('event_01H');
    expect(event.event).toBe('user.created');
  });

  it('reads the secret from WORKOS_WEBHOOK_SECRET', async () => {
    process.env.WORKOS_WEBHOOK_SECRET = SECRET;
    const ctx = makeWebhookContext(EVENT_PAYLOAD, sign(EVENT_PAYLOAD));
    const event = await verifyWebhook(ctx);
    expect(event.id).toBe('event_01H');
  });

  it('rejects a tampered signature', async () => {
    const ctx = makeWebhookContext(EVENT_PAYLOAD, sign(EVENT_PAYLOAD, 'whsec_wrong'));
    await expect(verifyWebhook(ctx, { secret: SECRET })).rejects.toThrow(/signature hash/i);
  });

  it('rejects a stale timestamp', async () => {
    const ctx = makeWebhookContext(EVENT_PAYLOAD, sign(EVENT_PAYLOAD, SECRET, Date.now() - 10 * 60 * 1000));
    await expect(verifyWebhook(ctx, { secret: SECRET })).rejects.toThrow(/tolerance/i);
  });
});
