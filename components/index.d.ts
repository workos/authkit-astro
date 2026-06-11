// Hand-written types for the .astro components (the Astro compiler owns the
// real prop checking; these give editors prop names outside .astro files).
import type { AuthKitAuth } from '../dist/index.js';
import type { AuthCondition } from '../dist/shared.js';

type AstroComponent<Props = Record<string, never>> = (props: Props) => unknown;

type AnchorProps = {
  path?: string;
  returnTo?: string;
} & Record<string, unknown>;

/** Injects the client-safe auth snapshot for synchronous store hydration. */
export declare const AuthState: AstroComponent;
/** Conditional rendering by auth state, with an optional `fallback` slot. */
export declare const Show: AstroComponent<{ when: AuthCondition | ((auth: AuthKitAuth) => boolean) }>;
/** Renders children only when signed in. */
export declare const SignedIn: AstroComponent;
/** Renders children only when signed out. */
export declare const SignedOut: AstroComponent;
/** Unstyled link to the sign-in route. */
export declare const SignInButton: AstroComponent<AnchorProps>;
/** Unstyled link to the sign-up route. */
export declare const SignUpButton: AstroComponent<AnchorProps>;
/** Unstyled link to the logout route. */
export declare const SignOutButton: AstroComponent<AnchorProps>;
/** Fixed banner shown while the session is impersonated. */
export declare const Impersonation: AstroComponent<{ logoutPath?: string }>;
