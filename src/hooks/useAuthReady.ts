import { useUser } from '@insforge/react';

/** True once @insforge/react has finished restoring the session from storage. */
export function useAuthReady(): boolean {
  const { isLoaded } = useUser();
  return isLoaded;
}
