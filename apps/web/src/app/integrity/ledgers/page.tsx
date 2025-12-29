'use client';

import { useState } from 'react';
import {
  Button,
  Input,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  ProgressCircle,
  Timeline,
  Modal,
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

function ShieldCheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}

// Mock ledger data
const mockLedgers = [
  { id: 'GL-2024-001', name: 'General Ledger - Q4 2024', type: 'General Ledger', entries: 15420, integrityScore: 100, lastVerified: '2024-12-28T10:30:00Z', status: 'Verified', merkleRoot: '0x7f3a...8b2c' },
  { id: 'GL-2024-002', name: 'Accounts Receivable', type: 'Subledger', entries: 8934, integrityScore: 100, lastVerified: '2024-12-28T09:15:00Z', status: 'Verified', merkleRoot: '0x9e2d...4f1a' },
  { id: 'GL-2024-003', name: 'Accounts Payable', type: 'Subledger', entries: 6721, integrityScore: 100, lastVerified: '2024-12-28T08:45:00Z', status: 'Verified', merkleRoot: '0x3c4b...7e9d' },
  { id: 'GL-2024-004', name: 'Fixed Assets', type: 'Subledger', entries: 1245, integrityScore: 98.5, lastVerified: '2024-12-27T16:20:00Z', status: 'Warning', merkleRoot: '0x6a8f...2c5e' },
  { id: 'GL-2024-005', name: 'Inventory', type: 'Subledger', entries: 4532, integrityScore: 100, lastVerified: '2024-12-28T07:00:00Z', status: 'Verified', merkleRoot: '0x1d9e...8a3f' },
  { id: 'GL-2024-006', name: 'Payroll', type: 'Subledger', entries: 2890, integrityScore: 100, lastVerified: '2024-12-26T14:30:00Z', status: 'Verified', merkleRoot: '0x5b7c...9d4e' },
];

const mockVerificationEvents = [
  { id: '1', title: 'Full verification completed', description: 'All 24 ledgers verified successfully', timestamp: new Date(Date.now() - 1000 * 60 * 30), type: 'success' as const },
  { id: '2', title: 'Anomaly detected in Fixed Assets', description: '3 entries flagged for review', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), type: 'warning' as const },
  { id: '3', title: 'Scheduled verification started', description: 'Daily integrity check initiated', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8), type: 'info' as const },
  { id: '4', title: 'Audit package exported', description: 'Q3 2024 cryptographic proofs generated', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), type: 'info' as const },
];

export default function IntegrityLedgersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLedger, setSelectedLedger] = useState<typeof mockLedgers[0] | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const filteredLedgers = mockLedgers.filter(ledger =>
    ledger.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ledger.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleVerifyAll = () => {
    setIsVerifying(true);
    setTimeout(() => setIsVerifying(false), 2000);
  };

  // Calculate overall integrity
  const overallIntegrity = Math.round(
    mockLedgers.reduce((acc, l) => acc + l.integrityScore, 0) / mockLedgers.length * 10
  ) / 10;

  return (
    <AppLayout
      title="Ledger Integrity"
      description="Cryptographic verification of financial data"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleVerifyAll} disabled={isVerifying}>
            <RefreshIcon className={cn('w-4 h-4 mr-2', isVerifying && 'animate-spin')} />
            {isVerifying ? 'Verifying...' : 'Verify All'}
          </Button>
          <Button variant="primary" size="sm">
            Export Proofs
          </Button>
        </div>
      }
    >
      <div className="p-6 space-y-6">
        {/* Status Banner */}
        <Alert variant="success">
          <strong>System Status:</strong> All ledgers have been verified within the last 24 hours.
          Overall integrity score: <strong>{overallIntegrity}%</strong>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ledgers Table */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
              <Input
                placeholder="Search ledgers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<SearchIcon className="w-4 h-4" />}
              />
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
              <Table hoverable>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ledger</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Entries</TableHead>
                    <TableHead>Integrity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLedgers.map(ledger => (
                    <TableRow key={ledger.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-neutral-100">{ledger.name}</p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">{ledger.id}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{ledger.type}</TableCell>
                      <TableCell className="text-sm tabular-nums">{ledger.entries.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <ProgressCircle
                            value={ledger.integrityScore}
                            size={32}
                            strokeWidth={3}
                            variant={ledger.integrityScore === 100 ? 'success' : ledger.integrityScore >= 95 ? 'warning' : 'error'}
                            showLabel={false}
                          />
                          <span className={cn(
                            'text-sm font-medium',
                            ledger.integrityScore === 100 ? 'text-success-600 dark:text-success-400' :
                            ledger.integrityScore >= 95 ? 'text-warning-600 dark:text-warning-400' :
                            'text-error-600 dark:text-error-400'
                          )}>
                            {ledger.integrityScore}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full',
                          ledger.status === 'Verified' ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300' :
                          ledger.status === 'Warning' ? 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300' :
                          'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-300'
                        )}>
                          {ledger.status === 'Verified' && <ShieldCheckIcon className="w-3 h-3" />}
                          {ledger.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedLedger(ledger)}>
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Verification Activity */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                Verification Activity
              </h3>
              <Timeline events={mockVerificationEvents} variant="compact" />
            </div>

            {/* Quick Stats */}
            <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
                Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">Total Ledgers</span>
                  <span className="text-sm font-medium">{mockLedgers.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">Total Entries</span>
                  <span className="text-sm font-medium tabular-nums">
                    {mockLedgers.reduce((acc, l) => acc + l.entries, 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">Verified Today</span>
                  <span className="text-sm font-medium text-success-600 dark:text-success-400">
                    {mockLedgers.filter(l => l.status === 'Verified').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">Needs Review</span>
                  <span className="text-sm font-medium text-warning-600 dark:text-warning-400">
                    {mockLedgers.filter(l => l.status === 'Warning').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ledger Detail Modal */}
        <Modal
          open={!!selectedLedger}
          onClose={() => setSelectedLedger(null)}
          title={selectedLedger?.name || ''}
          description={selectedLedger?.id}
          size="lg"
        >
          {selectedLedger && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Type</p>
                  <p className="font-medium">{selectedLedger.type}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Entries</p>
                  <p className="font-medium tabular-nums">{selectedLedger.entries.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Integrity Score</p>
                  <p className={cn(
                    'font-medium',
                    selectedLedger.integrityScore === 100 ? 'text-success-600 dark:text-success-400' :
                    'text-warning-600 dark:text-warning-400'
                  )}>
                    {selectedLedger.integrityScore}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Last Verified</p>
                  <p className="font-medium">{new Date(selectedLedger.lastVerified).toLocaleString()}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Merkle Root</p>
                <code className="block p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg font-mono text-sm break-all">
                  {selectedLedger.merkleRoot}
                </code>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  View Entries
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  Export Proof
                </Button>
                <Button variant="primary" size="sm" className="flex-1">
                  Verify Now
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </AppLayout>
  );
}
