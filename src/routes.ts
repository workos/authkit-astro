import type { APIContext, APIRoute } from 'astro';
import type { HeadersBag } from '@workos/authkit-session';
import { getInstance } from './config.js';
import type { CallbackHandlerOptions, CookieContext, SignInOptions, SignOutHandlerOptions } from './types.js';

/**
 * Keep `returnTo` values on-site: only relative paths are honoured, never
 * absolute (`https://…`) or protocol-relative (`//…`) URLs — otherwise the
 * login/logout flows become open redirects.
 */
function safeReturnTo(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return undefined;
  return value;
}

/**
 * Build the WorkOS sign-in URL and write the PKCE verifier cookie to
 * `context.cookies`. Use from a `.astro` file or endpoint to render a custom
 * sign-in link:
 *
 * @example
 * ```astro
 * ---
 * import { getSignInUrl } from '@workos/authkit-astro';
 * const signInUrl = await getSignInUrl(Astro, { returnTo: '/dashboard' });
 * ---
 * <a href={signInUrl}>Sign in</a>
 * ```
 */
export async function getSignInUrl(context: CookieContext, options: SignInOptions = {}): Promise<string> {
  const { url } = await getInstance().createSignIn(context.cookies, {
    returnPathname: options.returnTo,
    organizationId: options.organizationId,
    loginHint: options.loginHint,
  });
  return url;
}

/** Like {@link getSignInUrl}, but opens the sign-up screen. */
export async function getSignUpUrl(context: CookieContext, options: SignInOptions = {}): Promise<string> {
  const { url } = await getInstance().createSignUp(context.cookies, {
    returnPathname: options.returnTo,
    organizationId: options.organizationId,
    loginHint: options.loginHint,
  });
  return url;
}

/**
 * Drop-in GET handler that redirects to WorkOS sign-in.
 * @example `// src/pages/login.ts` → `export { handleSignIn as GET } from '@workos/authkit-astro';`
 */
export const handleSignIn: APIRoute = async (context) => {
  const returnTo = safeReturnTo(context.url.searchParams.get('returnTo'));
  return context.redirect(await getSignInUrl(context, { returnTo }));
};

/** Drop-in GET handler that redirects to WorkOS sign-up. */
export const handleSignUp: APIRoute = async (context) => {
  const returnTo = safeReturnTo(context.url.searchParams.get('returnTo'));
  return context.redirect(await getSignUpUrl(context, { returnTo }));
};

/**
 * Build a callback GET handler with custom behaviour — an error redirect
 * instead of a 400, or `onSuccess` / `onError` hooks.
 *
 * @example
 * ```ts
 * // src/pages/callback.ts
 * import { createCallbackHandler } from '@workos/authkit-astro';
 * export const GET = createCallbackHandler({
 *   errorRedirect: '/login',
 *   onSuccess: (_ctx, { authResponse }) => console.log('signed in', authResponse.user.id),
 * });
 * ```
 */
export function createCallbackHandler(options: CallbackHandlerOptions = {}): APIRoute {
  const { errorRedirect, onSuccess, onError } = options;

  async function fail(context: APIContext, code: string, description: string): Promise<Response> {
    const handled = await onError?.(context, new Error(description ? `${code}: ${description}` : code));
    if (handled instanceof Response) return handled;
    if (errorRedirect) {
      const target = new URL(errorRedirect, context.url);
      target.searchParams.set('error', code);
      if (description) target.searchParams.set('error_description', description);
      return context.redirect(target.pathname + target.search);
    }
    return new Response(`Authentication failed: ${code} ${description}`.trim(), { status: 400 });
  }

  return async (context) => {
    const instance = getInstance();
    const code = context.url.searchParams.get('code');
    const state = context.url.searchParams.get('state') ?? undefined;
    const oauthError = context.url.searchParams.get('error');

    if (oauthError) {
      const description = context.url.searchParams.get('error_description') ?? '';
      if (state) await instance.clearPendingVerifier(context.cookies, { state });
      return fail(context, oauthError, description);
    }

    if (!code) {
      return fail(context, 'missing_code', 'missing ?code in callback URL');
    }

    try {
      const { returnPathname, authResponse } = await instance.handleCallback(context.cookies, context.cookies, {
        code,
        state,
      });
      const destination = safeReturnTo(returnPathname) ?? '/';

      const custom = await onSuccess?.(context, { returnPathname: destination, authResponse });
      if (custom instanceof Response) return custom;
      if (typeof custom === 'string') return context.redirect(custom);

      return context.redirect(destination);
    } catch (err) {
      // Clear the lingering verifier (when we can identify it) and surface the error.
      if (state) await instance.clearPendingVerifier(context.cookies, { state });
      return fail(context, 'callback_failed', (err as Error).message);
    }
  };
}

/**
 * Drop-in GET handler for the OAuth callback. Verifies the PKCE state, exchanges
 * the code, sets the session cookie, and redirects to the original destination.
 * @example `// src/pages/callback.ts` → `export { handleCallback as GET } from '@workos/authkit-astro';`
 */
export const handleCallback: APIRoute = createCallbackHandler();

/**
 * Build a sign-out GET handler with a custom post-sign-out destination. The
 * handler also honours a `?returnTo=` query param (relative paths only).
 *
 * @example
 * ```ts
 * // src/pages/logout.ts
 * import { createSignOutHandler } from '@workos/authkit-astro';
 * export const GET = createSignOutHandler({ afterSignOutUrl: '/goodbye' });
 * ```
 */
export function createSignOutHandler(options: SignOutHandlerOptions = {}): APIRoute {
  const { afterSignOutUrl = '/' } = options;

  return async (context) => {
    const returnPath = safeReturnTo(context.url.searchParams.get('returnTo')) ?? afterSignOutUrl;
    const auth = context.locals.auth;
    if (!auth?.user || !auth.sessionId) {
      return context.redirect(returnPath);
    }

    const returnTo = new URL(returnPath, context.url).toString();
    const { logoutUrl, headers } = await getInstance().signOut(auth.sessionId, { returnTo });

    // signOut clears the session via a `Set-Cookie` headers bag (it passes an
    // undefined store to storage), so apply those headers to the redirect.
    const response = context.redirect(logoutUrl);
    applySetCookie(response, headers);
    return response;
  };
}

/**
 * Drop-in GET handler that clears the local session and redirects to the WorkOS
 * logout URL.
 * @example `// src/pages/logout.ts` → `export { handleSignOut as GET } from '@workos/authkit-astro';`
 */
export const handleSignOut: APIRoute = createSignOutHandler();

function applySetCookie(response: Response, headers: HeadersBag | undefined): void {
  const setCookie = headers?.['Set-Cookie'] ?? headers?.['set-cookie'];
  if (!setCookie) return;
  for (const value of Array.isArray(setCookie) ? setCookie : [setCookie]) {
    response.headers.append('Set-Cookie', value);
  }
}
