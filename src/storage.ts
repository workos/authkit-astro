import { CookieSessionStorage } from '@workos/authkit-session';
import type { CookieOptions } from '@workos/authkit-session';
import type { AstroCookies } from './types.js';

type AstroCookieSetOptions = NonNullable<Parameters<AstroCookies['set']>[2]>;

/**
 * Session storage backed by Astro's cookie store.
 *
 * Both the "request" and "response" are an `AstroCookies` instance
 * (`context.cookies`). Reads go through `cookies.get()`; writes through
 * `cookies.set()` / `cookies.delete()`, which Astro automatically flushes onto
 * the outgoing response — so callers never touch `Set-Cookie` headers, and
 * multiple cookies in one response (session + PKCE verifier) just work.
 *
 * `signOut()` in `@workos/authkit-session` clears the session with an
 * `undefined` store, so `setCookie`/`clearCookie` fall back to the base
 * headers-only behaviour in that case.
 */
export class AstroSessionStorage extends CookieSessionStorage<AstroCookies, AstroCookies> {
  async getCookie(cookies: AstroCookies, name: string): Promise<string | null> {
    // Astro URL-decodes `.value` (the inverse of its encode-on-set), so the
    // round-trip preserves the exact sealed value PKCE verification needs.
    return cookies.get(name)?.value ?? null;
  }

  override async setCookie(
    cookies: AstroCookies | undefined,
    name: string,
    value: string,
    options: CookieOptions,
  ): Promise<{ response?: AstroCookies; headers?: Record<string, string | string[]> }> {
    if (!cookies) return super.setCookie(undefined, name, value, options);
    cookies.set(name, value, toAstroOptions(options));
    return { response: cookies };
  }

  override async clearCookie(
    cookies: AstroCookies | undefined,
    name: string,
    options: CookieOptions,
  ): Promise<{ response?: AstroCookies; headers?: Record<string, string | string[]> }> {
    if (!cookies) return super.clearCookie(undefined, name, options);
    // Astro matches the cookie to delete on (name, path, domain).
    cookies.delete(name, { path: options.path, domain: options.domain });
    return { response: cookies };
  }
}

function toAstroOptions(options: CookieOptions): AstroCookieSetOptions {
  return {
    path: options.path,
    domain: options.domain,
    maxAge: options.maxAge,
    expires: options.expires,
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite,
  };
}
