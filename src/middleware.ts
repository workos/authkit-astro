import type { MiddlewareHandler, MiddlewareNext } from 'astro';
import { buildAuth, setActiveSignInPath } from './auth.js';
import { configureAuthKit, getInstance } from './config.js';
import { matchesRoute } from './matcher.js';
import type { AuthKitMiddlewareHandler, AuthkitMiddlewareOptions } from './types.js';

// Treat a request as a browser navigation (redirect to sign-in) only when it
// asks for HTML; everything else — fetch() from islands, curl, API clients —
// gets a 401 instead of an HTML login page.
function wantsHtml(request: Request): boolean {
  return request.headers.get('accept')?.includes('text/html') ?? false;
}

/**
 * Astro middleware that validates the WorkOS session on every request,
 * populates `Astro.locals.auth`, refreshes expiring tokens, and (optionally)
 * gates protected routes.
 *
 * Anonymous requests to a protected route are redirected to `signInPath` when
 * they accept HTML, and receive a 401 JSON response otherwise.
 *
 * Pass a handler for full per-request control — it runs after `locals.auth`
 * is populated (and after the `protectedRoutes` gate, if configured):
 *
 * @example
 * ```ts
 * // src/middleware.ts
 * import { authkitMiddleware, createRouteMatcher } from '@workos/authkit-astro';
 *
 * const isAdminRoute = createRouteMatcher(['/admin(.*)']);
 *
 * export const onRequest = authkitMiddleware((auth, context) => {
 *   if (isAdminRoute(context.url) && !auth.has({ role: 'admin' })) {
 *     return auth.redirectToSignIn();
 *   }
 * });
 * ```
 */
export function authkitMiddleware(options?: AuthkitMiddlewareOptions): MiddlewareHandler;
export function authkitMiddleware(
  handler: AuthKitMiddlewareHandler,
  options?: AuthkitMiddlewareOptions,
): MiddlewareHandler;
export function authkitMiddleware(
  handlerOrOptions?: AuthKitMiddlewareHandler | AuthkitMiddlewareOptions,
  maybeOptions?: AuthkitMiddlewareOptions,
): MiddlewareHandler {
  const handler = typeof handlerOrOptions === 'function' ? handlerOrOptions : undefined;
  const options = (typeof handlerOrOptions === 'function' ? maybeOptions : handlerOrOptions) ?? {};
  const { protectedRoutes, signInPath = '/login', debug = false, onError, config } = options;

  if (config) configureAuthKit(config);
  setActiveSignInPath(signInPath);

  return async (context, next) => {
    // Prerendered routes render at build time with no request cookies — skip
    // session work entirely and leave a signed-out auth on locals. Components
    // fall back to the client store on these pages.
    if (context.isPrerendered) {
      context.locals.auth = buildAuth(null, context, signInPath);
      return next();
    }

    try {
      const instance = getInstance();
      const { auth, refreshedSessionData } = await instance.withAuth(context.cookies);

      context.locals.auth = buildAuth(auth, context, signInPath);

      if (debug) {
        console.log(`[authkit-astro] ${context.url.pathname} → ${auth.user ? auth.user.email : 'anonymous'}`);
      }

      // Persist a refreshed token before continuing. Writing to context.cookies
      // here is enough — Astro flushes it onto the outgoing response.
      if (refreshedSessionData) {
        await instance.saveSession(context.cookies, refreshedSessionData);
      }
    } catch (error) {
      if (debug) console.error('[authkit-astro] middleware error:', error);
      onError?.(error as Error);
      context.locals.auth = buildAuth(null, context, signInPath);
    }

    const auth = context.locals.auth;

    if (!auth.user && matchesRoute(context.url.pathname, protectedRoutes)) {
      if (!wantsHtml(context.request)) {
        return Response.json({ error: 'unauthorized' }, { status: 401 });
      }
      return auth.redirectToSignIn();
    }

    if (handler) {
      // Memoize next() so "handler called next" and "we call next after" never
      // double-invoke the rest of the chain.
      let nextResult: Promise<Response> | undefined;
      const wrappedNext: MiddlewareNext = (payload?: Parameters<MiddlewareNext>[0]) => {
        nextResult ??= payload === undefined ? next() : next(payload);
        return nextResult;
      };

      const result = await handler(auth, context, wrappedNext);
      if (result instanceof Response) return result;
      if (nextResult) return nextResult;
    }

    return next();
  };
}
