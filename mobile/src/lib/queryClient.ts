import { QueryClient } from '@tanstack/react-query';

// Snappy + offline-tolerant defaults. Cached data renders instantly; refetch on reconnect.
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30_000,
            gcTime: 10 * 60_000,
            retry: 2,
            refetchOnReconnect: true,
            refetchOnWindowFocus: false,
        },
    },
});
