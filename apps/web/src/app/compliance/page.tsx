'use client';

import { useState } from 'react';
import {
  Button,
  ProgressBar,
  ProgressCircle,
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
  Alert,
  cn,
} from '@veilvault/ui';
import { AppLayout } from '@/components/app-layout';

// Icons
function DocumentCheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 019 9v.375M10.125 2.25A3.375 3.375 0 0113.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 013.375 3.375M9 15l2.25 2.25L15 12" />
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

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

// Mock SOX compliance data
const mockSOXSections = [
  {
    id: 'SOX-302',
    name: 'Section 302 - Corporate Responsibility',
    description: 'CEO/CFO certification of financial reports',
    status: 'On Track',
    progress: 100,
    dueDate: '2025-01-31',
    certifications: [
      { role: 'CEO', name: 'John Anderson', status: 'Pending', dueDate: '2025-01-25' },
      { role: 'CFO', name: 'Sarah Williams', status: 'Pending', dueDate: '2025-01-25' },
    ]
  },
  {
    id: 'SOX-404',
    name: 'Section 404 - Internal Controls',
    description: 'Assessment of internal control over financial reporting (ICFR)',
    status: 'On Track',
    progress: 85,
    dueDate: '2025-02-28',
    controlCategories: [
      { name: 'Entity Level Controls', tested: 12, total: 12, status: 'Complete' },
      { name: 'IT General Controls', tested: 28, total: 32, status: 'In Progress' },
      { name: 'Business Process Controls', tested: 45, total: 58, status: 'In Progress' },
      { name: 'Financial Close Controls', tested: 18, total: 18, status: 'Complete' },
    ]
  },
  {
    id: 'SOX-906',
    name: 'Section 906 - Criminal Penalties',
    description: 'Criminal certification of periodic financial reports',
    status: 'Pending',
    progress: 0,
    dueDate: '2025-03-15',
    certifications: [
      { role: 'CEO', name: 'John Anderson', status: 'Not Started', dueDate: '2025-03-10' },
      { role: 'CFO', name: 'Sarah Williams', status: 'Not Started', dueDate: '2025-03-10' },
    ]
  },
];

const mockDeficiencies = [
  { id: 'DEF-001', title: 'Inadequate segregation of duties in AP', severity: 'Significant Deficiency', status: 'Remediation', owner: 'Finance', dueDate: '2025-01-15' },
  { id: 'DEF-002', title: 'User access review not timely', severity: 'Control Deficiency', status: 'Remediation', owner: 'IT Security', dueDate: '2025-01-31' },
  { id: 'DEF-003', title: 'Journal entry approvals missing documentation', severity: 'Control Deficiency', status: 'Closed', owner: 'Finance', dueDate: '2024-12-15' },
];

const mockTimeline = [
  { quarter: 'Q1 2025', phase: 'Testing', status: 'In Progress', start: 'Jan 1', end: 'Mar 31' },
  { quarter: 'Q2 2025', phase: 'Remediation', status: 'Upcoming', start: 'Apr 1', end: 'May 15' },
  { quarter: 'Q2 2025', phase: 'Retesting', status: 'Upcoming', start: 'May 16', end: 'Jun 15' },
  { quarter: 'Q2 2025', phase: 'Certification', status: 'Upcoming', start: 'Jun 16', end: 'Jun 30' },
];

export default function CompliancePage() {
  const [selectedSection, setSelectedSection] = useState<typeof mockSOXSections[0] | null>(null);

  // Calculate overall progress
  const overallProgress = Math.round(
    mockSOXSections.reduce((acc, s) => acc + s.progress, 0) / mockSOXSections.length
  );

  // Summary stats
  const summaryStats = {
    totalControls: 120,
    testedControls: 103,
    effectiveControls: 98,
    deficiencies: mockDeficiencies.filter(d => d.status !== 'Closed').length,
    daysToDeadline: 34,
  };

  return (
    <AppLayout
      title="SOX Compliance"
      description="Sarbanes-Oxley compliance management"
      actions={
        <Button variant="primary" size="sm">
          <DocumentCheckIcon className="w-4 h-4 mr-2" />
          Generate Report
        </Button>
      }
    >
      <div className="p-6 space-y-6">
        {/* Status Alert */}
        <Alert variant="info">
          <strong>FY2024 SOX Assessment:</strong> {summaryStats.daysToDeadline} days until Section 302 certification deadline.
          Overall progress: {overallProgress}%
        </Alert>

        {/* Overall Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-6">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-6">
              SOX Compliance Progress
            </h2>
            <div className="space-y-6">
              {mockSOXSections.map(section => (
                <div
                  key={section.id}
                  className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                  onClick={() => setSelectedSection(section)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">{section.name}</p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">{section.description}</p>
                    </div>
                    <span className={cn(
                      'px-2 py-1 text-xs font-medium rounded-full',
                      section.status === 'On Track' ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300' :
                      section.status === 'At Risk' ? 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300' :
                      'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300'
                    )}>
                      {section.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <ProgressBar
                        value={section.progress}
                        size="sm"
                        variant={section.progress === 100 ? 'success' : 'brand'}
                      />
                    </div>
                    <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400 w-12 text-right">
                      {section.progress}%
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                    <CalendarIcon className="w-3 h-3" />
                    Due: {section.dueDate}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-6">
              <div className="flex items-center justify-center mb-4">
                <ProgressCircle
                  value={overallProgress}
                  size={120}
                  strokeWidth={8}
                  variant={overallProgress >= 80 ? 'success' : overallProgress >= 50 ? 'warning' : 'error'}
                />
              </div>
              <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
                Overall SOX Readiness
              </p>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
              <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                Control Testing Summary
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">Total Controls</span>
                  <span className="text-sm font-medium">{summaryStats.totalControls}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">Tested</span>
                  <span className="text-sm font-medium text-brand-600 dark:text-brand-400">
                    {summaryStats.testedControls}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">Effective</span>
                  <span className="text-sm font-medium text-success-600 dark:text-success-400">
                    {summaryStats.effectiveControls}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">Open Deficiencies</span>
                  <span className="text-sm font-medium text-warning-600 dark:text-warning-400">
                    {summaryStats.deficiencies}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Deficiencies and Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Deficiencies */}
          <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                Control Deficiencies
              </h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deficiency</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockDeficiencies.map(def => (
                  <TableRow key={def.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">{def.title}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">{def.owner} • Due: {def.dueDate}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        'px-2 py-1 text-xs font-medium rounded-full',
                        def.severity === 'Significant Deficiency' ? 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-300' :
                        'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300'
                      )}>
                        {def.severity}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        'px-2 py-1 text-xs font-medium rounded-full',
                        def.status === 'Closed' ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300' :
                        'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                      )}>
                        {def.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Timeline */}
          <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              SOX Timeline - FY2024
            </h3>
            <div className="space-y-3">
              {mockTimeline.map((item, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex items-center gap-4 p-3 rounded-lg',
                    item.status === 'In Progress' ? 'bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800' :
                    'bg-neutral-50 dark:bg-neutral-800'
                  )}
                >
                  <div className={cn(
                    'w-3 h-3 rounded-full',
                    item.status === 'In Progress' ? 'bg-brand-500' :
                    item.status === 'Complete' ? 'bg-success-500' :
                    'bg-neutral-300 dark:bg-neutral-600'
                  )} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {item.phase}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {item.start} - {item.end}
                    </p>
                  </div>
                  <span className={cn(
                    'text-xs font-medium',
                    item.status === 'In Progress' ? 'text-brand-600 dark:text-brand-400' :
                    item.status === 'Complete' ? 'text-success-600 dark:text-success-400' :
                    'text-neutral-500 dark:text-neutral-400'
                  )}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section Detail Modal */}
        <Modal
          open={!!selectedSection}
          onClose={() => setSelectedSection(null)}
          title={selectedSection?.name || ''}
          description={selectedSection?.id}
          size="lg"
        >
          {selectedSection && (
            <Tabs defaultValue="overview">
              <TabList aria-label="Section details">
                <TabTrigger value="overview">Overview</TabTrigger>
                <TabTrigger value="requirements">Requirements</TabTrigger>
              </TabList>

              <TabContent value="overview">
                <div className="mt-4 space-y-4">
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    {selectedSection.description}
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Progress</p>
                      <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                        {selectedSection.progress}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Due Date</p>
                      <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                        {selectedSection.dueDate}
                      </p>
                    </div>
                  </div>

                  {'controlCategories' in selectedSection && selectedSection.controlCategories && (
                    <div>
                      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                        Control Testing by Category
                      </p>
                      <div className="space-y-3">
                        {selectedSection.controlCategories.map(cat => (
                          <div key={cat.name} className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">{cat.name}</span>
                              <span className={cn(
                                'text-xs',
                                cat.status === 'Complete' ? 'text-success-600 dark:text-success-400' :
                                'text-brand-600 dark:text-brand-400'
                              )}>
                                {cat.tested} / {cat.total}
                              </span>
                            </div>
                            <ProgressBar
                              value={(cat.tested / cat.total) * 100}
                              size="sm"
                              variant={cat.status === 'Complete' ? 'success' : 'brand'}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {'certifications' in selectedSection && selectedSection.certifications && (
                    <div>
                      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                        Required Certifications
                      </p>
                      <div className="space-y-2">
                        {selectedSection.certifications.map(cert => (
                          <div
                            key={cert.role}
                            className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              {cert.status === 'Signed' ? (
                                <CheckCircleIcon className="w-5 h-5 text-success-500" />
                              ) : (
                                <div className="w-5 h-5 rounded-full border-2 border-neutral-300 dark:border-neutral-600" />
                              )}
                              <div>
                                <p className="text-sm font-medium">{cert.role}</p>
                                <p className="text-xs text-neutral-500">{cert.name}</p>
                              </div>
                            </div>
                            <span className={cn(
                              'px-2 py-1 text-xs font-medium rounded-full',
                              cert.status === 'Signed' ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300' :
                              cert.status === 'Pending' ? 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300' :
                              'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300'
                            )}>
                              {cert.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabContent>

              <TabContent value="requirements">
                <div className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
                  Detailed compliance requirements would be displayed here...
                </div>
              </TabContent>
            </Tabs>
          )}
        </Modal>
      </div>
    </AppLayout>
  );
}
