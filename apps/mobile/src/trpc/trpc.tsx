import { type AppRouter, appRouter, type Session } from '@spree-native/api';
import { shouldRetry } from '@spree-native/spree-sdk';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTRPCClient, unstable_localLink } from '@trpc/client';
import { createTRPCContext } from '@trpc/tanstack-react-query';
import { type ReactNode, useEffect, useRef, useState } from 'react';

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

/**
 * The router runs inside the app (ADR 0002). Each call reads the current session from a ref,
 * so switching stores doesn't rebuild the client.
 */
export function ApiProvider({ session, children }: { session: Session | null; children: ReactNode }) {
  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (count, error) => shouldRetry(count, (error as { cause?: unknown }).cause ?? error),
          },
        },
      }),
  );
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        unstable_localLink({
          router: appRouter,
          createContext: async () => ({ session: sessionRef.current }),
        }),
      ],
    }),
  );

  // Different store, different data: drop the cache when the store changes.
  const storeUrl = session?.probe.baseUrl ?? null;
  // biome-ignore lint/correctness/useExhaustiveDependencies: storeUrl is the trigger, not an input.
  useEffect(() => {
    queryClient.clear();
  }, [storeUrl, queryClient]);

  // Drop queries (and their GC timers) when the provider goes away.
  useEffect(() => () => queryClient.clear(), [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}
