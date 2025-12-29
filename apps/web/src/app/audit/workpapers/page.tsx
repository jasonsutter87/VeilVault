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
  Modal,
  Tabs,
  TabList,
  TabTrigger,
  TabContent,
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

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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

// Mock workpaper data
const mockWorkpapers = [
  {
    id: 'WP-2024-001',
    name: 'Revenue Recognition Testing',
    section: 'Revenue Cycle',
    audit: 'Q4 2024 SOX Assessment',
    preparer: 'Jane Smith',
    reviewer: 'Mike Johnson',
    status: 'Approved',
    preparedDate: '2024-12-15',
    reviewedDate: '2024-12-18',
    tickmarks: 5,
    crossRefs: 3,
    notes: 2
  },
  {
    id: 'WP-2024-002',
    name: 'Access Control Review',
    section: 'IT General Controls',
    audit: 'Q4 2024 SOX Assessment',
    preparer: 'Sarah Davis',
    reviewer: 'Jane Smith',
    status: 'Under Review',
    preparedDate: '2024-12-20',
    reviewedDate: null,
    tickmarks: 8,
    crossRefs: 2,
    notes: 4
  },
  {
    id: 'WP-2024-003',
    name: 'Bank Reconciliation Testing',
    section: 'Treasury',
    audit: 'Q4 2024 SOX Assessment',
    preparer: 'Mike Johnson',
    reviewer: 'Jane Smith',
    status: 'Draft',
    preparedDate: '2024-12-22',
    reviewedDate: null,
    tickmarks: 3,
    crossRefs: 1,
    notes: 0
  },
  {
    id: 'WP-2024-004',
    name: 'Journal Entry Testing',
    section: 'Financial Close',
    audit: 'Q4 2024 SOX Assessment',
    preparer: 'Jane Smith',
    reviewer: 'Mike Johnson',
    status: 'Approved',
    preparedDate: '2024-12-10',
    reviewedDate: '2024-12-14',
    tickmarks: 12,
    crossRefs: 5,
    notes: 1
  },
  {
    id: 'WP-2024-005',
    name: 'Segregation of Duties Analysis',
    section: 'Access Controls',
    audit: 'Q4 2024 SOX Assessment',
    preparer: 'Sarah Davis',
    reviewer: 'Jane Smith',
    status: 'Review Notes',
    preparedDate: '2024-12-18',
    reviewedDate: null,
    tickmarks: 6,
    crossRefs: 4,
    notes: 3
  },
  {
    id: 'WP-2024-006',
    name: 'Inventory Count Observation',
    section: 'Inventory',
    audit: 'Revenue Cycle Audit',
    preparer: 'Mike Johnson',
    reviewer: 'Sarah Davis',
    status: 'Draft',
    preparedDate: '2024-12-21',
    reviewedDate: null,
    tickmarks: 2,
    crossRefs: 0,
    notes: 0
  },
];

const sections = ['All', ...Array.from(new Set(mockWorkpapers.map(w => w.section)))];
const statuses = ['All', 'Draft', 'Under Review', 'Review Notes', 'Approved'];

// Standard tickmarks
const tickmarks = [
  { symbol: '✓', meaning: 'Verified to source document' },
  { symbol: '◊', meaning: 'Traced to general ledger' },
  { symbol: '∑', meaning: 'Footed and cross-footed' },
  { symbol: '†', meaning: 'Agreed to prior year workpaper' },
  { symbol: '§', meaning: 'Recalculated' },
  { symbol: '©', meaning: 'Confirmed with third party' },
  { symbol: '®', meaning: 'Reperformed procedure' },
  { symbol: 'Ⓔ', meaning: 'Exception noted - see findings' },
];

export default function WorkpapersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sectionFilter, setSectionFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedWorkpaper, setSelectedWorkpaper] = useState<typeof mockWorkpapers[0] | null>(null);

  // Filter workpapers
  const filteredWorkpapers = mockWorkpapers.filter(wp => {
    const matchesSearch = wp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wp.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSection = sectionFilter === 'All' || wp.section === sectionFilter;
    const matchesStatus = statusFilter === 'All' || wp.status === statusFilter;
    return matchesSearch && matchesSection && matchesStatus;
  });

  // Summary stats
  const summaryStats = {
    total: mockWorkpapers.length,
    draft: mockWorkpapers.filter(w => w.status === 'Draft').length,
    underReview: mockWorkpapers.filter(w => w.status === 'Under Review').length,
    reviewNotes: mockWorkpapers.filter(w => w.status === 'Review Notes').length,
    approved: mockWorkpapers.filter(w => w.status === 'Approved').length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300';
      case 'Under Review': return 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300';
      case 'Draft': return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300';
      case 'Review Notes': return 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300';
      default: return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved': return <CheckCircleIcon className="w-4 h-4 text-success-500" />;
      case 'Under Review': return <ClockIcon className="w-4 h-4 text-brand-500" />;
      default: return <DocumentIcon className="w-4 h-4 text-neutral-400" />;
    }
  };

  return (
    <AppLayout
      title="Workpapers"
      description="Audit documentation and sign-offs"
      actions={
        <Button variant="primary" size="sm">
          <PlusIcon className="w-4 h-4 mr-2" />
          New Workpaper
        </Button>
      }
    >
      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total', value: summaryStats.total, color: 'text-neutral-900 dark:text-neutral-100' },
            { label: 'Draft', value: summaryStats.draft, color: 'text-neutral-600 dark:text-neutral-400' },
            { label: 'Under Review', value: summaryStats.underReview, color: 'text-brand-600 dark:text-brand-400' },
            { label: 'Review Notes', value: summaryStats.reviewNotes, color: 'text-warning-600 dark:text-warning-400' },
            { label: 'Approved', value: summaryStats.approved, color: 'text-success-600 dark:text-success-400' },
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
                placeholder="Search workpapers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<SearchIcon className="w-4 h-4" />}
              />
            </div>
            <div className="w-full md:w-48">
              <Select
                options={sections.map(s => ({ value: s, label: s }))}
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                placeholder="Section"
              />
            </div>
            <div className="w-full md:w-40">
              <Select
                options={statuses.map(s => ({ value: s, label: s }))}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                placeholder="Status"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Workpapers Table */}
          <div className="lg:col-span-3 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
            <Table hoverable>
              <TableHeader>
                <TableRow>
                  <TableHead>Workpaper</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Preparer</TableHead>
                  <TableHead>Reviewer</TableHead>
                  <TableHead>Prepared</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkpapers.map(wp => (
                  <TableRow key={wp.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(wp.status)}
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-neutral-100">{wp.name}</p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">{wp.id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{wp.section}</TableCell>
                    <TableCell className="text-sm">{wp.preparer}</TableCell>
                    <TableCell className="text-sm">{wp.reviewer}</TableCell>
                    <TableCell className="text-sm">{wp.preparedDate}</TableCell>
                    <TableCell>
                      <span className={cn(
                        'px-2 py-1 text-xs font-medium rounded-full',
                        getStatusColor(wp.status)
                      )}>
                        {wp.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedWorkpaper(wp)}>
                        Open
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Tickmark Legend */}
          <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              Standard Tickmarks
            </h3>
            <div className="space-y-2">
              {tickmarks.map(tm => (
                <div key={tm.symbol} className="flex items-start gap-2">
                  <span className="w-6 h-6 flex items-center justify-center text-brand-600 dark:text-brand-400 font-medium">
                    {tm.symbol}
                  </span>
                  <span className="text-xs text-neutral-600 dark:text-neutral-400">
                    {tm.meaning}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Workpaper Detail Modal */}
        <Modal
          open={!!selectedWorkpaper}
          onClose={() => setSelectedWorkpaper(null)}
          title={selectedWorkpaper?.name || ''}
          description={selectedWorkpaper?.id}
          size="xl"
        >
          {selectedWorkpaper && (
            <Tabs defaultValue="details">
              <TabList aria-label="Workpaper details">
                <TabTrigger value="details">Details</TabTrigger>
                <TabTrigger value="content">Content</TabTrigger>
                <TabTrigger value="review">Review Notes</TabTrigger>
                <TabTrigger value="references">Cross-References</TabTrigger>
              </TabList>

              <TabContent value="details">
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Section</p>
                      <p className="font-medium">{selectedWorkpaper.section}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Audit</p>
                      <p className="font-medium">{selectedWorkpaper.audit}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Preparer</p>
                      <p className="font-medium">{selectedWorkpaper.preparer}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Reviewer</p>
                      <p className="font-medium">{selectedWorkpaper.reviewer}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Prepared Date</p>
                      <p className="font-medium">{selectedWorkpaper.preparedDate}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Reviewed Date</p>
                      <p className="font-medium">{selectedWorkpaper.reviewedDate || 'Pending'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">{selectedWorkpaper.tickmarks}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Tickmarks</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">{selectedWorkpaper.crossRefs}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Cross-References</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-warning-600 dark:text-warning-400">{selectedWorkpaper.notes}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Review Notes</p>
                    </div>
                  </div>
                </div>
              </TabContent>

              <TabContent value="content">
                <div className="mt-4 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Workpaper content editor would be displayed here with tickmark support and rich text editing...
                  </p>
                </div>
              </TabContent>

              <TabContent value="review">
                <div className="mt-4 space-y-3">
                  {selectedWorkpaper.notes > 0 ? (
                    Array.from({ length: selectedWorkpaper.notes }).map((_, i) => (
                      <div key={i} className="p-3 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg">
                        <p className="text-sm text-warning-800 dark:text-warning-200">
                          Review note {i + 1}: Sample review comment requiring preparer attention...
                        </p>
                        <p className="text-xs text-warning-600 dark:text-warning-400 mt-1">
                          Added by {selectedWorkpaper.reviewer} on {selectedWorkpaper.preparedDate}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">No review notes.</p>
                  )}
                </div>
              </TabContent>

              <TabContent value="references">
                <div className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
                  {selectedWorkpaper.crossRefs} cross-references to other workpapers would be listed here...
                </div>
              </TabContent>
            </Tabs>
          )}
        </Modal>
      </div>
    </AppLayout>
  );
}
