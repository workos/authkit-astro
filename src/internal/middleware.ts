// Entrypoint registered via `addMiddleware` by the integration. Reads its
// options from the Vite virtual module and the secrets from `astro:env`, then
// delegates to the same `authkitMiddleware` used in the manual setup.
import { WORKOS_API_KEY, WORKOS_CLIENT_ID, WORKOS_COOKIE_PASSWORD, WORKOS_REDIRECT_URI } from 'astro:env/server';
import options from 'virtual:@workos/authkit-astro/options';
import { configureAuthKit } from '../config.js';
import { authkitMiddleware } from '../middleware.js';

configureAuthKit({
  clientId: WORKOS_CLIENT_ID,
  apiKey: WORKOS_API_KEY,
  redirectUri: WORKOS_REDIRECT_URI,
  cookiePassword: WORKOS_COOKIE_PASSWORD,
});

export const onRequest = authkitMiddleware(options);
