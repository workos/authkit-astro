import { describe, expect, it } from 'vitest';
import { configureAuthKit, getInstance } from '../config.js';
import { TEST_CONFIG } from './helpers.js';

describe('configureAuthKit / validation', () => {
  it('throws when required fields are missing', () => {
    expect(() => configureAuthKit({ ...TEST_CONFIG, clientId: '' })).toThrow(/WORKOS_CLIENT_ID/);
    expect(() => configureAuthKit({ ...TEST_CONFIG, apiKey: '' })).toThrow(/WORKOS_API_KEY/);
  });

  it('throws when the cookie password is too short', () => {
    expect(() => configureAuthKit({ ...TEST_CONFIG, cookiePassword: 'too-short' })).toThrow(/at least 32/);
  });

  it('accepts a valid config and exposes the service', () => {
    expect(() => configureAuthKit(TEST_CONFIG)).not.toThrow();

    const instance = getInstance();
    expect(typeof instance.withAuth).toBe('function');
    expect(typeof instance.createSignIn).toBe('function');
    expect(typeof instance.handleCallback).toBe('function');
    expect(typeof instance.signOut).toBe('function');
  });
});
