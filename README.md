# @workos/authkit-astro

Official [WorkOS AuthKit](https://workos.com/docs/user-management) SDK for
[Astro](https://astro.build). Session validation, automatic token refresh,
PKCE sign-in, route protection, and a client-island auth store — built on
[`@workos/authkit-session`](https://www.npmjs.com/package/@workos/authkit-session).

Requires an SSR / on-demand Astro app (an adapter such as `@astrojs/node`).

## Quick start (integration)

```bash
npx astro add @workos/authkit-astro
```

`astro add` installs the package and adds the integration to your config. Or do
it by hand:

```js
// astro.config.mjs
import node from '@astrojs/node';
import workos from '@workos/authkit-astro';
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [workos({ protectedRoutes: ['/dashboard'] })],
});
```

The integration auto-wires everything: the auth **middleware**, the
**/login · /signup · /callback · /logout** routes, the client **session
endpoint**, and the **`astro:env` secret schema**. You also need to install the
WorkOS Node SDK peer (npx handles this for you with `astro add`):

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
workos({
  protectedRoutes: ['/dashboard'], // path prefixes requiring auth (strings only here)
  signInPath: '/login', // where anonymous visitors are sent
  loginPath: '/login', // patterns for the injected routes
  signUpPath: '/signup',
  callbackPath: '/callback',
  logoutPath: '/logout',
  sessionEndpoint: '/_authkit/me', // client store hydration endpoint
  injectRoutes: true,
  injectEnvSchema: true, // declare WORKOS_* in astro:env
  hydrateClient: true, // session endpoint + client bootstrap script
});
```

## Client-island auth store

Read the session reactively from any island (React, Vue, Svelte, Preact, Solid,
or vanilla) via nanostores — the same store works across frameworks. The store
holds a **client-safe** snapshot (no access token).

Hydrate it synchronously by dropping `<AuthState />` in your layout `<head>`:

```astro
---
// src/layouts/Layout.astro
import AuthState from '@workos/authkit-astro/AuthState.astro';
---
<head>
  <AuthState />
</head>
```

(The integration also exposes `/_authkit/me`, so islands hydrate even without
`<AuthState />` — just slightly later.)

Then read it in an island:

```tsx
// React island
import { useStore } from '@nanostores/react';
import { $user, $signedIn } from '@workos/authkit-astro/client';

export function UserBadge() {
  const user = useStore($user);
  return <span>{user ? user.email : 'Signed out'}</span>;
}
```

The client entry exports `$auth`, `$user`, `$signedIn`, `setAuthState()`, and
`hydrateAuth()`. Use the matching `@nanostores/{react,vue,svelte,...}` binding
for your island framework.

## Manual setup (advanced)

Prefer to wire things yourself (custom paths, RegExp/predicate route matching,
no integration)? The building blocks are exported directly.

```ts
// src/middleware.ts
import { authkitMiddleware, configureAuthKit } from '@workos/authkit-astro';
import { WORKOS_API_KEY, WORKOS_CLIENT_ID, WORKOS_COOKIE_PASSWORD, WORKOS_REDIRECT_URI } from 'astro:env/server';

configureAuthKit({
  clientId: WORKOS_CLIENT_ID,
  apiKey: WORKOS_API_KEY,
  redirectUri: WORKOS_REDIRECT_URI,
  cookiePassword: WORKOS_COOKIE_PASSWORD,
});

export const onRequest = authkitMiddleware({
  protectedRoutes: ['/dashboard', /^\/admin/], // string prefix, RegExp, or (pathname) => boolean
});
```

```ts
// src/pages/login.ts   (and signup.ts, callback.ts, logout.ts)
export { handleSignIn as GET } from '@workos/authkit-astro';
```

## API

| Export                                  | Type                | Purpose                                                             |
| --------------------------------------- | ------------------- | ------------------------------------------------------------------- |
| `default` (`workos`)                    | `AstroIntegration`  | The `astro add` integration                                         |
| `authkitMiddleware(options?)`           | `MiddlewareHandler` | Validate session → `Astro.locals.auth`, refresh tokens, gate routes |
| `configureAuthKit(config)`              | `void`              | Provide config explicitly (e.g. from `astro:env`)                   |
| `getSignInUrl(ctx, opts?)`              | `Promise<string>`   | Sign-in URL + writes PKCE verifier cookie (for custom links)        |
| `getSignUpUrl(ctx, opts?)`              | `Promise<string>`   | Sign-up URL variant                                                 |
| `handleSignIn` / `handleSignUp`         | `APIRoute`          | Drop-in GET handlers that redirect to AuthKit                       |
| `handleCallback`                        | `APIRoute`          | Drop-in GET handler for the OAuth callback                          |
| `handleSignOut`                         | `APIRoute`          | Drop-in GET handler that clears the session and logs out            |
| `@workos/authkit-astro/client`          | nanostores          | `$auth`, `$user`, `$signedIn`, `setAuthState`, `hydrateAuth`        |
| `@workos/authkit-astro/AuthState.astro` | component           | Injects the client-safe snapshot for synchronous store hydration    |

### `Astro.locals.auth` (`AuthKitAuth`)

```ts
auth.user; // User | null
auth.sessionId; // string | undefined
auth.accessToken; // string | undefined  (server only — never sent to the client)
auth.organizationId; // string | null
auth.role; // string | null
auth.roles; // string[]
auth.permissions; // string[]
auth.impersonator; // Impersonator | null
```

## How it works

- The middleware calls `withAuth()` once per request, exposes the result on
  `Astro.locals.auth`, and persists a refreshed token when one is issued.
- Cookies (session + the short-lived PKCE verifier) are read and written
  through Astro's native `context.cookies`, which Astro flushes onto the
  response automatically — no manual `Set-Cookie` handling.
- Sign-in is PKCE-bound: the login route writes a per-flow verifier cookie that
  the callback verifies before exchanging the code.
- The client store is hydrated from a **client-safe** projection of the session
  (`toClientAuth`) — the access token is never serialized to the browser.

## Example

A complete runnable app using the integration lives in [`example/`](./example).

## License

MIT
