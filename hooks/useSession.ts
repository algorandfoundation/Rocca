import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';

import { chessGateway, type LinkSessionData } from '@/lib/chess-gateway';

/**
 * Query key for the chess-gateway link session. Exported so callers can
 * invalidate or read the cached session after auth-changing operations.
 */
export const sessionQueryKey = ['chess-gateway', 'session'] as const;

export type UseSessionResult = UseQueryResult<LinkSessionData | null> & {
  /** True when the gateway reports an authenticated user. */
  isAuthenticated: boolean;
  /** True when the authenticated user has a registered player record. */
  hasPlayer: boolean;
};

/**
 * Hook that reads the current chess-gateway link session via react-query.
 *
 * The gateway holds the source of truth for whether the user is signed in
 * (better-auth session cookie) and whether the verified email maps to a
 * registered player. This hook surfaces both as derived booleans alongside
 * the standard react-query result so screens can drive their flow off it
 * instead of re-implementing the fetch in `useEffect`s.
 */
export function useSession(): UseSessionResult {
  const query = useQuery<LinkSessionData | null>({
    queryKey: sessionQueryKey,
    queryFn: () => chessGateway.getSession(),
    // The session is small and cheap to refetch; keep it fresh but don't spam
    // the gateway when components remount in quick succession.
    staleTime: 5_000,
    refetchOnWindowFocus: false,
  });

  return {
    ...query,
    isAuthenticated: !!query.data?.authenticated,
    hasPlayer: !!query.data?.player,
  };
}

/**
 * Returns a function that invalidates the cached session, forcing the next
 * `useSession()` consumer to refetch from the gateway. Useful after sign-in,
 * sign-out, or any operation that mutates the session cookie.
 */
export function useInvalidateSession(): () => Promise<void> {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: sessionQueryKey });
}
