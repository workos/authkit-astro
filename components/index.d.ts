// Hand-written types for the .astro components (the Astro compiler owns the
// real prop checking; these give editors prop names outside .astro files).
import type { AuthKitAuth } from '../dist/index.js';
import type { AuthCondition } from '../dist/shared.js';

type AstroComponent<Props = Record<string, never>> = (props: Props) => unknown;

type AnchorProps = {
  path?: string;
  returnTo?: string;
} & Record<string, unknown>;

type ServerOnlyProps = {
  serverOnly?: boolean;
};

export interface OrganizationOption {
  id: string;
  name?: string;
  slug?: string;
  disabled?: boolean;
}

/** Injects the client-safe auth snapshot for synchronous store hydration. */
export declare const AuthState: AstroComponent;
/** Conditional rendering by auth state, with an optional `fallback` slot. */
export declare const Show: AstroComponent<{ when: AuthCondition | ((auth: AuthKitAuth) => boolean) } & ServerOnlyProps>;
/** Renders children only when signed in. */
export declare const SignedIn: AstroComponent<ServerOnlyProps>;
/** Renders children only when signed out. */
export declare const SignedOut: AstroComponent<ServerOnlyProps>;
/** Unstyled link to the sign-in route. */
export declare const SignInButton: AstroComponent<AnchorProps>;
/** Unstyled link to the sign-up route. */
export declare const SignUpButton: AstroComponent<AnchorProps>;
/** Unstyled link to the logout route. */
export declare const SignOutButton: AstroComponent<AnchorProps>;
/** Fixed banner shown while the session is impersonated. */
export declare const Impersonation: AstroComponent<{ logoutPath?: string }>;
/** Account menu for the signed-in user. */
export declare const UserButton: AstroComponent<
  {
    profilePath?: string;
    signOutPath?: string;
    returnTo?: string;
    showName?: boolean;
  } & Record<string, unknown>
>;
/** Server-rendered profile summary for the signed-in user. */
export declare const UserProfile: AstroComponent<
  {
    profilePath?: string;
    signOutPath?: string;
    showId?: boolean;
  } & Record<string, unknown>
>;
/** Form component for switching the active organization. */
export declare const OrganizationSwitcher: AstroComponent<
  {
    organizations: OrganizationOption[];
    action?: string;
    method?: 'get' | 'post';
    name?: string;
    label?: string;
  } & Record<string, unknown>
>;
/** Server-rendered summary of the active organization. */
export declare const OrganizationProfile: AstroComponent<
  {
    name?: string;
    showId?: boolean;
    showPermissions?: boolean;
  } & Record<string, unknown>
>;
