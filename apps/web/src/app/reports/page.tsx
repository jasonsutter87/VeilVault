'use client';

import { useState } from 'react';
import {
  Button,
  Input,
  Select,
  Badge,
  cn,
} from '@veilvault/ui';
import { AppLayout } from '@/components/app-layout';

// Icons
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function DocumentTextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function ChartBarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function TableCellsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 0h7.5" />
    </svg>
  );
}

function ArrowDownTrayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

// Mock reports data
const mockReports = [
  {
    id: 'RPT-001',
    name: 'SOX Control Summary',
    description: 'Summary of all SOX controls with testing status and effectiveness',
    category: 'SOX Compliance',
    type: 'PDF',
    lastGenerated: '2024-12-27',
    schedule: 'Weekly',
    icon: DocumentTextIcon,
  },
  {
    id: 'RPT-002',
    name: 'Risk Heat Map Report',
    description: 'Visual risk distribution across likelihood and impact dimensions',
    category: 'Risk Management',
    type: 'PDF',
    lastGenerated: '2024-12-26',
    schedule: 'Monthly',
    icon: ChartBarIcon,
  },
  {
    id: 'RPT-003',
    name: 'Control Testing Status',
    description: 'Detailed control testing results with pass/fail ratios',
    category: 'Audit',
    type: 'Excel',
    lastGenerated: '2024-12-28',
    schedule: 'Daily',
    icon: TableCellsIcon,
  },
  {
    id: 'RPT-004',
    name: 'Ledger Integrity Summary',
    description: 'Cryptographic verification status of all financial ledgers',
    category: 'Integrity',
    type: 'PDF',
    lastGenerated: '2024-12-28',
    schedule: 'Daily',
    icon: DocumentTextIcon,
  },
  {
    id: 'RPT-005',
    name: 'Deficiency Tracking',
    description: 'All open deficiencies with remediation status and timelines',
    category: 'SOX Compliance',
    type: 'Excel',
    lastGenerated: '2024-12-25',
    schedule: 'Weekly',
    icon: TableCellsIcon,
  },
  {
    id: 'RPT-006',
    name: 'PBC Request Status',
    description: 'Status of all Provided by Client document requests',
    category: 'Audit',
    type: 'Excel',
    lastGenerated: '2024-12-27',
    schedule: 'Weekly',
    icon: TableCellsIcon,
  },
  {
    id: 'RPT-007',
    name: 'Executive Dashboard',
    description: 'High-level GRC metrics and KPIs for leadership',
    category: 'Executive',
    type: 'PDF',
    lastGenerated: '2024-12-28',
    schedule: 'Weekly',
    icon: ChartBarIcon,
  },
  {
    id: 'RPT-008',
    name: 'Audit Trail Export',
    description: 'Complete audit trail of all system activities',
    category: 'System',
    type: 'CSV',
    lastGenerated: '2024-12-28',
    schedule: 'On Demand',
    icon: TableCellsIcon,
  },
];

const recentExports = [
  { name: 'SOX_Control_Summary_Dec2024.pdf', date: '2024-12-27 14:32', size: '2.4 MB', user: 'Jane Smith' },
  { name: 'Risk_Heat_Map_Q4_2024.pdf', date: '2024-12-26 09:15', size: '1.8 MB', user: 'Mike Johnson' },
  { name: 'Control_Testing_Status.xlsx', date: '2024-12-28 08:00', size: '856 KB', user: 'System' },
  { name: 'Ledger_Integrity_Report.pdf', date: '2024-12-28 07:00', size: '3.2 MB', user: 'System' },
];

const categories = ['All', 'SOX Compliance', 'Risk Management', 'Audit', 'Integrity', 'Executive', 'System'];

export default function ReportsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Filter reports
  const filteredReports = mockReports.filter(report => {
    const matchesSearch = report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || report.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <AppLayout
      title="Reports"
      description="Generate and export compliance reports"
      actions={
        <Button variant="primary" size="sm">
          <PlusIcon className="w-4 h-4 mr-2" />
          Custom Report
        </Button>
      }
    >
      <div className="p-6 space-y-6">
        {/* Filters */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<SearchIcon className="w-4 h-4" />}
              />
            </div>
            <div className="w-full md:w-48">
              <Select
                options={categories.map(c => ({ value: c, label: c }))}
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                placeholder="Category"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Available Reports */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Available Reports
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredReports.map(report => {
                const Icon = report.icon;
                return (
                  <div
                    key={report.id}
                    className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 hover:border-brand-300 dark:hover:border-brand-700 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-brand-50 dark:bg-brand-900/30 rounded-lg">
                        <Icon className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-neutral-900 dark:text-neutral-100">
                              {report.name}
                            </p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                              {report.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <Badge variant="outline" size="sm">{report.category}</Badge>
                          <Badge variant="outline" size="sm">{report.type}</Badge>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                          <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                            <ClockIcon className="w-3 h-3" />
                            {report.schedule}
                          </div>
                          <Button variant="ghost" size="sm">
                            <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
                            Generate
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Exports */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Recent Exports
            </h2>
            <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800">
              {recentExports.map((exp, index) => (
                <div key={index} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                        {exp.name}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        {exp.date} • {exp.size}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        by {exp.user}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <ArrowDownTrayIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Scheduled Reports */}
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 pt-4">
              Scheduled Reports
            </h2>
            <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
              <div className="space-y-3">
                {mockReports.filter(r => r.schedule !== 'On Demand').slice(0, 4).map(report => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {report.name}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {report.schedule}
                      </p>
                    </div>
                    <span className={cn(
                      'w-2 h-2 rounded-full',
                      report.schedule === 'Daily' ? 'bg-success-500' :
                      report.schedule === 'Weekly' ? 'bg-brand-500' :
                      'bg-warning-500'
                    )} />
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="w-full mt-4">
                Manage Schedules
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
