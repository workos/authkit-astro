// @ts-check
import node from '@astrojs/node';
import react from '@astrojs/react';
import workos from '@workos/authkit-astro';
import { defineConfig } from 'astro/config';

// The WorkOS integration auto-wires the auth middleware, the
// login/signup/callback/logout routes, the client session endpoint, and the
// astro:env secret schema. The only app-side requirement is the env vars.
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [
    react(),
    workos({
      protectedRoutes: ['/dashboard'],
    }),
  ],
});
