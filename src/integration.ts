import type { AstroIntegration } from 'astro';
import { envField } from 'astro/config';

/** Options for the `@workos/authkit-astro` Astro integration. */
export interface AuthkitIntegrationOptions {
  /**
   * Path prefixes that require a signed-in user (anonymous visitors are
   * redirected to `signInPath`). Strings only here — for RegExp / predicate
   * matching, wire `authkitMiddleware` manually instead.
   */
  protectedRoutes?: string[];
  /** Where to redirect unauthenticated visitors (default `/login`). */
  signInPath?: string;
  /** Route patterns for the injected handlers. */
  loginPath?: string;
  signUpPath?: string;
  callbackPath?: string;
  logoutPath?: string;
  /** Client session endpoint used by the auth store (default `/_authkit/me`). */
  sessionEndpoint?: string;
  /** Inject the login/signup/callback/logout routes (default `true`). */
  injectRoutes?: boolean;
  /** Declare the WORKOS_* secrets in `astro:env` (default `true`). */
  injectEnvSchema?: boolean;
  /** Inject the session endpoint + client hydration script (default `true`). */
  hydrateClient?: boolean;
}

const VIRTUAL_ID = 'virtual:@workos/authkit-astro/options';
const RESOLVED_VIRTUAL_ID = '\0' + VIRTUAL_ID;

/**
 * WorkOS AuthKit integration for Astro.
 *
 * Auto-wires the auth middleware, the login/signup/callback/logout routes, the
 * client session endpoint, and the `astro:env` secret schema — so a consuming
 * app needs only env vars and (optionally) the client store.
 *
 * @example
 * ```js
 * // astro.config.mjs
 * import workos from '@workos/authkit-astro';
 * export default defineConfig({
 *   integrations: [workos({ protectedRoutes: ['/dashboard'] })],
 * });
 * ```
 */
export default function workos(options: AuthkitIntegrationOptions = {}): AstroIntegration {
  const {
    protectedRoutes = [],
    signInPath = '/login',
    loginPath = '/login',
    signUpPath = '/signup',
    callbackPath = '/callback',
    logoutPath = '/logout',
    sessionEndpoint = '/_authkit/me',
    injectRoutes = true,
    injectEnvSchema = true,
    hydrateClient = true,
  } = options;

  // Only serializable values cross into the injected middleware entrypoint.
  const middlewareOptions = { protectedRoutes, signInPath };

  return {
    name: '@workos/authkit-astro',
    hooks: {
      'astro:config:setup': ({ updateConfig, injectRoute, addMiddleware, injectScript, logger }) => {
        if (injectEnvSchema) {
          updateConfig({
            env: {
              schema: {
                WORKOS_CLIENT_ID: envField.string({ context: 'server', access: 'secret' }),
                WORKOS_API_KEY: envField.string({ context: 'server', access: 'secret' }),
                WORKOS_REDIRECT_URI: envField.string({ context: 'server', access: 'secret' }),
                WORKOS_COOKIE_PASSWORD: envField.string({ context: 'server', access: 'secret' }),
              },
            },
          });
        }

        // Provide the middleware's options through a Vite virtual module.
        updateConfig({
          vite: {
            plugins: [
              {
                name: '@workos/authkit-astro:options',
                resolveId(id: string) {
                  if (id === VIRTUAL_ID) return RESOLVED_VIRTUAL_ID;
                  return undefined;
                },
                load(id: string) {
                  if (id === RESOLVED_VIRTUAL_ID) {
                    return `export default ${JSON.stringify(middlewareOptions)};`;
                  }
                  return undefined;
                },
              },
            ],
          },
        });

        addMiddleware({
          entrypoint: '@workos/authkit-astro/internal/middleware',
          order: 'pre',
        });

        if (injectRoutes) {
          injectRoute({
            pattern: loginPath,
            entrypoint: '@workos/authkit-astro/internal/routes/login',
            prerender: false,
          });
          injectRoute({
            pattern: signUpPath,
            entrypoint: '@workos/authkit-astro/internal/routes/signup',
            prerender: false,
          });
          injectRoute({
            pattern: callbackPath,
            entrypoint: '@workos/authkit-astro/internal/routes/callback',
            prerender: false,
          });
          injectRoute({
            pattern: logoutPath,
            entrypoint: '@workos/authkit-astro/internal/routes/logout',
            prerender: false,
          });
        }

        if (hydrateClient) {
          injectRoute({
            pattern: sessionEndpoint,
            entrypoint: '@workos/authkit-astro/internal/routes/me',
            prerender: false,
          });
          injectScript(
            'page',
            `import { hydrateAuth } from '@workos/authkit-astro/client'; hydrateAuth(${JSON.stringify(sessionEndpoint)});`,
          );
        }

        logger.info('WorkOS AuthKit wired (middleware + routes' + (hydrateClient ? ' + client store' : '') + ')');
      },
    },
  };
}
