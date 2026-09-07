import { useEffect } from 'react';
import { useUser } from '@insforge/react';
import { insforge } from '../lib/insforge';

/**
 * @insforge/react's InsforgeProvider keeps its own internal InsForge client,
 * separate from the app-wide `insforge` client in lib/insforge.ts that every
 * page uses for `.database`/`.storage` calls (lib/insforge.ts exists at all
 * because the react package's own client doesn't get built with the anon
 * key attached - see the RegisterPage fix in git history).
 *
 * Both clients read/write the same localStorage session, but each only
 * loads it into memory once, at construction time. So when @insforge/react
 * signs a user in or out, our singleton's in-memory auth token doesn't
 * follow along - it keeps using whatever token (or lack of one) it started
 * the page load with. Since requests silently fall back to the anon key
 * when no user token is set, this doesn't throw - it just makes every
 * `insforge.database`/`insforge.storage` call run as an anonymous visitor,
 * which reads (RLS-permitted rows) can mask while writes fail with a
 * confusing "you do not have permission" error.
 *
 * Mounted once near the app root, this re-syncs our singleton's token from
 * localStorage every time @insforge/react's own auth state changes (sign in,
 * sign out, session restore on reload).
 */
export function AuthTokenSync() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded || !user) return;
    // Pulls the current session out of localStorage and applies it to this
    // client's HTTP layer - a no-op if it's already in sync. We deliberately
    // don't mirror the "no user" case with signOut() here: it would clear
    // localStorage, which could race with @insforge/react's own (async)
    // session restore on first load and wipe out a session it hasn't
    // finished validating yet. Explicit sign-outs (handleAuthError, the
    // logout button) already clear this client's session directly.
    insforge.auth.getCurrentSession();
  }, [isLoaded, user?.id]);

  return null;
}
