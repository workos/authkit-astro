import { configure, createAuthService } from '@workos/authkit-session';
import { AstroSessionStorage } from './storage.js';
import type { AstroCookies, AuthKitConfig } from './types.js';

/** The lazily-initialized AuthKit service, keyed to Astro's cookie store. */
export type AuthKitInstance = ReturnType<typeof createAuthService<AstroCookies, AstroCookies>>;

const REQUIRED_FIELDS = [
  { key: 'clientId', envVar: 'WORKOS_CLIENT_ID' },
  { key: 'apiKey', envVar: 'WORKOS_API_KEY' },
  { key: 'redirectUri', envVar: 'WORKOS_REDIRECT_URI' },
  { key: 'cookiePassword', envVar: 'WORKOS_COOKIE_PASSWORD' },
] as const;

let instance: AuthKitInstance | null = null;

function validateConfig(config: AuthKitConfig): void {
  const missing = REQUIRED_FIELDS.filter((f) => !config[f.key]).map((f) => f.envVar);

  if (missing.length > 0) {
    throw new Error(
      `[authkit-astro] Missing required configuration: ${missing.join(', ')}\n\n` +
        `Set these environment variables, or call configureAuthKit() in src/middleware.ts:\n\n` +
        `  import { authkitMiddleware, configureAuthKit } from '@workos/authkit-astro';\n` +
        `  import { WORKOS_CLIENT_ID, WORKOS_API_KEY, WORKOS_REDIRECT_URI, WORKOS_COOKIE_PASSWORD } from 'astro:env/server';\n\n` +
        `  configureAuthKit({\n` +
        `    clientId: WORKOS_CLIENT_ID,\n` +
        `    apiKey: WORKOS_API_KEY,\n` +
        `    redirectUri: WORKOS_REDIRECT_URI,\n` +
        `    cookiePassword: WORKOS_COOKIE_PASSWORD,\n` +
        `  });\n\n` +
        `  export const onRequest = authkitMiddleware();\n\n` +
        `Get your values from the WorkOS dashboard: https://dashboard.workos.com`,
    );
  }

  if (config.cookiePassword.length < 32) {
    throw new Error(
      '[authkit-astro] cookiePassword must be at least 32 characters.\n' + 'Generate one with: openssl rand -base64 32',
    );
  }
}

function build(): AuthKitInstance {
  return createAuthService<AstroCookies, AstroCookies>({
    sessionStorageFactory: (resolved) => new AstroSessionStorage(resolved),
  });
}

/**
 * Configure AuthKit explicitly. Call this once, before the middleware runs
 * (typically at the top of `src/middleware.ts`, or done for you by the
 * integration), passing values from `astro:env/server`.
 *
 * This writes to `@workos/authkit-session`'s shared configuration provider, so
 * configuring once — e.g. in the middleware entry — is visible to every route
 * handler in the app (the middleware always runs first).
 */
export function configureAuthKit(config: AuthKitConfig): void {
  validateConfig(config);
  configure(config);
  instance = build();
}

/**
 * Get (lazily creating) the AuthKit service. Configuration is resolved lazily
 * by `@workos/authkit-session` from its shared provider — populated by
 * `configureAuthKit()` or from `process.env` — so this works whether config was
 * set explicitly or via environment variables.
 */
export function getInstance(): AuthKitInstance {
  if (!instance) {
    instance = build();
  }
  return instance;
}
