'use client';

import { useState } from 'react';
import {
  Button,
  Input,
  Select,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Pagination,
  PaginationInfo,
  ProgressBar,
  Modal,
  Tabs,
  TabList,
  TabTrigger,
  TabContent,
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

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
    </svg>
  );
}

// Mock controls data
const mockControls = [
  { id: 'SOX-CTRL-001', name: 'Access Control Review', category: 'Access Controls', type: 'Preventive', frequency: 'Quarterly', owner: 'IT Security', status: 'Effective', lastTested: '2024-12-15', effectiveness: 95 },
  { id: 'SOX-CTRL-002', name: 'Journal Entry Approval', category: 'Financial Reporting', type: 'Preventive', frequency: 'Daily', owner: 'Finance', status: 'Effective', lastTested: '2024-12-20', effectiveness: 100 },
  { id: 'SOX-CTRL-003', name: 'Bank Reconciliation', category: 'Financial Reporting', type: 'Detective', frequency: 'Monthly', owner: 'Treasury', status: 'Effective', lastTested: '2024-12-01', effectiveness: 98 },
  { id: 'SOX-CTRL-004', name: 'Segregation of Duties', category: 'Segregation of Duties', type: 'Preventive', frequency: 'Annual', owner: 'Internal Audit', status: 'Needs Improvement', lastTested: '2024-11-15', effectiveness: 72 },
  { id: 'SOX-CTRL-005', name: 'Change Management', category: 'IT General Controls', type: 'Preventive', frequency: 'Per Change', owner: 'IT Ops', status: 'Effective', lastTested: '2024-12-18', effectiveness: 92 },
  { id: 'SOX-CTRL-006', name: 'Backup & Recovery', category: 'IT General Controls', type: 'Detective', frequency: 'Daily', owner: 'IT Ops', status: 'Effective', lastTested: '2024-12-21', effectiveness: 100 },
  { id: 'SOX-CTRL-007', name: 'Inventory Count', category: 'Financial Reporting', type: 'Detective', frequency: 'Quarterly', owner: 'Operations', status: 'Testing Due', lastTested: '2024-09-30', effectiveness: 88 },
  { id: 'SOX-CTRL-008', name: 'Vendor Management', category: 'Operational', type: 'Preventive', frequency: 'Annual', owner: 'Procurement', status: 'Effective', lastTested: '2024-10-15', effectiveness: 85 },
  { id: 'SOX-CTRL-009', name: 'Password Policy', category: 'IT General Controls', type: 'Preventive', frequency: 'Continuous', owner: 'IT Security', status: 'Effective', lastTested: '2024-12-22', effectiveness: 97 },
  { id: 'SOX-CTRL-010', name: 'Revenue Recognition', category: 'Financial Reporting', type: 'Detective', frequency: 'Monthly', owner: 'Finance', status: 'Deficient', lastTested: '2024-12-10', effectiveness: 65 },
];

const categories = ['All', ...Array.from(new Set(mockControls.map(c => c.category)))];
const statuses = ['All', 'Effective', 'Needs Improvement', 'Deficient', 'Testing Due'];

export default function ControlsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedControl, setSelectedControl] = useState<typeof mockControls[0] | null>(null);
  const pageSize = 5;

  // Filter controls
  const filteredControls = mockControls.filter(control => {
    const matchesSearch = control.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      control.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || control.category === categoryFilter;
    const matchesStatus = statusFilter === 'All' || control.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Paginate
  const totalPages = Math.ceil(filteredControls.length / pageSize);
  const paginatedControls = filteredControls.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Summary stats
  const summaryStats = {
    total: mockControls.length,
    effective: mockControls.filter(c => c.status === 'Effective').length,
    needsImprovement: mockControls.filter(c => c.status === 'Needs Improvement').length,
    deficient: mockControls.filter(c => c.status === 'Deficient').length,
    testingDue: mockControls.filter(c => c.status === 'Testing Due').length,
    avgEffectiveness: Math.round(mockControls.reduce((acc, c) => acc + c.effectiveness, 0) / mockControls.length),
  };

  return (
    <AppLayout
      title="Controls"
      description="Manage and monitor control effectiveness"
      actions={
        <Button variant="primary" size="sm">
          Add Control
        </Button>
      }
    >
      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[
            { label: 'Total Controls', value: summaryStats.total, color: 'text-neutral-900 dark:text-neutral-100' },
            { label: 'Effective', value: summaryStats.effective, color: 'text-success-600 dark:text-success-400' },
            { label: 'Needs Improvement', value: summaryStats.needsImprovement, color: 'text-warning-600 dark:text-warning-400' },
            { label: 'Deficient', value: summaryStats.deficient, color: 'text-error-600 dark:text-error-400' },
            { label: 'Testing Due', value: summaryStats.testingDue, color: 'text-brand-600 dark:text-brand-400' },
            { label: 'Avg Effectiveness', value: `${summaryStats.avgEffectiveness}%`, color: 'text-neutral-900 dark:text-neutral-100' },
          ].map(stat => (
            <div
              key={stat.label}
              className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4"
            >
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{stat.label}</p>
              <p className={cn('text-2xl font-bold', stat.color)}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search controls..."
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
            <div className="w-full md:w-48">
              <Select
                options={statuses.map(s => ({ value: s, label: s }))}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                placeholder="Status"
              />
            </div>
          </div>
        </div>

        {/* Controls Table */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
          <Table hoverable>
            <TableHeader>
              <TableRow>
                <TableHead sortable>Control ID</TableHead>
                <TableHead sortable>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Effectiveness</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedControls.map(control => (
                <TableRow key={control.id}>
                  <TableCell className="font-mono text-xs">{control.id}</TableCell>
                  <TableCell className="font-medium">{control.name}</TableCell>
                  <TableCell className="text-sm text-neutral-600 dark:text-neutral-400">{control.category}</TableCell>
                  <TableCell>
                    <span className={cn(
                      'px-2 py-1 text-xs font-medium rounded-full',
                      control.type === 'Preventive' ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300' :
                      'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300'
                    )}>
                      {control.type}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{control.frequency}</TableCell>
                  <TableCell className="text-sm">{control.owner}</TableCell>
                  <TableCell>
                    <div className="w-24">
                      <ProgressBar
                        value={control.effectiveness}
                        size="sm"
                        variant={control.effectiveness >= 90 ? 'success' : control.effectiveness >= 70 ? 'warning' : 'error'}
                        showLabel
                        labelPosition="right"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      'px-2 py-1 text-xs font-medium rounded-full',
                      control.status === 'Effective' ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300' :
                      control.status === 'Needs Improvement' ? 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300' :
                      control.status === 'Deficient' ? 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-300' :
                      'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                    )}>
                      {control.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedControl(control)}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200 dark:border-neutral-700">
            <PaginationInfo
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={filteredControls.length}
            />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              size="sm"
            />
          </div>
        </div>

        {/* Control Detail Modal */}
        <Modal
          open={!!selectedControl}
          onClose={() => setSelectedControl(null)}
          title={selectedControl?.name || ''}
          description={selectedControl?.id}
          size="lg"
        >
          {selectedControl && (
            <Tabs defaultValue="details">
              <TabList aria-label="Control details">
                <TabTrigger value="details">Details</TabTrigger>
                <TabTrigger value="testing">Testing History</TabTrigger>
                <TabTrigger value="risks">Linked Risks</TabTrigger>
              </TabList>

              <TabContent value="details">
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Category</p>
                      <p className="font-medium">{selectedControl.category}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Type</p>
                      <p className="font-medium">{selectedControl.type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Frequency</p>
                      <p className="font-medium">{selectedControl.frequency}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Owner</p>
                      <p className="font-medium">{selectedControl.owner}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Last Tested</p>
                      <p className="font-medium">{selectedControl.lastTested}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Effectiveness</p>
                      <div className="flex items-center gap-2">
                        <ProgressBar
                          value={selectedControl.effectiveness}
                          size="sm"
                          variant={selectedControl.effectiveness >= 90 ? 'success' : selectedControl.effectiveness >= 70 ? 'warning' : 'error'}
                          className="w-24"
                        />
                        <span className="font-medium">{selectedControl.effectiveness}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabContent>

              <TabContent value="testing">
                <div className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
                  Testing history would be displayed here...
                </div>
              </TabContent>

              <TabContent value="risks">
                <div className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
                  Linked risks would be displayed here...
                </div>
              </TabContent>
            </Tabs>
          )}
        </Modal>
      </div>
    </AppLayout>
  );
}
