import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache pendant 5 minutes par défaut
      staleTime: 5 * 60 * 1000,
      // Garder en cache pendant 30 minutes
      gcTime: 30 * 60 * 1000,
      // Retry 1 fois en cas d'erreur
      retry: 1,
      // Ne pas refetch au focus de la fenêtre
      refetchOnWindowFocus: false,
    },
  },
});
