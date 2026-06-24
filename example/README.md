# @workos/authkit-astro example

A minimal Astro app using the [`@workos/authkit-astro`](../) **integration**.

The entire integration is one line in `astro.config.mjs`:

```js
integrations: [authkit({ protectedRoutes: ['/dashboard'] })];
```

That auto-wires the auth middleware, the `/login` `/signup` `/callback`
`/logout` routes, the `/_authkit/me` session endpoint, and the `astro:env`
secret schema. No middleware or route files in `src/`.

The app then shows:

- `Astro.locals.auth` in pages/components (server, typed automatically), with
  `auth.redirectToSignIn()` guarding `/dashboard`
- the **auth components** (`SignedIn` / `SignedOut` / buttons in the header,
  an `Impersonation` banner in the layout)
- a **prerendered page** (`/about`) where the components resolve client-side
- a **React island** (`src/components/UserBadge.tsx`, `client:load`) reading
  the session via the `useUser()` hook from `@workos/authkit-astro/react`,
  hydrated by `<AuthState />` in the layout `<head>`

## Run

```bash
npm install           # from the package root (links the local SDK into the example)
cp .env.example .env  # fill in from dashboard.workos.com; add http://localhost:4321/callback as a redirect URI
npm --workspace @workos/authkit-astro-example run dev
```

Open <http://localhost:4321>, click **Sign in**, authenticate, and you'll land
on `/dashboard`.
