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

function ExclamationTriangleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

// Mock risk register data
const mockRisks = [
  {
    id: 'RISK-2024-001',
    title: 'Data Breach',
    description: 'Unauthorized access to sensitive financial data through cyber attack or insider threat',
    category: 'Cybersecurity',
    owner: 'IT Security',
    status: 'Active',
    inherentLikelihood: 4,
    inherentImpact: 5,
    inherentScore: 20,
    residualLikelihood: 2,
    residualImpact: 4,
    residualScore: 8,
    controls: ['SOX-CTRL-001', 'SOX-CTRL-009'],
    mitigation: 'Multi-factor authentication, encryption, access reviews',
    lastReviewed: '2024-12-15',
    nextReview: '2025-03-15'
  },
  {
    id: 'RISK-2024-002',
    title: 'Revenue Recognition Error',
    description: 'Incorrect recognition of revenue due to complex contract terms or manual errors',
    category: 'Financial',
    owner: 'Finance',
    status: 'Active',
    inherentLikelihood: 3,
    inherentImpact: 4,
    inherentScore: 12,
    residualLikelihood: 2,
    residualImpact: 3,
    residualScore: 6,
    controls: ['SOX-CTRL-002'],
    mitigation: 'Automated controls, management review, reconciliations',
    lastReviewed: '2024-12-10',
    nextReview: '2025-03-10'
  },
  {
    id: 'RISK-2024-003',
    title: 'Regulatory Non-Compliance',
    description: 'Failure to comply with SOX, SEC, or other regulatory requirements',
    category: 'Regulatory',
    owner: 'Compliance',
    status: 'Active',
    inherentLikelihood: 3,
    inherentImpact: 5,
    inherentScore: 15,
    residualLikelihood: 2,
    residualImpact: 4,
    residualScore: 8,
    controls: ['SOX-CTRL-002', 'SOX-CTRL-005'],
    mitigation: 'Compliance monitoring, training, periodic assessments',
    lastReviewed: '2024-12-20',
    nextReview: '2025-03-20'
  },
  {
    id: 'RISK-2024-004',
    title: 'Third-Party Vendor Failure',
    description: 'Critical vendor unable to deliver services or experiences security breach',
    category: 'Operational',
    owner: 'Procurement',
    status: 'Active',
    inherentLikelihood: 2,
    inherentImpact: 4,
    inherentScore: 8,
    residualLikelihood: 1,
    residualImpact: 3,
    residualScore: 3,
    controls: ['SOX-CTRL-008'],
    mitigation: 'Vendor assessments, contract provisions, backup vendors',
    lastReviewed: '2024-11-15',
    nextReview: '2025-02-15'
  },
  {
    id: 'RISK-2024-005',
    title: 'Key Personnel Loss',
    description: 'Loss of critical knowledge and skills due to employee turnover',
    category: 'Operational',
    owner: 'HR',
    status: 'Active',
    inherentLikelihood: 3,
    inherentImpact: 3,
    inherentScore: 9,
    residualLikelihood: 2,
    residualImpact: 2,
    residualScore: 4,
    controls: [],
    mitigation: 'Cross-training, documentation, succession planning',
    lastReviewed: '2024-12-01',
    nextReview: '2025-03-01'
  },
  {
    id: 'RISK-2024-006',
    title: 'System Downtime',
    description: 'ERP or critical system unavailable affecting financial close or operations',
    category: 'Technology',
    owner: 'IT Ops',
    status: 'Monitoring',
    inherentLikelihood: 2,
    inherentImpact: 3,
    inherentScore: 6,
    residualLikelihood: 1,
    residualImpact: 2,
    residualScore: 2,
    controls: ['SOX-CTRL-006'],
    mitigation: 'Redundancy, backup systems, disaster recovery',
    lastReviewed: '2024-12-18',
    nextReview: '2025-03-18'
  },
  {
    id: 'RISK-2024-007',
    title: 'Fraud',
    description: 'Internal or external fraud affecting financial statements or assets',
    category: 'Financial',
    owner: 'Internal Audit',
    status: 'Active',
    inherentLikelihood: 2,
    inherentImpact: 5,
    inherentScore: 10,
    residualLikelihood: 1,
    residualImpact: 4,
    residualScore: 4,
    controls: ['SOX-CTRL-002', 'SOX-CTRL-004'],
    mitigation: 'Segregation of duties, fraud awareness, whistleblower hotline',
    lastReviewed: '2024-12-05',
    nextReview: '2025-03-05'
  },
  {
    id: 'RISK-2024-008',
    title: 'Supply Chain Disruption',
    description: 'Interruption to supply chain affecting inventory and operations',
    category: 'Operational',
    owner: 'Operations',
    status: 'Active',
    inherentLikelihood: 3,
    inherentImpact: 3,
    inherentScore: 9,
    residualLikelihood: 2,
    residualImpact: 2,
    residualScore: 4,
    controls: ['SOX-CTRL-007'],
    mitigation: 'Multiple suppliers, safety stock, supply chain monitoring',
    lastReviewed: '2024-11-20',
    nextReview: '2025-02-20'
  },
];

const categories = ['All', ...Array.from(new Set(mockRisks.map(r => r.category)))];
const statuses = ['All', 'Active', 'Monitoring', 'Mitigated', 'Closed'];

export default function RiskRegisterPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRisk, setSelectedRisk] = useState<typeof mockRisks[0] | null>(null);
  const pageSize = 5;

  // Filter risks
  const filteredRisks = mockRisks.filter(risk => {
    const matchesSearch = risk.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      risk.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || risk.category === categoryFilter;
    const matchesStatus = statusFilter === 'All' || risk.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Paginate
  const totalPages = Math.ceil(filteredRisks.length / pageSize);
  const paginatedRisks = filteredRisks.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Summary stats
  const summaryStats = {
    total: mockRisks.length,
    critical: mockRisks.filter(r => r.inherentScore >= 17).length,
    high: mockRisks.filter(r => r.inherentScore >= 10 && r.inherentScore < 17).length,
    medium: mockRisks.filter(r => r.inherentScore >= 5 && r.inherentScore < 10).length,
    low: mockRisks.filter(r => r.inherentScore < 5).length,
    avgResidual: Math.round(mockRisks.reduce((acc, r) => acc + r.residualScore, 0) / mockRisks.length * 10) / 10,
  };

  const getScoreColor = (score: number) => {
    if (score >= 17) return 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-300';
    if (score >= 10) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
    if (score >= 5) return 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300';
    return 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 17) return 'Critical';
    if (score >= 10) return 'High';
    if (score >= 5) return 'Medium';
    return 'Low';
  };

  return (
    <AppLayout
      title="Risk Register"
      description="Identify, assess, and track organizational risks"
      actions={
        <Button variant="primary" size="sm">
          <PlusIcon className="w-4 h-4 mr-2" />
          Add Risk
        </Button>
      }
    >
      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Total Risks', value: summaryStats.total, color: 'text-neutral-900 dark:text-neutral-100' },
            { label: 'Critical', value: summaryStats.critical, color: 'text-error-600 dark:text-error-400' },
            { label: 'High', value: summaryStats.high, color: 'text-orange-600 dark:text-orange-400' },
            { label: 'Medium', value: summaryStats.medium, color: 'text-warning-600 dark:text-warning-400' },
            { label: 'Low', value: summaryStats.low, color: 'text-success-600 dark:text-success-400' },
            { label: 'Avg Residual', value: summaryStats.avgResidual, color: 'text-brand-600 dark:text-brand-400' },
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
                placeholder="Search risks..."
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

        {/* Risks Table */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
          <Table hoverable>
            <TableHeader>
              <TableRow>
                <TableHead sortable>Risk ID</TableHead>
                <TableHead sortable>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Inherent Score</TableHead>
                <TableHead>Residual Score</TableHead>
                <TableHead>Controls</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRisks.map(risk => (
                <TableRow key={risk.id}>
                  <TableCell className="font-mono text-xs">{risk.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <ExclamationTriangleIcon className={cn(
                        'w-4 h-4',
                        risk.inherentScore >= 17 ? 'text-error-500' :
                        risk.inherentScore >= 10 ? 'text-orange-500' :
                        risk.inherentScore >= 5 ? 'text-warning-500' :
                        'text-success-500'
                      )} />
                      <span className="font-medium">{risk.title}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{risk.category}</TableCell>
                  <TableCell className="text-sm">{risk.owner}</TableCell>
                  <TableCell>
                    <span className={cn(
                      'px-2 py-1 text-xs font-medium rounded-full',
                      getScoreColor(risk.inherentScore)
                    )}>
                      {risk.inherentScore} ({getScoreLabel(risk.inherentScore)})
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      'px-2 py-1 text-xs font-medium rounded-full',
                      getScoreColor(risk.residualScore)
                    )}>
                      {risk.residualScore} ({getScoreLabel(risk.residualScore)})
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" size="sm">
                      {risk.controls.length}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      'px-2 py-1 text-xs font-medium rounded-full',
                      risk.status === 'Active' ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300' :
                      risk.status === 'Monitoring' ? 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300' :
                      'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300'
                    )}>
                      {risk.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedRisk(risk)}>
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
              totalItems={filteredRisks.length}
            />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              size="sm"
            />
          </div>
        </div>

        {/* Risk Detail Modal */}
        <Modal
          open={!!selectedRisk}
          onClose={() => setSelectedRisk(null)}
          title={selectedRisk?.title || ''}
          description={selectedRisk?.id}
          size="xl"
        >
          {selectedRisk && (
            <Tabs defaultValue="details">
              <TabList aria-label="Risk details">
                <TabTrigger value="details">Details</TabTrigger>
                <TabTrigger value="assessment">Assessment</TabTrigger>
                <TabTrigger value="controls">Controls ({selectedRisk.controls.length})</TabTrigger>
                <TabTrigger value="history">History</TabTrigger>
              </TabList>

              <TabContent value="details">
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Description</p>
                    <p className="font-medium">{selectedRisk.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Category</p>
                      <p className="font-medium">{selectedRisk.category}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Risk Owner</p>
                      <p className="font-medium">{selectedRisk.owner}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Last Reviewed</p>
                      <p className="font-medium">{selectedRisk.lastReviewed}</p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Next Review</p>
                      <p className="font-medium">{selectedRisk.nextReview}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Mitigation Strategy</p>
                    <p className="font-medium">{selectedRisk.mitigation}</p>
                  </div>
                </div>
              </TabContent>

              <TabContent value="assessment">
                <div className="mt-4 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    {/* Inherent Risk */}
                    <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                      <h4 className="font-medium text-neutral-900 dark:text-neutral-100 mb-3">
                        Inherent Risk
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-neutral-600 dark:text-neutral-400">Likelihood</span>
                          <span className="text-sm font-medium">{selectedRisk.inherentLikelihood} / 5</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-neutral-600 dark:text-neutral-400">Impact</span>
                          <span className="text-sm font-medium">{selectedRisk.inherentImpact} / 5</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-neutral-200 dark:border-neutral-700">
                          <span className="text-sm text-neutral-600 dark:text-neutral-400">Score</span>
                          <span className={cn(
                            'px-2 py-0.5 text-xs font-medium rounded-full',
                            getScoreColor(selectedRisk.inherentScore)
                          )}>
                            {selectedRisk.inherentScore}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Residual Risk */}
                    <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                      <h4 className="font-medium text-neutral-900 dark:text-neutral-100 mb-3">
                        Residual Risk
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-neutral-600 dark:text-neutral-400">Likelihood</span>
                          <span className="text-sm font-medium">{selectedRisk.residualLikelihood} / 5</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-neutral-600 dark:text-neutral-400">Impact</span>
                          <span className="text-sm font-medium">{selectedRisk.residualImpact} / 5</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-neutral-200 dark:border-neutral-700">
                          <span className="text-sm text-neutral-600 dark:text-neutral-400">Score</span>
                          <span className={cn(
                            'px-2 py-0.5 text-xs font-medium rounded-full',
                            getScoreColor(selectedRisk.residualScore)
                          )}>
                            {selectedRisk.residualScore}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-success-50 dark:bg-success-900/20 rounded-lg">
                    <p className="text-sm text-success-800 dark:text-success-200">
                      <strong>Risk Reduction:</strong> {selectedRisk.inherentScore - selectedRisk.residualScore} points
                      ({Math.round((1 - selectedRisk.residualScore / selectedRisk.inherentScore) * 100)}% reduction through controls)
                    </p>
                  </div>
                </div>
              </TabContent>

              <TabContent value="controls">
                <div className="mt-4">
                  {selectedRisk.controls.length > 0 ? (
                    <div className="space-y-2">
                      {selectedRisk.controls.map(ctrl => (
                        <div
                          key={ctrl}
                          className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg"
                        >
                          <div>
                            <span className="text-sm font-mono">{ctrl}</span>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">Control description...</p>
                          </div>
                          <Button variant="ghost" size="sm">View</Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">No controls linked to this risk</p>
                      <Button variant="outline" size="sm" className="mt-3">
                        Link Control
                      </Button>
                    </div>
                  )}
                </div>
              </TabContent>

              <TabContent value="history">
                <div className="mt-4 space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                    <div className="w-2 h-2 mt-2 rounded-full bg-brand-500" />
                    <div>
                      <p className="text-sm font-medium">Risk assessment updated</p>
                      <p className="text-xs text-neutral-500">
                        Residual score reduced from 12 to {selectedRisk.residualScore} • {selectedRisk.lastReviewed}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                    <div className="w-2 h-2 mt-2 rounded-full bg-success-500" />
                    <div>
                      <p className="text-sm font-medium">Control linked</p>
                      <p className="text-xs text-neutral-500">
                        {selectedRisk.controls[0]} • 2024-11-01
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                    <div className="w-2 h-2 mt-2 rounded-full bg-neutral-400" />
                    <div>
                      <p className="text-sm font-medium">Risk created</p>
                      <p className="text-xs text-neutral-500">
                        {selectedRisk.owner} • 2024-01-15
                      </p>
                    </div>
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
