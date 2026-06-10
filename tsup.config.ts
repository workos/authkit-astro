import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'client': 'src/client.ts',
    'shared': 'src/shared.ts',
    'internal/middleware': 'src/internal/middleware.ts',
    'internal/routes/login': 'src/internal/routes/login.ts',
    'internal/routes/signup': 'src/internal/routes/signup.ts',
    'internal/routes/callback': 'src/internal/routes/callback.ts',
    'internal/routes/logout': 'src/internal/routes/logout.ts',
    'internal/routes/me': 'src/internal/routes/me.ts',
  },
  // ESM-only, like the rest of the Astro ecosystem
  format: ['esm'],
  // Public type surface only — internal entrypoints are consumed by Astro at
  // build time, not imported for their types, so emitting their .d.ts (which
  // would inline the ambient `astro:env/server` / `virtual:` decls) is avoided.
  dts: {
    entry: {
      index: 'src/index.ts',
      client: 'src/client.ts',
      shared: 'src/shared.ts',
    },
  },
  splitting: false,
  sourcemap: true,
  clean: true,
  // Tree-shaking is delegated to the consumer's bundler via `"sideEffects": false`
  // in package.json.
  external: ['astro', 'astro:env/server', 'astro:middleware', /^virtual:/],
});
