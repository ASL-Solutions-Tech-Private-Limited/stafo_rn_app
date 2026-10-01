import {focusManager, QueryClient} from '@tanstack/react-query';
import {AppState, type AppStateStatus} from 'react-native';
import {ApiError} from '../api/client';
import {onSignOut} from '../store/session';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        const status = error instanceof ApiError ? error.status : undefined;
        if (status && status >= 400 && status < 500) {
          return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {retry: false},
  },
});

// Refetch stale screens when the app returns to the foreground.
AppState.addEventListener('change', (status: AppStateStatus) => {
  focusManager.setFocused(status === 'active');
});

onSignOut(() => {
  queryClient.clear();
});
