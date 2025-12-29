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

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  );
}

// Mock audit data
const mockAudits = [
  {
    id: 'AUD-2024-Q4-001',
    name: 'Q4 2024 SOX Assessment',
    type: 'SOX',
    status: 'In Progress',
    startDate: '2024-12-01',
    dueDate: '2025-01-15',
    owner: 'Jane Smith',
    progress: 65,
    controlsTested: 42,
    totalControls: 65,
    findings: 3
  },
  {
    id: 'AUD-2024-Q4-002',
    name: 'Revenue Cycle Audit',
    type: 'Internal',
    status: 'In Progress',
    startDate: '2024-12-10',
    dueDate: '2025-01-22',
    owner: 'Mike Johnson',
    progress: 35,
    controlsTested: 12,
    totalControls: 35,
    findings: 1
  },
  {
    id: 'AUD-2024-Q4-003',
    name: 'IT General Controls Review',
    type: 'ITGC',
    status: 'Planning',
    startDate: '2025-01-15',
    dueDate: '2025-02-28',
    owner: 'Sarah Davis',
    progress: 10,
    controlsTested: 0,
    totalControls: 48,
    findings: 0
  },
  {
    id: 'AUD-2024-Q3-001',
    name: 'Q3 2024 SOX Assessment',
    type: 'SOX',
    status: 'Completed',
    startDate: '2024-09-01',
    dueDate: '2024-10-15',
    owner: 'Jane Smith',
    progress: 100,
    controlsTested: 62,
    totalControls: 62,
    findings: 5
  },
  {
    id: 'AUD-2024-Q3-002',
    name: 'Payroll Controls Review',
    type: 'Internal',
    status: 'Completed',
    startDate: '2024-08-15',
    dueDate: '2024-09-30',
    owner: 'Mike Johnson',
    progress: 100,
    controlsTested: 18,
    totalControls: 18,
    findings: 2
  },
  {
    id: 'AUD-2024-Q4-004',
    name: 'Vendor Risk Assessment',
    type: 'Risk',
    status: 'Under Review',
    startDate: '2024-11-01',
    dueDate: '2024-12-31',
    owner: 'Sarah Davis',
    progress: 90,
    controlsTested: 22,
    totalControls: 25,
    findings: 4
  },
];

const auditTypes = ['All', 'SOX', 'Internal', 'ITGC', 'Risk'];
const auditStatuses = ['All', 'Planning', 'In Progress', 'Under Review', 'Completed'];

export default function AuditsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAudit, setSelectedAudit] = useState<typeof mockAudits[0] | null>(null);
  const pageSize = 5;

  // Filter audits
  const filteredAudits = mockAudits.filter(audit => {
    const matchesSearch = audit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      audit.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'All' || audit.type === typeFilter;
    const matchesStatus = statusFilter === 'All' || audit.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Paginate
  const totalPages = Math.ceil(filteredAudits.length / pageSize);
  const paginatedAudits = filteredAudits.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Summary stats
  const summaryStats = {
    total: mockAudits.length,
    inProgress: mockAudits.filter(a => a.status === 'In Progress').length,
    planning: mockAudits.filter(a => a.status === 'Planning').length,
    completed: mockAudits.filter(a => a.status === 'Completed').length,
    underReview: mockAudits.filter(a => a.status === 'Under Review').length,
    totalFindings: mockAudits.reduce((acc, a) => acc + a.findings, 0),
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300';
      case 'In Progress': return 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300';
      case 'Planning': return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300';
      case 'Under Review': return 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300';
      default: return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300';
    }
  };

  return (
    <AppLayout
      title="Audits"
      description="Manage and track audit engagements"
      actions={
        <Button variant="primary" size="sm">
          <PlusIcon className="w-4 h-4 mr-2" />
          New Audit
        </Button>
      }
    >
      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Total Audits', value: summaryStats.total, color: 'text-neutral-900 dark:text-neutral-100' },
            { label: 'In Progress', value: summaryStats.inProgress, color: 'text-brand-600 dark:text-brand-400' },
            { label: 'Planning', value: summaryStats.planning, color: 'text-neutral-600 dark:text-neutral-400' },
            { label: 'Under Review', value: summaryStats.underReview, color: 'text-warning-600 dark:text-warning-400' },
            { label: 'Completed', value: summaryStats.completed, color: 'text-success-600 dark:text-success-400' },
            { label: 'Open Findings', value: summaryStats.totalFindings, color: 'text-error-600 dark:text-error-400' },
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
                placeholder="Search audits..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<SearchIcon className="w-4 h-4" />}
              />
            </div>
            <div className="w-full md:w-40">
              <Select
                options={auditTypes.map(t => ({ value: t, label: t }))}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                placeholder="Type"
              />
            </div>
            <div className="w-full md:w-40">
              <Select
                options={auditStatuses.map(s => ({ value: s, label: s }))}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                placeholder="Status"
              />
            </div>
          </div>
        </div>

        {/* Audits Table */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
          <Table hoverable>
            <TableHeader>
              <TableRow>
                <TableHead sortable>Audit ID</TableHead>
                <TableHead sortable>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedAudits.map(audit => (
                <TableRow key={audit.id}>
                  <TableCell className="font-mono text-xs">{audit.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FolderIcon className="w-4 h-4 text-neutral-400" />
                      <span className="font-medium">{audit.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" size="sm">{audit.type}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{audit.owner}</TableCell>
                  <TableCell className="text-sm">{audit.dueDate}</TableCell>
                  <TableCell>
                    <div className="w-24">
                      <ProgressBar
                        value={audit.progress}
                        size="sm"
                        variant={audit.progress === 100 ? 'success' : 'brand'}
                        showLabel
                        labelPosition="right"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      'px-2 py-1 text-xs font-medium rounded-full',
                      getStatusColor(audit.status)
                    )}>
                      {audit.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedAudit(audit)}>
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
              totalItems={filteredAudits.length}
            />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              size="sm"
            />
          </div>
        </div>

        {/* Audit Detail Modal */}
        <Modal
          open={!!selectedAudit}
          onClose={() => setSelectedAudit(null)}
          title={selectedAudit?.name || ''}
          description={selectedAudit?.id}
          size="lg"
        >
          {selectedAudit && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Type</p>
                  <p className="font-medium">{selectedAudit.type}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Owner</p>
                  <p className="font-medium">{selectedAudit.owner}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Start Date</p>
                  <p className="font-medium">{selectedAudit.startDate}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Due Date</p>
                  <p className="font-medium">{selectedAudit.dueDate}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Controls Tested</p>
                  <p className="font-medium">{selectedAudit.controlsTested} / {selectedAudit.totalControls}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Findings</p>
                  <p className={cn(
                    'font-medium',
                    selectedAudit.findings > 0 ? 'text-warning-600 dark:text-warning-400' : 'text-success-600 dark:text-success-400'
                  )}>
                    {selectedAudit.findings}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">Progress</p>
                <ProgressBar
                  value={selectedAudit.progress}
                  size="md"
                  variant={selectedAudit.progress === 100 ? 'success' : 'brand'}
                  showLabel
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  View Workpapers
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  View Evidence
                </Button>
                <Button variant="primary" size="sm" className="flex-1">
                  Continue Audit
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </AppLayout>
  );
}
