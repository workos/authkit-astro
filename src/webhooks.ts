import type { APIContext } from 'astro';
import type { Event } from '@workos-inc/node';
import { getWorkOS } from './config.js';

/** Options for {@link verifyWebhook}. */
export interface VerifyWebhookOptions {
  /** Webhook signing secret. Defaults to `WORKOS_WEBHOOK_SECRET`. */
  secret?: string;
  /** Maximum allowed age of the signature, in milliseconds. */
  tolerance?: number;
}

/**
 * Verify a WorkOS webhook request (the `workos-signature` header) and return
 * the parsed event. Throws when the signature is missing, stale, or invalid.
 *
 * @example
 * ```ts
 * // src/pages/api/webhooks.ts
 * import { verifyWebhook } from '@workos/authkit-astro';
 *
 * export const POST: APIRoute = async (context) => {
 *   const event = await verifyWebhook(context);
 *   if (event.event === 'user.created') { ... }
 *   return new Response(null, { status: 200 });
 * };
 * ```
 */
export async function verifyWebhook(
  context: Pick<APIContext, 'request'>,
  options: VerifyWebhookOptions = {},
): Promise<Event> {
  const secret = options.secret ?? process.env.WORKOS_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error(
      '[authkit-astro] verifyWebhook needs a signing secret — pass { secret } or set WORKOS_WEBHOOK_SECRET.',
    );
  }

  const sigHeader = context.request.headers.get('workos-signature');
  if (!sigHeader) {
    throw new Error('[authkit-astro] Missing workos-signature header.');
  }

  const payload = (await context.request.json()) as Record<string, unknown>;
  return getWorkOS().webhooks.constructEvent({ payload, sigHeader, secret, tolerance: options.tolerance });
}
