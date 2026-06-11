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
export { configureAuthKit, getWorkOS } from './config.js';
export { authkitMiddleware } from './middleware.js';
export { createRouteMatcher } from './matcher.js';
export { switchToOrganization } from './auth.js';
export {
  createCallbackHandler,
  createSignOutHandler,
  getSignInUrl,
  getSignUpUrl,
  handleCallback,
  handleSignIn,
  handleSignOut,
  handleSignUp,
} from './routes.js';
export { verifyWebhook } from './webhooks.js';

export type { RouteMatcherInput } from './matcher.js';
export type { VerifyWebhookOptions } from './webhooks.js';
export type {
  AuthKitAuth,
  AuthKitConfig,
  AuthKitMiddlewareHandler,
  AuthkitMiddlewareOptions,
  CallbackHandlerOptions,
  CallbackSuccess,
  HasCheckParams,
  ProtectedRoutes,
  RedirectToSignInOptions,
  SessionClaims,
  SignedInAuth,
  SignedOutAuth,
  SignInOptions,
  SignOutHandlerOptions,
} from './types.js';
export type { AuthCondition, ClientAuth, ClientUser } from './shared.js';

// Re-export the underlying types users commonly need (User, Organization, etc.).
export type * from '@workos/authkit-session';

import type { AuthKitAuth } from './types.js';

// Type `Astro.locals.auth` everywhere just by importing this package — the
// integration also injects this via `injectTypes` for apps that only
// reference the package in astro.config.
declare global {
  namespace App {
    interface Locals {
      auth: AuthKitAuth;
    }
  }
}
