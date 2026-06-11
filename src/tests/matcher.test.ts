import { describe, expect, it } from 'vitest';
import { createRouteMatcher } from '../matcher.js';

describe('createRouteMatcher', () => {
  it('treats plain strings as path prefixes', () => {
    const matches = createRouteMatcher(['/dashboard']);
    expect(matches('/dashboard')).toBe(true);
    expect(matches('/dashboard/settings')).toBe(true);
    expect(matches('/dashboards')).toBe(false);
    expect(matches('/')).toBe(false);
  });

  it('compiles (.*) wildcard patterns', () => {
    const matches = createRouteMatcher(['/dashboard(.*)']);
    expect(matches('/dashboard')).toBe(true);
    expect(matches('/dashboard/settings/billing')).toBe(true);
    expect(matches('/dash')).toBe(false);
  });

  it('compiles :param segments (single segment only)', () => {
    const matches = createRouteMatcher(['/orgs/:slug']);
    expect(matches('/orgs/acme')).toBe(true);
    expect(matches('/orgs/acme/')).toBe(true);
    expect(matches('/orgs/acme/settings')).toBe(false);
    expect(matches('/orgs/')).toBe(false);
  });

  it('compiles * wildcards', () => {
    const matches = createRouteMatcher(['/files/*.pdf']);
    expect(matches('/files/report.pdf')).toBe(true);
    expect(matches('/files/report.txt')).toBe(false);
  });

  it('accepts RegExps and predicates', () => {
    expect(createRouteMatcher([/^\/admin/])('/admin/users')).toBe(true);
    expect(createRouteMatcher((p) => p.endsWith('.json'))('/data.json')).toBe(true);
  });

  it('accepts URLs, Requests, contexts, and pathname strings with queries', () => {
    const matches = createRouteMatcher(['/dashboard(.*)']);
    expect(matches('/dashboard?tab=1')).toBe(true);
    expect(matches(new URL('http://x.test/dashboard/a'))).toBe(true);
    expect(matches(new Request('http://x.test/dashboard'))).toBe(true);
    expect(matches({ url: new URL('http://x.test/dashboard') })).toBe(true);
    expect(matches('http://x.test/dashboard')).toBe(true);
  });

  it('escapes regex metacharacters in literal parts', () => {
    const matches = createRouteMatcher(['/v1.0/:id']);
    expect(matches('/v1.0/abc')).toBe(true);
    expect(matches('/v1x0/abc')).toBe(false);
  });

  it('throws on unbalanced groups', () => {
    expect(() => createRouteMatcher(['/broken(.*'])('/x')).toThrow(/Unbalanced/);
  });
});
