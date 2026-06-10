import type { APIContext } from 'astro';
import type { AstroCookies, AuthKitConfig } from '../types.js';

/** A valid dummy config (cookiePassword is exactly 32 chars). */
export const TEST_CONFIG: AuthKitConfig = {
  clientId: 'client_test123',
  apiKey: 'sk_test_123',
  redirectUri: 'http://localhost:4321/callback',
  cookiePassword: 'a'.repeat(32),
};

export interface FakeCookies {
  get(name: string): { value: string } | undefined;
  set(name: string, value: string, options?: unknown): void;
  delete(name: string, options?: unknown): void;
  has(name: string): boolean;
  /** Record of every set/delete, for assertions. */
  writes: Array<{ name: string; value?: string; deleted?: boolean }>;
}

/** A minimal stand-in for Astro's cookie store. */
export function makeCookies(initial: Record<string, string> = {}): FakeCookies {
  const store = new Map<string, string>(Object.entries(initial));
  const writes: FakeCookies['writes'] = [];
  return {
    get: (name) => (store.has(name) ? { value: store.get(name) as string } : undefined),
    set: (name, value) => {
      store.set(name, String(value));
      writes.push({ name, value: String(value) });
    },
    delete: (name) => {
      store.delete(name);
      writes.push({ name, deleted: true });
    },
    has: (name) => store.has(name),
    writes,
  };
}

/** A minimal APIContext for exercising middleware and route handlers. */
export function makeContext(opts: {
  cookies: FakeCookies;
  pathname?: string;
  search?: string;
  locals?: Record<string, unknown>;
}): APIContext {
  const { cookies, pathname = '/', search = '', locals = {} } = opts;
  const url = new URL(`http://localhost:4321${pathname}${search}`);
  return {
    cookies: cookies as unknown as AstroCookies,
    url,
    locals,
    request: new Request(url),
    redirect: (location: string, status = 302) => new Response(null, { status, headers: { Location: location } }),
  } as unknown as APIContext;
}
