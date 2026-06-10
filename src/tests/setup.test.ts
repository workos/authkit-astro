import { describe, expect, it } from 'vitest';
import * as authkit from '../index.js';

describe('@workos/authkit-astro public API', () => {
  it('exports the middleware factory', () => {
    expect(typeof authkit.authkitMiddleware).toBe('function');
  });

  it('exports the configuration function', () => {
    expect(typeof authkit.configureAuthKit).toBe('function');
  });

  it('exports the URL helpers', () => {
    expect(typeof authkit.getSignInUrl).toBe('function');
    expect(typeof authkit.getSignUpUrl).toBe('function');
  });

  it('exports the drop-in route handlers', () => {
    expect(typeof authkit.handleSignIn).toBe('function');
    expect(typeof authkit.handleSignUp).toBe('function');
    expect(typeof authkit.handleCallback).toBe('function');
    expect(typeof authkit.handleSignOut).toBe('function');
  });

  it('returns a MiddlewareHandler from authkitMiddleware()', () => {
    const handler = authkit.authkitMiddleware();
    expect(typeof handler).toBe('function');
  });
});
