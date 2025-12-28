import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { DashboardOverview } from '@/components/dashboard-overview';

export default function DashboardPage() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <DashboardOverview />
        </main>
      </div>
    </div>
  );
}
