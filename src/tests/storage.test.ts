import { describe, expect, it } from 'vitest';
import { AstroSessionStorage } from '../storage.js';
import { makeCookies, TEST_CONFIG } from './helpers.js';

function storage() {
  return new AstroSessionStorage(TEST_CONFIG);
}

describe('AstroSessionStorage', () => {
  it('reads cookies through Astro.cookies', async () => {
    const cookies = makeCookies({ 'wos-session': 'encrypted-blob' });
    expect(await storage().getCookie(cookies as never, 'wos-session')).toBe('encrypted-blob');
    expect(await storage().getCookie(cookies as never, 'missing')).toBeNull();
  });

  it('writes via context.cookies and returns the store (Astro flushes it)', async () => {
    const cookies = makeCookies();
    const result = await storage().setCookie(cookies as never, 'n', 'v', { path: '/' });

    expect(result.response).toBe(cookies);
    expect(result.headers).toBeUndefined();
    expect(cookies.get('n')?.value).toBe('v');
    expect(cookies.writes).toContainEqual({ name: 'n', value: 'v' });
  });

  it('clears via context.cookies', async () => {
    const cookies = makeCookies({ n: 'v' });
    await storage().clearCookie(cookies as never, 'n', { path: '/' });

    expect(cookies.has('n')).toBe(false);
    expect(cookies.writes).toContainEqual({ name: 'n', deleted: true });
  });

  it('falls back to a Set-Cookie header bag when no store is given (signOut path)', async () => {
    const set = await storage().setCookie(undefined, 'n', 'v', { path: '/' });
    const setCookie = set.headers?.['Set-Cookie'];
    expect(set.response).toBeUndefined();
    expect(String(setCookie)).toContain('n=v');

    const cleared = await storage().clearCookie(undefined, 'n', { path: '/' });
    const clearedCookie = String(cleared.headers?.['Set-Cookie']);
    expect(clearedCookie).toContain('n=');
    expect(clearedCookie.toLowerCase()).toMatch(/max-age=0|expires=/);
  });

  it('round-trips a session via the configured cookie name', async () => {
    const cookies = makeCookies();
    await storage().saveSession(cookies as never, 'sealed');
    expect(cookies.get('wos-session')?.value).toBe('sealed');
    expect(await storage().getSession(cookies as never)).toBe('sealed');
  });
});
