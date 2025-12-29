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
  Alert,
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

function PaperClipIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
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

function ExclamationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
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

function ChatBubbleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
    </svg>
  );
}

// Mock PBC data
const mockPBCRequests = [
  {
    id: 'PBC-2024-001',
    title: 'Q4 Bank Statements',
    description: 'All bank statements for October, November, December 2024',
    audit: 'Q4 2024 SOX Assessment',
    requestedBy: 'Jane Smith',
    assignedTo: 'Treasury Team',
    status: 'Received',
    priority: 'High',
    dueDate: '2024-12-20',
    requestedDate: '2024-12-05',
    documents: 3,
    messages: 2
  },
  {
    id: 'PBC-2024-002',
    title: 'Revenue Recognition Policy',
    description: 'Current revenue recognition policy documentation',
    audit: 'Q4 2024 SOX Assessment',
    requestedBy: 'Jane Smith',
    assignedTo: 'Finance',
    status: 'Pending',
    priority: 'Medium',
    dueDate: '2024-12-28',
    requestedDate: '2024-12-10',
    documents: 0,
    messages: 1
  },
  {
    id: 'PBC-2024-003',
    title: 'User Access Lists - ERP',
    description: 'Complete user access listing for SAP ERP system as of 12/31/2024',
    audit: 'Q4 2024 SOX Assessment',
    requestedBy: 'Sarah Davis',
    assignedTo: 'IT Security',
    status: 'Overdue',
    priority: 'High',
    dueDate: '2024-12-15',
    requestedDate: '2024-12-01',
    documents: 0,
    messages: 5
  },
  {
    id: 'PBC-2024-004',
    title: 'Inventory Count Sheets',
    description: 'Physical inventory count sheets from year-end count',
    audit: 'Revenue Cycle Audit',
    requestedBy: 'Mike Johnson',
    assignedTo: 'Operations',
    status: 'In Progress',
    priority: 'High',
    dueDate: '2025-01-05',
    requestedDate: '2024-12-20',
    documents: 1,
    messages: 3
  },
  {
    id: 'PBC-2024-005',
    title: 'Vendor Master List',
    description: 'Complete vendor master file with payment terms',
    audit: 'Q4 2024 SOX Assessment',
    requestedBy: 'Jane Smith',
    assignedTo: 'Accounts Payable',
    status: 'Received',
    priority: 'Medium',
    dueDate: '2024-12-22',
    requestedDate: '2024-12-08',
    documents: 2,
    messages: 0
  },
  {
    id: 'PBC-2024-006',
    title: 'Change Management Logs',
    description: 'IT change management tickets for Q4 2024',
    audit: 'IT General Controls Review',
    requestedBy: 'Sarah Davis',
    assignedTo: 'IT Ops',
    status: 'Pending',
    priority: 'Low',
    dueDate: '2025-01-15',
    requestedDate: '2024-12-18',
    documents: 0,
    messages: 0
  },
];

const priorities = ['All', 'High', 'Medium', 'Low'];
const statuses = ['All', 'Pending', 'In Progress', 'Received', 'Overdue'];

export default function PBCPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedPBC, setSelectedPBC] = useState<typeof mockPBCRequests[0] | null>(null);

  // Filter PBC requests
  const filteredPBCs = mockPBCRequests.filter(pbc => {
    const matchesSearch = pbc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pbc.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === 'All' || pbc.priority === priorityFilter;
    const matchesStatus = statusFilter === 'All' || pbc.status === statusFilter;
    return matchesSearch && matchesPriority && matchesStatus;
  });

  // Summary stats
  const summaryStats = {
    total: mockPBCRequests.length,
    pending: mockPBCRequests.filter(p => p.status === 'Pending').length,
    inProgress: mockPBCRequests.filter(p => p.status === 'In Progress').length,
    received: mockPBCRequests.filter(p => p.status === 'Received').length,
    overdue: mockPBCRequests.filter(p => p.status === 'Overdue').length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Received': return 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300';
      case 'In Progress': return 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300';
      case 'Pending': return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300';
      case 'Overdue': return 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-300';
      default: return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-300';
      case 'Medium': return 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300';
      case 'Low': return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300';
      default: return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Received': return <CheckCircleIcon className="w-4 h-4 text-success-500" />;
      case 'Overdue': return <ExclamationIcon className="w-4 h-4 text-error-500" />;
      case 'In Progress': return <ClockIcon className="w-4 h-4 text-brand-500" />;
      default: return <ClockIcon className="w-4 h-4 text-neutral-400" />;
    }
  };

  return (
    <AppLayout
      title="PBC Requests"
      description="Provided by Client document requests"
      actions={
        <Button variant="primary" size="sm">
          <PlusIcon className="w-4 h-4 mr-2" />
          New Request
        </Button>
      }
    >
      <div className="p-6 space-y-6">
        {/* Overdue Alert */}
        {summaryStats.overdue > 0 && (
          <Alert variant="error">
            <strong>{summaryStats.overdue} request{summaryStats.overdue > 1 ? 's are' : ' is'} overdue.</strong>{' '}
            Please follow up with the assigned parties.
          </Alert>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total Requests', value: summaryStats.total, color: 'text-neutral-900 dark:text-neutral-100' },
            { label: 'Pending', value: summaryStats.pending, color: 'text-neutral-600 dark:text-neutral-400' },
            { label: 'In Progress', value: summaryStats.inProgress, color: 'text-brand-600 dark:text-brand-400' },
            { label: 'Received', value: summaryStats.received, color: 'text-success-600 dark:text-success-400' },
            { label: 'Overdue', value: summaryStats.overdue, color: 'text-error-600 dark:text-error-400' },
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
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<SearchIcon className="w-4 h-4" />}
              />
            </div>
            <div className="w-full md:w-40">
              <Select
                options={priorities.map(p => ({ value: p, label: p }))}
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                placeholder="Priority"
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

        {/* PBC Table */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
          <Table hoverable>
            <TableHeader>
              <TableRow>
                <TableHead>Request</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Documents</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPBCs.map(pbc => (
                <TableRow key={pbc.id} className={pbc.status === 'Overdue' ? 'bg-error-50 dark:bg-error-900/10' : ''}>
                  <TableCell>
                    <div className="flex items-start gap-2">
                      {getStatusIcon(pbc.status)}
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">{pbc.title}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">{pbc.id}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{pbc.assignedTo}</TableCell>
                  <TableCell>
                    <span className={cn(
                      'text-sm',
                      pbc.status === 'Overdue' ? 'text-error-600 dark:text-error-400 font-medium' : ''
                    )}>
                      {pbc.dueDate}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      'px-2 py-1 text-xs font-medium rounded-full',
                      getPriorityColor(pbc.priority)
                    )}>
                      {pbc.priority}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <PaperClipIcon className="w-4 h-4 text-neutral-400" />
                      <span className="text-sm">{pbc.documents}</span>
                      {pbc.messages > 0 && (
                        <div className="flex items-center gap-1 ml-2">
                          <ChatBubbleIcon className="w-4 h-4 text-neutral-400" />
                          <span className="text-sm">{pbc.messages}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      'px-2 py-1 text-xs font-medium rounded-full',
                      getStatusColor(pbc.status)
                    )}>
                      {pbc.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedPBC(pbc)}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* PBC Detail Modal */}
        <Modal
          open={!!selectedPBC}
          onClose={() => setSelectedPBC(null)}
          title={selectedPBC?.title || ''}
          description={selectedPBC?.id}
          size="lg"
        >
          {selectedPBC && (
            <Tabs defaultValue="details">
              <TabList aria-label="PBC details">
                <TabTrigger value="details">Details</TabTrigger>
                <TabTrigger value="documents">Documents ({selectedPBC.documents})</TabTrigger>
                <TabTrigger value="messages">Messages ({selectedPBC.messages})</TabTrigger>
              </TabList>

              <TabContent value="details">
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Description</p>
                    <p className="font-medium">{selectedPBC.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Audit</p>
                      <p className="font-medium">{selectedPBC.audit}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Requested By</p>
                      <p className="font-medium">{selectedPBC.requestedBy}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Assigned To</p>
                      <p className="font-medium">{selectedPBC.assignedTo}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Priority</p>
                      <span className={cn(
                        'inline-block px-2 py-1 text-xs font-medium rounded-full',
                        getPriorityColor(selectedPBC.priority)
                      )}>
                        {selectedPBC.priority}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Requested Date</p>
                      <p className="font-medium">{selectedPBC.requestedDate}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Due Date</p>
                      <p className={cn(
                        'font-medium',
                        selectedPBC.status === 'Overdue' ? 'text-error-600 dark:text-error-400' : ''
                      )}>
                        {selectedPBC.dueDate}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" size="sm" className="flex-1">
                      Send Reminder
                    </Button>
                    <Button variant="primary" size="sm" className="flex-1">
                      Upload Document
                    </Button>
                  </div>
                </div>
              </TabContent>

              <TabContent value="documents">
                <div className="mt-4">
                  {selectedPBC.documents > 0 ? (
                    <div className="space-y-2">
                      {Array.from({ length: selectedPBC.documents }).map((_, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <PaperClipIcon className="w-5 h-5 text-neutral-400" />
                            <div>
                              <p className="text-sm font-medium">Document_{i + 1}.pdf</p>
                              <p className="text-xs text-neutral-500">Uploaded Dec 20, 2024</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">Download</Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <PaperClipIcon className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">No documents uploaded yet</p>
                      <Button variant="outline" size="sm" className="mt-3">
                        Upload Document
                      </Button>
                    </div>
                  )}
                </div>
              </TabContent>

              <TabContent value="messages">
                <div className="mt-4">
                  {selectedPBC.messages > 0 ? (
                    <div className="space-y-3">
                      {Array.from({ length: selectedPBC.messages }).map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            'p-3 rounded-lg',
                            i % 2 === 0
                              ? 'bg-brand-50 dark:bg-brand-900/20 ml-8'
                              : 'bg-neutral-50 dark:bg-neutral-800 mr-8'
                          )}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                              {i % 2 === 0 ? selectedPBC.requestedBy : selectedPBC.assignedTo}
                            </span>
                            <span className="text-xs text-neutral-500">Dec {20 + i}, 2024</span>
                          </div>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            Sample message content for the PBC request thread...
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <ChatBubbleIcon className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">No messages yet</p>
                    </div>
                  )}
                  <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                    <Input placeholder="Type a message..." />
                  </div>
                </div>
              </TabContent>
            </Tabs>
          )}
        </Modal>
      </div>
    </AppLayout>
  );
}
