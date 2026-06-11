import { useUser } from '@workos/authkit-astro/react';

// A real React island. It reads the WorkOS session from the client store via
// the SDK's zero-dependency React hooks (`@nanostores/react` over the raw
// `$user` atom works just as well). Server-rendered as "signed out" (no
// `window` on the server), then reconciled on hydration from the snapshot
// injected by <AuthState />.
export default function UserBadge() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) return <span>⚛️ … (React island)</span>;
  return <span>{user ? `⚛️ ${user.email} (React island)` : '⚛️ signed out (React island)'}</span>;
}
