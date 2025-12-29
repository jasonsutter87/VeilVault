'use client';

import {
  Button,
  MetricCard,
  MetricCardGrid,
  Timeline,
  RiskHeatMap,
  createEmptyHeatMapData,
  ProgressCircle,
  cn,
} from '@veilvault/ui';
import { AppLayout } from '@/components/app-layout';

// Icons
function LedgerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}

// Mock data
const mockHeatMapData = (() => {
  const data = createEmptyHeatMapData();
  // Add some mock risk counts
  data[0][4].riskCount = 2; // Critical
  data[1][3].riskCount = 5; // High
  data[1][4].riskCount = 1; // High
  data[2][2].riskCount = 8; // Medium
  data[2][3].riskCount = 3; // Medium
  data[3][1].riskCount = 12; // Low
  data[3][2].riskCount = 6; // Low
  data[4][0].riskCount = 15; // Low
  data[4][1].riskCount = 9; // Low
  return data;
})();

const mockActivityEvents = [
  {
    id: '1',
    title: 'Ledger verification completed',
    description: 'GL-2024-001 passed all integrity checks',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    type: 'success' as const,
    user: { name: 'System' },
  },
  {
    id: '2',
    title: 'New control test initiated',
    description: 'SOX-CTRL-042 testing started by Jane Smith',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    type: 'info' as const,
    user: { name: 'Jane Smith' },
  },
  {
    id: '3',
    title: 'Risk assessment updated',
    description: 'RISK-2024-018 inherent score changed from 16 to 12',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    type: 'warning' as const,
    user: { name: 'Mike Johnson' },
  },
  {
    id: '4',
    title: 'Audit package generated',
    description: 'Q3 2024 SOX audit package ready for review',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
    type: 'info' as const,
    user: { name: 'System' },
  },
  {
    id: '5',
    title: 'Control deficiency identified',
    description: 'SOX-CTRL-015 failed testing - remediation required',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    type: 'error' as const,
    user: { name: 'Jane Smith' },
  },
];

const mockUpcomingAudits = [
  { name: 'Q4 SOX Assessment', date: 'Jan 15, 2025', status: 'upcoming' },
  { name: 'Revenue Cycle Audit', date: 'Jan 22, 2025', status: 'upcoming' },
  { name: 'IT General Controls', date: 'Feb 1, 2025', status: 'planning' },
  { name: 'Payroll Controls Review', date: 'Feb 15, 2025', status: 'planning' },
];

export default function DashboardPage() {
  return (
    <AppLayout
      title="Dashboard"
      description="Monitor your GRC posture in real-time"
      actions={
        <Button variant="primary" size="sm">
          New Audit
        </Button>
      }
    >
      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <MetricCardGrid columns={4}>
          <MetricCard
            label="Total Ledgers"
            value="24"
            change="+3"
            trend="up"
            sentiment="positive"
            previousValue="21"
            icon={<LedgerIcon className="w-5 h-5" />}
          />
          <MetricCard
            label="Integrity Score"
            value="98.5%"
            change="+0.8%"
            trend="up"
            sentiment="positive"
            previousValue="97.7%"
            icon={<ShieldIcon className="w-5 h-5" />}
          />
          <MetricCard
            label="Open Issues"
            value="7"
            change="-2"
            trend="down"
            sentiment="positive"
            previousValue="9"
            icon={<AlertIcon className="w-5 h-5" />}
          />
          <MetricCard
            label="Audits Due"
            value="3"
            description="Next: Jan 15, 2025"
            icon={<CalendarIcon className="w-5 h-5" />}
          />
        </MetricCardGrid>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Risk Heat Map */}
          <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  Risk Heat Map
                </h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Current risk distribution
                </p>
              </div>
              <Button variant="ghost" size="sm">
                View Details
              </Button>
            </div>
            <RiskHeatMap
              data={mockHeatMapData}
              showCounts
              size="sm"
              onCellClick={(cell) => console.log('Clicked cell:', cell)}
            />
          </div>

          {/* Control Effectiveness */}
          <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  Control Effectiveness
                </h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  By control category
                </p>
              </div>
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </div>
            <div className="space-y-4">
              {[
                { name: 'Access Controls', value: 92, total: 25 },
                { name: 'Financial Reporting', value: 88, total: 18 },
                { name: 'IT General Controls', value: 95, total: 32 },
                { name: 'Segregation of Duties', value: 78, total: 12 },
              ].map((item) => (
                <div key={item.name} className="flex items-center gap-4">
                  <ProgressCircle
                    value={item.value}
                    size={48}
                    strokeWidth={4}
                    variant={item.value >= 90 ? 'success' : item.value >= 80 ? 'warning' : 'error'}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {item.name}
                      </span>
                      <span className="text-sm text-neutral-500 dark:text-neutral-400">
                        {item.total} controls
                      </span>
                    </div>
                    <div className="w-full h-1.5 mt-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          item.value >= 90
                            ? 'bg-success-500'
                            : item.value >= 80
                            ? 'bg-warning-500'
                            : 'bg-error-500'
                        )}
                        style={{ width: `${item.value}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  Recent Activity
                </h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Latest actions and events
                </p>
              </div>
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </div>
            <Timeline events={mockActivityEvents} maxEvents={5} />
          </div>

          {/* Upcoming Audits */}
          <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  Upcoming Audits
                </h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Scheduled assessments
                </p>
              </div>
              <Button variant="ghost" size="sm">
                View Calendar
              </Button>
            </div>
            <div className="space-y-3">
              {mockUpcomingAudits.map((audit, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg',
                    'bg-neutral-50 dark:bg-neutral-800/50',
                    'border border-neutral-200 dark:border-neutral-700'
                  )}
                >
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {audit.name}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {audit.date}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'px-2 py-1 text-xs font-medium rounded-full',
                      audit.status === 'upcoming'
                        ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                        : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300'
                    )}
                  >
                    {audit.status === 'upcoming' ? 'Upcoming' : 'Planning'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
