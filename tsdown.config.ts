import { defineConfig } from 'tsdown';

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
  // ESM-only, like the rest of the Astro ecosystem.
  format: 'esm',
  platform: 'node',
  // Emit `.js`/`.d.ts` (honouring `"type": "module"`) rather than tsdown's
  // node-default `.mjs`/`.d.mts`, so the paths match the package.json exports.
  fixedExtension: false,
  // Public type surface only — internal entrypoints are consumed by Astro at
  // build time, not imported for their types, so emitting their .d.ts (which
  // would inline the ambient `astro:env/server` / `virtual:` decls) is avoided.
  dts: {
    entry: ['src/index.ts', 'src/client.ts', 'src/shared.ts'],
  },
  sourcemap: true,
  clean: true,
  deps: {
    // Virtual / Astro-provided modules are resolved by the consuming app's
    // build, not here. (`astro` and the WorkOS packages are auto-externalized
    // as dependencies/peerDependencies.)
    neverBundle: ['astro:env/server', 'astro:middleware', /^virtual:/],
  },
});
