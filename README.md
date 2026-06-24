# @workos/authkit-astro

Official [WorkOS AuthKit](https://workos.com/docs/user-management) SDK for
[Astro](https://astro.build). Session validation, automatic token refresh,
PKCE sign-in, route protection, auth components, and a client-island auth
store — built on
[`@workos/authkit-session`](https://www.npmjs.com/package/@workos/authkit-session).

Requires an SSR / on-demand Astro app (an adapter such as `@astrojs/node`).
Individual pages may still opt into prerendering — see
[Prerendered pages](#prerendered-pages).

## Quick start (integration)

```bash
npx astro add @workos/authkit-astro
```

`astro add` installs the package and adds the integration to your config. Or do
it by hand:

```js
// astro.config.mjs
import node from '@astrojs/node';
import authkit from '@workos/authkit-astro';
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [authkit({ protectedRoutes: ['/dashboard'] })],
});
```

The integration auto-wires everything: the auth **middleware**, the
**/login · /signup · /callback · /logout** routes, the client **session
endpoint**, the **`astro:env` secret schema**, and the **`Astro.locals.auth`
types**. You also need to install the WorkOS Node SDK peer (npx handles this
for you with `astro add`):

```bash
npm add @workos-inc/node
```

Then provide the env vars (read at runtime via `astro:env`, never bundled):

```bash
WORKOS_CLIENT_ID=client_...
WORKOS_API_KEY=sk_test_...
WORKOS_REDIRECT_URI=http://localhost:4321/callback
WORKOS_COOKIE_PASSWORD=at-least-32-characters-long-secret   # openssl rand -base64 32
```

Add `http://localhost:4321/callback` as a redirect URI in the
[WorkOS dashboard](https://dashboard.workos.com). That's it — `/dashboard` now
redirects anonymous visitors to sign-in, and `Astro.locals.auth` is populated
(and typed) everywhere.

```astro
---
const { auth } = Astro.locals;
---
{
  auth.user ? (
    <span>Signed in as {auth.user.email} · <a href="/logout">Sign out</a></span>
  ) : (
    <a href="/login">Sign in</a>
  )
}
```

### Integration options

```ts
authkit({
  protectedRoutes: ['/dashboard(.*)'], // prefixes or path-to-regexp 6.x patterns
  signInPath: '/login', // where anonymous visitors are sent
  loginPath: '/login', // patterns for the injected routes
  signUpPath: '/signup',
  callbackPath: '/callback',
  logoutPath: '/logout',
  afterSignOutUrl: '/', // where /logout lands (also accepts ?returnTo=)
  errorRedirect: '/login', // redirect (with ?error=) on callback failure instead of a 400
  sessionEndpoint: '/_authkit/me', // client store hydration endpoint
  injectRoutes: true,
  injectEnvSchema: true, // declare WORKOS_* in astro:env
  hydrateClient: true, // session endpoint + client bootstrap script
});
```

`protectedRoutes` accepts plain prefixes (`/dashboard` also matches
`/dashboard/...`) and `path-to-regexp` 6.x patterns (`/dashboard(.*)`,
`/orgs/:slug`, `/orgs/:slug?`,
`/files/:path*`, `/users/:id(\\d+)`). Plain prefixes match nested paths;
patterns match the full pathname. Anonymous browser navigations are redirected
to `signInPath`; non-HTML requests (e.g. `fetch()` from an island) get a `401`
JSON response instead.

## `Astro.locals.auth`

A discriminated union on `user` — checking `if (auth.user)` narrows
`sessionId`, `accessToken`, and `claims` to non-optional types.

```ts
auth.user; // User | null
auth.sessionId; // string  (signed in)
auth.accessToken; // string  (signed in; server only — never sent to the client)
auth.claims; // verified JWT claims, incl. custom claims (signed in)
auth.organizationId; // string | null
auth.role; // string | null
auth.roles; // string[]
auth.permissions; // string[]
auth.entitlements; // string[]
auth.featureFlags; // string[]
auth.impersonator; // Impersonator | null

auth.has({ role: 'admin' }); // boolean — also permission / entitlement / featureFlag; ANDs checks
auth.redirectToSignIn(); // Response — redirect to sign-in, returnTo = current URL
```

Guard a page or endpoint imperatively:

```astro
---
const { auth } = Astro.locals;
if (!auth.user) return auth.redirectToSignIn();
if (!auth.has({ permission: 'billing:manage' })) return new Response(null, { status: 403 });
---
```

## Components

Server-rendered control and button components (the unmatched branch never
reaches the browser on request-rendered pages):

```astro
---
import {
  AuthState,    // synchronous client-store hydration (put in <head>)
  Show,         // <Show when={{ role: 'admin' }}> ... <p slot="fallback">…</p> </Show>
  SignedIn,     // children render only when signed in
  SignedOut,    // children render only when signed out
  SignInButton, // <a> to the login route; props: path, returnTo, + anchor attrs
  SignUpButton,
  SignOutButton,
  Impersonation, // fixed banner while the session is impersonated
  UserButton, // account menu built from Astro.locals.auth.user
  UserProfile, // server-rendered user summary
  OrganizationSwitcher, // form for posting an active org switch
  OrganizationProfile, // active organization summary
} from '@workos/authkit-astro/components';
---

<SignedIn>
  Welcome back! <UserButton profilePath="/account" />
</SignedIn>
<SignedOut>
  <SignInButton returnTo="/dashboard">Log in</SignInButton>
</SignedOut>

<Show when={{ permission: 'invoices:create' }}>
  <a href="/invoices/new">New invoice</a>
  <span slot="fallback">Ask an admin for access.</span>
</Show>
```

`when` accepts `'signed-in'`, `'signed-out'`, an object of
role/permission/entitlement/featureFlag checks (ANDed), or a predicate
`(auth) => boolean` (server-rendered pages only). On prerendered pages the
components defer to the client store via a tiny `<authkit-gate>` custom
element instead. Add `serverOnly` to `<SignedIn>`, `<SignedOut>`, or `<Show>`
when prerendered pages must not include gated children in their static HTML:

```astro
<SignedIn serverOnly>
  <SecretAccountLink />
</SignedIn>

<Show when={{ permission: 'billing:manage' }} serverOnly>
  <BillingAdminPanel />
  <span slot="fallback">Not available.</span>
</Show>
```

The user and organization components are intentionally data-driven. `UserButton`
and `UserProfile` render from `Astro.locals.auth.user`. `OrganizationProfile`
renders the active organization id / role / permissions already present in the
session. `OrganizationSwitcher` needs the app to pass the organizations the
user can switch to, and posts the selected id to an endpoint you own:

```astro
<OrganizationSwitcher
  action="/api/switch-org"
  organizations={[
    { id: 'org_123', name: 'Acme' },
    { id: 'org_456', name: 'Globex' },
  ]}
/>
```

## Client-island auth store

Read the session reactively from any island (React, Vue, Svelte, Preact, Solid,
or vanilla) via nanostores — the same store works across frameworks. The store
holds a **client-safe** snapshot (no access token).

Hydrate it synchronously by dropping `<AuthState />` in your layout `<head>`:

```astro
---
// src/layouts/Layout.astro
import { AuthState } from '@workos/authkit-astro/components';
---
<head>
  <AuthState />
</head>
```

(The integration also exposes `/_authkit/me`, so islands hydrate even without
`<AuthState />` — just slightly later. With Astro's `<ClientRouter />` view
transitions, the store re-hydrates automatically after each navigation.)

Then read it in an island:

```tsx
// React island
import { useStore } from '@nanostores/react';
import { $signedIn, $user } from '@workos/authkit-astro/client';

export function UserBadge() {
  const user = useStore($user);
  return <span>{user ? user.email : 'Signed out'}</span>;
}
```

The client entry exports the stores `$auth`, `$user`, `$signedIn`,
`$isLoaded`, `$organizationId`, `$role`, `$permissions` and the helpers
`setAuthState()` / `hydrateAuth()`. `$isLoaded` distinguishes "not hydrated
yet" from "signed out" — gate loading UI on it. Use the matching
`@nanostores/{react,vue,svelte,...}` binding for your island framework — or,
for React, the zero-dependency hooks:

```tsx
import { useAuth, useUser } from '@workos/authkit-astro/react';

export function UserBadge() {
  const { user, isLoaded } = useUser();
  if (!isLoaded) return null;
  return <span>{user ? user.email : 'Signed out'}</span>;
}
```

## Manual setup (advanced)

Prefer to wire things yourself (custom paths, full middleware control, no
integration)? The building blocks are exported directly.

```ts
// src/middleware.ts
import { authkitMiddleware, configureAuthKit, createRouteMatcher } from '@workos/authkit-astro';
import { WORKOS_API_KEY, WORKOS_CLIENT_ID, WORKOS_COOKIE_PASSWORD, WORKOS_REDIRECT_URI } from 'astro:env/server';

configureAuthKit({
  clientId: WORKOS_CLIENT_ID,
  apiKey: WORKOS_API_KEY,
  redirectUri: WORKOS_REDIRECT_URI,
  cookiePassword: WORKOS_COOKIE_PASSWORD,
});

// Options form — string prefix, pattern, RegExp, or (pathname) => boolean:
export const onRequest = authkitMiddleware({
  protectedRoutes: ['/dashboard(.*)', /^\/admin/],
});
```

Or take full per-request control with the handler form:

```ts
const isAdminRoute = createRouteMatcher(['/admin(.*)', '/orgs/:slug/admin']);

export const onRequest = authkitMiddleware((auth, context) => {
  if (isAdminRoute(context.url) && !auth.has({ role: 'admin' })) {
    return auth.redirectToSignIn();
  }
});
```

```ts
// src/pages/login.ts   (and signup.ts, logout.ts)
export { handleSignIn as GET } from '@workos/authkit-astro';
```

```ts
// src/pages/callback.ts — drop-in, or customized:
import { createCallbackHandler } from '@workos/authkit-astro';
export const GET = createCallbackHandler({
  errorRedirect: '/login',
  onSuccess: (_ctx, { authResponse }) => console.log('signed in', authResponse.user.id),
});
```

## Organizations

Switch the session's active organization (refreshes the access token scoped to
the org and persists the new session cookie):

```ts
// src/pages/api/switch-org.ts
import { switchToOrganization } from '@workos/authkit-astro';

export const POST: APIRoute = async (context) => {
  const { organizationId } = await context.request.json();
  const auth = await switchToOrganization(context, organizationId);
  return Response.json({
    organizationId: auth.organizationId,
    role: auth.role,
  });
};
```

Use that endpoint with `<OrganizationSwitcher />`:

```astro
---
import { OrganizationSwitcher } from '@workos/authkit-astro/components';
---

<OrganizationSwitcher
  action="/api/switch-org"
  organizations={[
    { id: 'org_123', name: 'Acme' },
    { id: 'org_456', name: 'Globex' },
  ]}
/>
```

## WorkOS API access

The full WorkOS Node client, sharing the SDK's configuration:

```ts
import { getWorkOS } from '@workos/authkit-astro';

const org = await getWorkOS().organizations.getOrganization(auth.organizationId);
```

## Webhooks

Verify the `workos-signature` header and get a parsed event back:

```ts
// src/pages/api/webhooks.ts
import { verifyWebhook } from '@workos/authkit-astro';

export const POST: APIRoute = async (context) => {
  const event = await verifyWebhook(context); // secret from WORKOS_WEBHOOK_SECRET
  if (event.event === 'user.created') {
    // ...
  }
  return new Response(null, { status: 200 });
};
```

## Prerendered pages

Pages with `export const prerender = true` build without a request, so the
middleware skips session work there (`locals.auth` is signed-out and builds
don't need the `WORKOS_*` secrets). On those pages:

- `<SignedIn>` / `<SignedOut>` / `<Show>` defer to the client store and
  resolve after hydration (content is in the HTML — don't put secrets in it).
- `<AuthState />` emits nothing; islands hydrate from the session endpoint.
- Add `serverOnly` to `<SignedIn>`, `<SignedOut>`, or `<Show>` to render no
  gated children during prerendering. For `<Show>`, the `fallback` slot is
  rendered instead.

## API

| Export                                 | Type                | Purpose                                                               |
| -------------------------------------- | ------------------- | --------------------------------------------------------------------- |
| `default` (`workos`)                   | `AstroIntegration`  | The `astro add` integration                                           |
| `authkitMiddleware(options?)`          | `MiddlewareHandler` | Validate session → `Astro.locals.auth`, refresh tokens, gate routes   |
| `authkitMiddleware(handler, options?)` | `MiddlewareHandler` | Handler form: `(auth, context, next) =>` for full per-request control |
| `createRouteMatcher(patterns)`         | `(input) => bool`   | Reusable matcher for prefixes / patterns / RegExps / predicates       |
| `configureAuthKit(config)`             | `void`              | Provide config explicitly (e.g. from `astro:env`)                     |
| `getWorkOS()`                          | `WorkOS`            | The configured WorkOS Node client                                     |
| `switchToOrganization(ctx, orgId)`     | `Promise<auth>`     | Switch the session's active organization                              |
| `getSignInUrl(ctx, opts?)`             | `Promise<string>`   | Sign-in URL + writes PKCE verifier cookie (for custom links)          |
| `getSignUpUrl(ctx, opts?)`             | `Promise<string>`   | Sign-up URL variant                                                   |
| `handleSignIn` / `handleSignUp`        | `APIRoute`          | Drop-in GET handlers that redirect to AuthKit                         |
| `handleCallback`                       | `APIRoute`          | Drop-in GET handler for the OAuth callback                            |
| `handleSignOut`                        | `APIRoute`          | Drop-in GET handler that clears the session and logs out              |
| `createCallbackHandler(opts?)`         | `() => APIRoute`    | Callback with `errorRedirect` / `onSuccess` / `onError`               |
| `createSignOutHandler(opts?)`          | `() => APIRoute`    | Sign-out with a custom `afterSignOutUrl`                              |
| `verifyWebhook(ctx, opts?)`            | `Promise<Event>`    | Verify + parse a WorkOS webhook request                               |
| `@workos/authkit-astro/components`     | Astro components    | `AuthState`, gates/buttons, impersonation, user/org components        |
| `@workos/authkit-astro/client`         | nanostores          | `$auth`, `$user`, `$signedIn`, `$isLoaded`, …, `hydrateAuth`          |
| `@workos/authkit-astro/react`          | hooks               | `useAuth()`, `useUser()` (no extra deps)                              |

## How it works

- The middleware calls `withAuth()` once per request, exposes the result on
  `Astro.locals.auth`, and persists a refreshed token when one is issued.
- Cookies (session + the short-lived PKCE verifier) are read and written
  through Astro's native `context.cookies`, which Astro flushes onto the
  response automatically — no manual `Set-Cookie` handling.
- Sign-in is PKCE-bound: the login route writes a per-flow verifier cookie that
  the callback verifies before exchanging the code.
- `returnTo` values are restricted to relative paths everywhere, so the
  login/logout flows can't be used as open redirects.
- The client store is hydrated from a **client-safe** projection of the session
  (`toClientAuth`) — the access token is never serialized to the browser.

## Example

A complete runnable app using the integration lives in [`example/`](./example).

## License

MIT
