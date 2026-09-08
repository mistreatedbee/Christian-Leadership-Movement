import { insforge } from './insforge';
import { isInvalidTokenError } from './authError';

type QueryResult = { error: unknown; data: unknown };

/**
 * Run a public read query. If a stale JWT in localStorage causes 401,
 * clear the session and retry with the anon key.
 */
export async function runPublicQuery<T extends QueryResult>(query: () => Promise<T>): Promise<T> {
  let result = await query();
  if (isInvalidTokenError(result.error)) {
    try {
      await insforge.auth.signOut();
    } catch {
      // Best-effort cleanup only.
    }
    result = await query();
  }
  return result;
}
