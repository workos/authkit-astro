/**
 * @workos/authkit-astro
 *
 * Official WorkOS AuthKit SDK for Astro. Built on `@workos/authkit-session`.
 *
 * The default export is the Astro integration (`astro add @workos/authkit-astro`).
 * The named exports are the building blocks for manual setups.
 */

// Default export: the Astro integration.
export { default } from './integration.js';
export type { AuthkitIntegrationOptions } from './integration.js';

// Server building blocks (manual setup).
export { configureAuthKit } from './config.js';
export { authkitMiddleware } from './middleware.js';
export { getSignInUrl, getSignUpUrl, handleSignIn, handleSignUp, handleCallback, handleSignOut } from './routes.js';

export type { AuthKitAuth, AuthKitConfig, AuthkitMiddlewareOptions, ProtectedRoutes, SignInOptions } from './types.js';
export type { ClientAuth, ClientUser } from './shared.js';

// Re-export the underlying types users commonly need (User, Organization, etc.).
export type * from '@workos/authkit-session';

import type { AuthKitAuth } from './types.js';

// Type `Astro.locals.auth` everywhere just by importing this package — no
// manual `App.Locals` augmentation required in the consuming app.
declare global {
  namespace App {
    interface Locals {
      auth: AuthKitAuth;
    }
  }
}
