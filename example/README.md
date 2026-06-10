# @workos/authkit-astro example

A minimal Astro app using the [`@workos/authkit-astro`](../) **integration**.

The entire integration is one line in `astro.config.mjs`:

```js
integrations: [workos({ protectedRoutes: ['/dashboard'] })];
```

That auto-wires the auth middleware, the `/login` `/signup` `/callback`
`/logout` routes, the `/_authkit/me` session endpoint, and the `astro:env`
secret schema. No middleware or route files in `src/`.

The app then shows:

- `Astro.locals.auth` in pages/components (server, typed automatically)
- a **React island** (`src/components/UserBadge.tsx`, `client:load`) reading the
  session from the **client store** (`@workos/authkit-astro/client`) via
  `@nanostores/react`, hydrated by `<AuthState />` in the layout `<head>`

## Run

```bash
npm install           # from the package root (links the local SDK into the example)
cp .env.example .env  # fill in from dashboard.workos.com; add http://localhost:4321/callback as a redirect URI
npm --workspace @workos/authkit-astro-example run dev
```

Open <http://localhost:4321>, click **Sign in**, authenticate, and you'll land
on `/dashboard`.
