import type { ProtectedRoutes } from './types.js';
import { pathToRegexp } from 'path-to-regexp';

/** Accepted by a route matcher: a pathname, URL, `Request`, or `APIContext`. */
export type RouteMatcherInput = string | URL | { url: URL | string };

/**
 * Build a reusable route matcher from the same patterns `protectedRoutes`
 * accepts — plain-string prefixes, `path-to-regexp` 6.x strings
 * (`/dashboard(.*)`, `/orgs/:slug`), RegExps, or a pathname predicate.
 *
 * @example
 * ```ts
 * const isProtected = createRouteMatcher(['/dashboard(.*)', '/forum(.*)']);
 * export const onRequest = authkitMiddleware((auth, context) => {
 *   if (!auth.user && isProtected(context.url)) return auth.redirectToSignIn();
 * });
 * ```
 */
export function createRouteMatcher(routes: ProtectedRoutes): (input: RouteMatcherInput) => boolean {
  return (input) => matchesRoute(toPathname(input), routes);
}

/** Evaluate `routes` against a pathname (the middleware's internal matcher). */
export function matchesRoute(pathname: string, routes: ProtectedRoutes | undefined): boolean {
  if (!routes) return false;
  if (typeof routes === 'function') return routes(pathname);
  return routes.some((route) => (typeof route === 'string' ? matchString(pathname, route) : route.test(pathname)));
}

function toPathname(input: RouteMatcherInput): string {
  if (typeof input === 'string') {
    return input.startsWith('/') ? (input.split(/[?#]/, 1)[0] as string) : new URL(input).pathname;
  }
  if (input instanceof URL) return input.pathname;
  const url = input.url;
  return (url instanceof URL ? url : new URL(url)).pathname;
}

// Characters that turn a plain string into a path-to-regexp pattern. Plain
// strings keep the original prefix semantics ('/dashboard' also matches
// '/dashboard/settings'); pattern strings are compiled by path-to-regexp and
// must match the full pathname.
const PATTERN_CHARS = /[(:?+*{}]/;

function matchString(pathname: string, route: string): boolean {
  if (!PATTERN_CHARS.test(route)) {
    return pathname === route || pathname.startsWith(route.endsWith('/') ? route : `${route}/`);
  }
  return compilePattern(route).test(pathname);
}

const patternCache = new Map<string, RegExp>();

function compilePattern(pattern: string): RegExp {
  const cached = patternCache.get(pattern);
  if (cached) return cached;

  const compiled = pathToRegexp(pattern, undefined, { end: true });
  patternCache.set(pattern, compiled);
  return compiled;
}
