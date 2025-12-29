'use client';

import { useState } from 'react';
import {
  Button,
  Input,
  Select,
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

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
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

function SpreadsheetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 0h7.5" />
    </svg>
  );
}

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}

function PdfIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

// Mock evidence data
const mockEvidence = [
  {
    id: 'EV-2024-001',
    name: 'Bank Statement - Oct 2024.pdf',
    type: 'PDF',
    size: '2.4 MB',
    audit: 'Q4 2024 SOX Assessment',
    uploadedBy: 'Treasury Team',
    uploadedDate: '2024-12-15',
    linkedControls: ['SOX-CTRL-003'],
    linkedWorkpapers: ['WP-2024-003'],
    tags: ['Bank', 'Treasury', 'Q4']
  },
  {
    id: 'EV-2024-002',
    name: 'User Access Report - SAP.xlsx',
    type: 'Excel',
    size: '1.8 MB',
    audit: 'Q4 2024 SOX Assessment',
    uploadedBy: 'IT Security',
    uploadedDate: '2024-12-18',
    linkedControls: ['SOX-CTRL-001', 'SOX-CTRL-004'],
    linkedWorkpapers: ['WP-2024-002'],
    tags: ['Access', 'SAP', 'ITGC']
  },
  {
    id: 'EV-2024-003',
    name: 'Revenue Recognition Policy.docx',
    type: 'Word',
    size: '856 KB',
    audit: 'Q4 2024 SOX Assessment',
    uploadedBy: 'Finance',
    uploadedDate: '2024-12-20',
    linkedControls: ['SOX-CTRL-002'],
    linkedWorkpapers: ['WP-2024-001'],
    tags: ['Policy', 'Revenue', 'Documentation']
  },
  {
    id: 'EV-2024-004',
    name: 'Journal Entry Screenshot.png',
    type: 'Image',
    size: '512 KB',
    audit: 'Q4 2024 SOX Assessment',
    uploadedBy: 'Jane Smith',
    uploadedDate: '2024-12-10',
    linkedControls: ['SOX-CTRL-002'],
    linkedWorkpapers: ['WP-2024-004'],
    tags: ['JE', 'Screenshot', 'Testing']
  },
  {
    id: 'EV-2024-005',
    name: 'Vendor Master Export.csv',
    type: 'CSV',
    size: '3.2 MB',
    audit: 'Q4 2024 SOX Assessment',
    uploadedBy: 'Accounts Payable',
    uploadedDate: '2024-12-22',
    linkedControls: ['SOX-CTRL-008'],
    linkedWorkpapers: [],
    tags: ['Vendor', 'Master Data']
  },
  {
    id: 'EV-2024-006',
    name: 'Inventory Count Sheets.pdf',
    type: 'PDF',
    size: '5.1 MB',
    audit: 'Revenue Cycle Audit',
    uploadedBy: 'Operations',
    uploadedDate: '2024-12-21',
    linkedControls: ['SOX-CTRL-007'],
    linkedWorkpapers: ['WP-2024-006'],
    tags: ['Inventory', 'Count', 'Year-end']
  },
  {
    id: 'EV-2024-007',
    name: 'Change Management Log.xlsx',
    type: 'Excel',
    size: '945 KB',
    audit: 'IT General Controls Review',
    uploadedBy: 'IT Ops',
    uploadedDate: '2024-12-19',
    linkedControls: ['SOX-CTRL-005'],
    linkedWorkpapers: [],
    tags: ['Change', 'ITGC', 'Tickets']
  },
  {
    id: 'EV-2024-008',
    name: 'SOD Matrix Analysis.xlsx',
    type: 'Excel',
    size: '1.2 MB',
    audit: 'Q4 2024 SOX Assessment',
    uploadedBy: 'Sarah Davis',
    uploadedDate: '2024-12-18',
    linkedControls: ['SOX-CTRL-004'],
    linkedWorkpapers: ['WP-2024-005'],
    tags: ['SOD', 'Access', 'Analysis']
  },
];

const fileTypes = ['All', 'PDF', 'Excel', 'Word', 'Image', 'CSV'];
const audits = ['All', ...Array.from(new Set(mockEvidence.map(e => e.audit)))];

export default function EvidencePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [auditFilter, setAuditFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedEvidence, setSelectedEvidence] = useState<typeof mockEvidence[0] | null>(null);

  // Filter evidence
  const filteredEvidence = mockEvidence.filter(ev => {
    const matchesSearch = ev.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = typeFilter === 'All' || ev.type === typeFilter;
    const matchesAudit = auditFilter === 'All' || ev.audit === auditFilter;
    return matchesSearch && matchesType && matchesAudit;
  });

  // Summary stats
  const summaryStats = {
    total: mockEvidence.length,
    pdf: mockEvidence.filter(e => e.type === 'PDF').length,
    excel: mockEvidence.filter(e => e.type === 'Excel').length,
    other: mockEvidence.filter(e => !['PDF', 'Excel'].includes(e.type)).length,
    totalSize: '15.9 MB',
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'PDF': return <PdfIcon className="w-8 h-8 text-error-500" />;
      case 'Excel': case 'CSV': return <SpreadsheetIcon className="w-8 h-8 text-success-500" />;
      case 'Word': return <DocumentIcon className="w-8 h-8 text-brand-500" />;
      case 'Image': return <ImageIcon className="w-8 h-8 text-warning-500" />;
      default: return <DocumentIcon className="w-8 h-8 text-neutral-400" />;
    }
  };

  const getFileIconSmall = (type: string) => {
    switch (type) {
      case 'PDF': return <PdfIcon className="w-5 h-5 text-error-500" />;
      case 'Excel': case 'CSV': return <SpreadsheetIcon className="w-5 h-5 text-success-500" />;
      case 'Word': return <DocumentIcon className="w-5 h-5 text-brand-500" />;
      case 'Image': return <ImageIcon className="w-5 h-5 text-warning-500" />;
      default: return <DocumentIcon className="w-5 h-5 text-neutral-400" />;
    }
  };

  return (
    <AppLayout
      title="Evidence Library"
      description="Audit evidence and supporting documentation"
      actions={
        <Button variant="primary" size="sm">
          <UploadIcon className="w-4 h-4 mr-2" />
          Upload Evidence
        </Button>
      }
    >
      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total Files', value: summaryStats.total, color: 'text-neutral-900 dark:text-neutral-100' },
            { label: 'PDF Documents', value: summaryStats.pdf, color: 'text-error-600 dark:text-error-400' },
            { label: 'Spreadsheets', value: summaryStats.excel, color: 'text-success-600 dark:text-success-400' },
            { label: 'Other Files', value: summaryStats.other, color: 'text-neutral-600 dark:text-neutral-400' },
            { label: 'Total Size', value: summaryStats.totalSize, color: 'text-brand-600 dark:text-brand-400' },
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

        {/* Filters and View Toggle */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search files or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<SearchIcon className="w-4 h-4" />}
              />
            </div>
            <div className="w-full md:w-40">
              <Select
                options={fileTypes.map(t => ({ value: t, label: t }))}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                placeholder="File Type"
              />
            </div>
            <div className="w-full md:w-56">
              <Select
                options={audits.map(a => ({ value: a, label: a }))}
                value={auditFilter}
                onChange={(e) => setAuditFilter(e.target.value)}
                placeholder="Audit"
              />
            </div>
            <div className="flex gap-1 border border-neutral-200 dark:border-neutral-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-2 rounded',
                  viewMode === 'grid'
                    ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
                    : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                )}
              >
                <GridIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-2 rounded',
                  viewMode === 'list'
                    ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
                    : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                )}
              >
                <ListIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Evidence Display */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredEvidence.map(ev => (
              <div
                key={ev.id}
                onClick={() => setSelectedEvidence(ev)}
                className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 hover:border-brand-300 dark:hover:border-brand-700 cursor-pointer transition-colors"
              >
                <div className="flex flex-col items-center text-center">
                  {getFileIcon(ev.type)}
                  <p className="mt-3 text-sm font-medium text-neutral-900 dark:text-neutral-100 line-clamp-2">
                    {ev.name}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    {ev.size}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2 justify-center">
                    {ev.tags.slice(0, 2).map(tag => (
                      <Badge key={tag} variant="outline" size="sm">
                        {tag}
                      </Badge>
                    ))}
                    {ev.tags.length > 2 && (
                      <Badge variant="outline" size="sm">
                        +{ev.tags.length - 2}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800">
            {filteredEvidence.map(ev => (
              <div
                key={ev.id}
                onClick={() => setSelectedEvidence(ev)}
                className="flex items-center gap-4 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
              >
                {getFileIconSmall(ev.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                    {ev.name}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {ev.audit} • Uploaded by {ev.uploadedBy}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {ev.tags.slice(0, 2).map(tag => (
                    <Badge key={tag} variant="outline" size="sm">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <span className="text-sm text-neutral-500 dark:text-neutral-400">
                  {ev.size}
                </span>
                <span className="text-sm text-neutral-500 dark:text-neutral-400">
                  {ev.uploadedDate}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Evidence Detail Modal */}
        <Modal
          open={!!selectedEvidence}
          onClose={() => setSelectedEvidence(null)}
          title={selectedEvidence?.name || ''}
          description={selectedEvidence?.id}
          size="lg"
        >
          {selectedEvidence && (
            <Tabs defaultValue="details">
              <TabList aria-label="Evidence details">
                <TabTrigger value="details">Details</TabTrigger>
                <TabTrigger value="links">Links</TabTrigger>
                <TabTrigger value="history">History</TabTrigger>
              </TabList>

              <TabContent value="details">
                <div className="mt-4 space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                    {getFileIcon(selectedEvidence.type)}
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">
                        {selectedEvidence.name}
                      </p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        {selectedEvidence.type} • {selectedEvidence.size}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Audit</p>
                      <p className="font-medium">{selectedEvidence.audit}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Uploaded By</p>
                      <p className="font-medium">{selectedEvidence.uploadedBy}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Upload Date</p>
                      <p className="font-medium">{selectedEvidence.uploadedDate}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">File Size</p>
                      <p className="font-medium">{selectedEvidence.size}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedEvidence.tags.map(tag => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" size="sm" className="flex-1">
                      Download
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      Preview
                    </Button>
                    <Button variant="primary" size="sm" className="flex-1">
                      Link to Control
                    </Button>
                  </div>
                </div>
              </TabContent>

              <TabContent value="links">
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Linked Controls ({selectedEvidence.linkedControls.length})
                    </p>
                    {selectedEvidence.linkedControls.length > 0 ? (
                      <div className="space-y-2">
                        {selectedEvidence.linkedControls.map(ctrl => (
                          <div
                            key={ctrl}
                            className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg"
                          >
                            <span className="text-sm font-mono">{ctrl}</span>
                            <Button variant="ghost" size="sm">View</Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-neutral-500">No linked controls</p>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      Linked Workpapers ({selectedEvidence.linkedWorkpapers.length})
                    </p>
                    {selectedEvidence.linkedWorkpapers.length > 0 ? (
                      <div className="space-y-2">
                        {selectedEvidence.linkedWorkpapers.map(wp => (
                          <div
                            key={wp}
                            className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg"
                          >
                            <span className="text-sm font-mono">{wp}</span>
                            <Button variant="ghost" size="sm">View</Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-neutral-500">No linked workpapers</p>
                    )}
                  </div>
                </div>
              </TabContent>

              <TabContent value="history">
                <div className="mt-4 space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                    <div className="w-2 h-2 mt-2 rounded-full bg-brand-500" />
                    <div>
                      <p className="text-sm font-medium">File uploaded</p>
                      <p className="text-xs text-neutral-500">
                        {selectedEvidence.uploadedBy} • {selectedEvidence.uploadedDate}
                      </p>
                    </div>
                  </div>
                  {selectedEvidence.linkedControls.length > 0 && (
                    <div className="flex items-start gap-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                      <div className="w-2 h-2 mt-2 rounded-full bg-success-500" />
                      <div>
                        <p className="text-sm font-medium">Linked to {selectedEvidence.linkedControls.length} control(s)</p>
                        <p className="text-xs text-neutral-500">
                          {selectedEvidence.uploadedDate}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </TabContent>
            </Tabs>
          )}
        </Modal>
      </div>
    </AppLayout>
  );
}
