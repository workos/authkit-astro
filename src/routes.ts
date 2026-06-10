import type { APIRoute } from 'astro';
import type { HeadersBag } from '@workos/authkit-session';
import { getInstance } from './config.js';
import type { CookieContext, SignInOptions } from './types.js';

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
  const returnTo = context.url.searchParams.get('returnTo') ?? undefined;
  return context.redirect(await getSignInUrl(context, { returnTo }));
};

/** Drop-in GET handler that redirects to WorkOS sign-up. */
export const handleSignUp: APIRoute = async (context) => {
  const returnTo = context.url.searchParams.get('returnTo') ?? undefined;
  return context.redirect(await getSignUpUrl(context, { returnTo }));
};

/**
 * Drop-in GET handler for the OAuth callback. Verifies the PKCE state, exchanges
 * the code, sets the session cookie, and redirects to the original destination.
 * @example `// src/pages/callback.ts` → `export { handleCallback as GET } from '@workos/authkit-astro';`
 */
export const handleCallback: APIRoute = async (context) => {
  const instance = getInstance();
  const code = context.url.searchParams.get('code');
  const state = context.url.searchParams.get('state') ?? undefined;
  const error = context.url.searchParams.get('error');

  if (error) {
    const description = context.url.searchParams.get('error_description') ?? '';
    if (state) await instance.clearPendingVerifier(context.cookies, { state });
    return new Response(`Authentication failed: ${error} ${description}`.trim(), { status: 400 });
  }

  if (!code) {
    return new Response('Authentication failed: missing ?code in callback URL', { status: 400 });
  }

  try {
    const { returnPathname } = await instance.handleCallback(context.cookies, context.cookies, { code, state });
    return context.redirect(returnPathname ?? '/');
  } catch (err) {
    // Clear the lingering verifier (when we can identify it) and surface the error.
    if (state) await instance.clearPendingVerifier(context.cookies, { state });
    return new Response(`Authentication failed: ${(err as Error).message}`, { status: 400 });
  }
};

/**
 * Drop-in GET handler that clears the local session and redirects to the WorkOS
 * logout URL.
 * @example `// src/pages/logout.ts` → `export { handleSignOut as GET } from '@workos/authkit-astro';`
 */
export const handleSignOut: APIRoute = async (context) => {
  const auth = context.locals.auth;
  if (!auth?.user || !auth.sessionId) {
    return context.redirect('/');
  }

  const returnTo = new URL('/', context.url).toString();
  const { logoutUrl, headers } = await getInstance().signOut(auth.sessionId, { returnTo });

  // signOut clears the session via a `Set-Cookie` headers bag (it passes an
  // undefined store to storage), so apply those headers to the redirect.
  const response = context.redirect(logoutUrl);
  applySetCookie(response, headers);
  return response;
};

function applySetCookie(response: Response, headers: HeadersBag | undefined): void {
  const setCookie = headers?.['Set-Cookie'] ?? headers?.['set-cookie'];
  if (!setCookie) return;
  for (const value of Array.isArray(setCookie) ? setCookie : [setCookie]) {
    response.headers.append('Set-Cookie', value);
  }
}
