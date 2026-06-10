import { useStore } from '@nanostores/react';
import { $signedIn, $user } from '@workos/authkit-astro/client';

// A real React island. It reads the WorkOS session from the client store via
// @nanostores/react — the same `$user` atom any framework island can subscribe
// to. Server-rendered as "signed out" (no `window` on the server), then
// reconciled on hydration from the snapshot injected by <AuthState />.
export default function UserBadge() {
  const user = useStore($user);
  const signedIn = useStore($signedIn);

  return <span>{signedIn && user ? `⚛️ ${user.email} (React island)` : '⚛️ signed out (React island)'}</span>;
}
