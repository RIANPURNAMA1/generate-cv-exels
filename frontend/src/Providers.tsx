import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { ToastProvider } from './components/Toast';
import { WizardProvider } from './state/wizard';

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: import.meta.env.MODE === 'test' ? false : 1, refetchOnWindowFocus: false } } }));
  return (
    <QueryClientProvider client={client}>
      <WizardProvider>
        <ToastProvider>{children}</ToastProvider>
      </WizardProvider>
    </QueryClientProvider>
  );
}
