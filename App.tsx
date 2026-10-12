import React, {useEffect} from 'react';
import {QueryClientProvider} from '@tanstack/react-query';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {ErrorBoundary} from './src/components/ErrorBoundary';
import {ToastHost} from './src/components/ui';
import {startPush} from './src/lib/push';
import {queryClient} from './src/lib/queryClient';
import {RootNavigator} from './src/navigation/RootNavigator';
import {ThemeProvider} from './src/theme/ThemeProvider';

export default function App() {
  // A pushed message usually means something changed on the server.
  useEffect(() => startPush(() => queryClient.invalidateQueries()), []);
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ErrorBoundary>
            <RootNavigator />
          </ErrorBoundary>
          <ToastHost />
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
