// Entrypoint registered via `addMiddleware` by the integration. Reads its
// options from the Vite virtual module and the secrets from `astro:env`, then
// delegates to the same `authkitMiddleware` used in the manual setup.
import type { MiddlewareHandler } from 'astro';
import options from 'virtual:@workos/authkit-astro/options';
import { configureAuthKit } from '../config.js';
import { authkitMiddleware } from '../middleware.js';

// `astro:env/server` is imported lazily: evaluating it validates the secret
// schema, which must not happen while prerendering pages at build time (CI
// shouldn't need real WORKOS_* secrets to build). Secrets are only needed
// once a real request reaches the middleware.
let configured: Promise<void> | undefined;

function ensureConfigured(): Promise<void> {
  configured ??= import('astro:env/server').then((env) => {
    configureAuthKit({
      clientId: env.WORKOS_CLIENT_ID,
      apiKey: env.WORKOS_API_KEY,
      redirectUri: env.WORKOS_REDIRECT_URI,
      cookiePassword: env.WORKOS_COOKIE_PASSWORD,
    });
  });
  return configured;
}

const middleware = authkitMiddleware(options);

export const onRequest: MiddlewareHandler = async (context, next) => {
  if (!context.isPrerendered) await ensureConfigured();
  // authkitMiddleware handlers always resolve to a Response; the cast satisfies
  // MiddlewareHandler's stricter Promise<Response> | Promise<void> union.
  return (await middleware(context, next)) as Response;
};
