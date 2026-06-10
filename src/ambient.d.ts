// Ambient declarations so the package's own `tsc` typecheck resolves the
// virtual modules used by the integration-injected entrypoints. These are NOT
// shipped in the published types (dts is emitted only for index/client/shared),
// so they cannot clash with Astro's real `astro:env/server` types in consumers.

declare module 'virtual:@workos/authkit-astro/options' {
  const options: {
    protectedRoutes: string[];
    signInPath: string;
  };
  export default options;
}

declare module 'astro:env/server' {
  export const WORKOS_CLIENT_ID: string;
  export const WORKOS_API_KEY: string;
  export const WORKOS_REDIRECT_URI: string;
  export const WORKOS_COOKIE_PASSWORD: string;
}
