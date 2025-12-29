'use client';

import { Sidebar } from './sidebar';
import { Header } from './header';

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function AppLayout({ children, title, description, actions }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={title} description={description} actions={actions} />
        <main className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-950">
          {children}
        </main>
      </div>
    </div>
  );
}
