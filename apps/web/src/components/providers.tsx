'use client';

import { ThemeProvider, ToastProvider, ToastContainer } from '@veilvault/ui';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider defaultTheme="light" storageKey="veilvault-theme">
      <ToastProvider>
        <div className="min-h-screen bg-background">
          {children}
        </div>
        <ToastContainer position="top-right" />
      </ToastProvider>
    </ThemeProvider>
  );
}
