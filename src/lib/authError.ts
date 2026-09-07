import { insforge } from './insforge';

/**
 * True when an error from the InsForge SDK means the stored session token is
 * expired or otherwise rejected by the backend (HTTP 401, "Invalid token" /
 * AUTH_UNAUTHORIZED). The SDK never refreshes tokens on its own, so once a
 * session expires every subsequent request keeps failing with this same
 * error until the user signs in again.
 */
export function isInvalidTokenError(err: any): boolean {
  if (!err) return false;
  return (
    err.statusCode === 401 ||
    err.error === 'AUTH_UNAUTHORIZED' ||
    err.message === 'Invalid token'
  );
}

/**
 * Clears the stale local session and sends the user back to the login page.
 * Call this from a catch block instead of surfacing the raw "Invalid token"
 * error to the user. Returns true if it handled the error (caller should
 * stop further processing), false otherwise.
 */
export async function handleAuthError(err: any, navigate: (path: string) => void): Promise<boolean> {
  if (!isInvalidTokenError(err)) return false;

  try {
    await insforge.auth.signOut();
  } catch {
    // Best-effort - fall through to manual cleanup below regardless.
  }
  // Belt-and-braces: the SDK stores the session under these keys directly.
  try {
    window.localStorage.removeItem('insforge-auth-token');
    window.localStorage.removeItem('insforge-auth-user');
  } catch {
    // localStorage may be unavailable (privacy mode, SSR) - ignore.
  }

  const redirect = encodeURIComponent(window.location.pathname + window.location.search);
  navigate(`/login?redirect=${redirect}&expired=1`);
  return true;
}
