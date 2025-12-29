'use client';

import { useState } from 'react';
import {
  Button,
  RiskHeatMap,
  createEmptyHeatMapData,
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
  cn,
  type RiskHeatMapCell,
} from '@veilvault/ui';
import { AppLayout } from '@/components/app-layout';

// Mock risk data
const mockRisks = [
  { id: 'RISK-001', name: 'Data Breach', likelihood: 4, impact: 5, score: 20, owner: 'IT Security', category: 'Cybersecurity', status: 'Active' },
  { id: 'RISK-002', name: 'Revenue Recognition Error', likelihood: 3, impact: 4, score: 12, owner: 'Finance', category: 'Financial', status: 'Active' },
  { id: 'RISK-003', name: 'Regulatory Non-Compliance', likelihood: 3, impact: 5, score: 15, owner: 'Compliance', category: 'Regulatory', status: 'Active' },
  { id: 'RISK-004', name: 'Third-Party Vendor Failure', likelihood: 2, impact: 4, score: 8, owner: 'Procurement', category: 'Operational', status: 'Active' },
  { id: 'RISK-005', name: 'Key Personnel Loss', likelihood: 3, impact: 3, score: 9, owner: 'HR', category: 'Operational', status: 'Active' },
  { id: 'RISK-006', name: 'System Downtime', likelihood: 2, impact: 3, score: 6, owner: 'IT Ops', category: 'Technology', status: 'Monitoring' },
  { id: 'RISK-007', name: 'Fraud', likelihood: 2, impact: 5, score: 10, owner: 'Internal Audit', category: 'Financial', status: 'Active' },
  { id: 'RISK-008', name: 'Supply Chain Disruption', likelihood: 3, impact: 3, score: 9, owner: 'Operations', category: 'Operational', status: 'Active' },
];

// Generate heat map with risk counts
const generateHeatMapWithRisks = () => {
  const data = createEmptyHeatMapData();
  mockRisks.forEach(risk => {
    // Find the cell (heat map rows are reversed - row 0 is likelihood 5)
    const rowIndex = 5 - risk.likelihood;
    const colIndex = risk.impact - 1;
    if (data[rowIndex] && data[rowIndex][colIndex]) {
      data[rowIndex][colIndex].riskCount++;
    }
  });
  return data;
};

export default function RiskHeatMapPage() {
  const [selectedCell, setSelectedCell] = useState<{ likelihood: number; impact: number } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const heatMapData = generateHeatMapWithRisks();

  const handleCellClick = (cell: RiskHeatMapCell) => {
    setSelectedCell({ likelihood: cell.likelihood, impact: cell.impact });
    if (cell.riskCount > 0) {
      setIsModalOpen(true);
    }
  };

  const selectedRisks = selectedCell
    ? mockRisks.filter(r => r.likelihood === selectedCell.likelihood && r.impact === selectedCell.impact)
    : [];

  return (
    <AppLayout
      title="Risk Heat Map"
      description="Interactive risk visualization matrix"
      actions={
        <Button variant="primary" size="sm">
          Add Risk
        </Button>
      }
    >
      <div className="p-6 space-y-6">
        {/* Tabs for different views */}
        <Tabs defaultValue="heatmap">
          <TabList aria-label="Risk views">
            <TabTrigger value="heatmap">Heat Map</TabTrigger>
            <TabTrigger value="list">Risk List</TabTrigger>
          </TabList>

          <TabContent value="heatmap">
            <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Heat Map */}
              <div className="xl:col-span-2 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                      Risk Distribution
                    </h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Click on a cell to view risks at that position
                    </p>
                  </div>
                </div>
                <RiskHeatMap
                  data={heatMapData}
                  showCounts
                  showScores
                  size="md"
                  selectedCell={selectedCell as { likelihood: 1 | 2 | 3 | 4 | 5; impact: 1 | 2 | 3 | 4 | 5 } | null}
                  onCellClick={handleCellClick}
                />
              </div>

              {/* Summary Stats */}
              <div className="space-y-4">
                <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
                  <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                    Risk Summary
                  </h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Critical (17-25)', count: mockRisks.filter(r => r.score >= 17).length, color: 'bg-error-500' },
                      { label: 'High (10-16)', count: mockRisks.filter(r => r.score >= 10 && r.score < 17).length, color: 'bg-orange-500' },
                      { label: 'Medium (5-9)', count: mockRisks.filter(r => r.score >= 5 && r.score < 10).length, color: 'bg-warning-500' },
                      { label: 'Low (1-4)', count: mockRisks.filter(r => r.score < 5).length, color: 'bg-success-500' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn('w-3 h-3 rounded', item.color)} />
                          <span className="text-sm text-neutral-600 dark:text-neutral-400">{item.label}</span>
                        </div>
                        <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
                  <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                    By Category
                  </h3>
                  <div className="space-y-2">
                    {Array.from(new Set(mockRisks.map(r => r.category))).map(category => (
                      <div key={category} className="flex items-center justify-between">
                        <span className="text-sm text-neutral-600 dark:text-neutral-400">{category}</span>
                        <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {mockRisks.filter(r => r.category === category).length}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </TabContent>

          <TabContent value="list">
            <div className="mt-6 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
              <Table hoverable>
                <TableHeader>
                  <TableRow>
                    <TableHead>Risk ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Likelihood</TableHead>
                    <TableHead>Impact</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockRisks.map(risk => (
                    <TableRow key={risk.id}>
                      <TableCell className="font-mono text-xs">{risk.id}</TableCell>
                      <TableCell className="font-medium">{risk.name}</TableCell>
                      <TableCell>{risk.category}</TableCell>
                      <TableCell>{risk.likelihood}</TableCell>
                      <TableCell>{risk.impact}</TableCell>
                      <TableCell>
                        <span className={cn(
                          'px-2 py-1 text-xs font-medium rounded-full',
                          risk.score >= 17 ? 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-300' :
                          risk.score >= 10 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                          risk.score >= 5 ? 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300' :
                          'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300'
                        )}>
                          {risk.score}
                        </span>
                      </TableCell>
                      <TableCell>{risk.owner}</TableCell>
                      <TableCell>
                        <span className={cn(
                          'px-2 py-1 text-xs font-medium rounded-full',
                          risk.status === 'Active' ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300' :
                          'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300'
                        )}>
                          {risk.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabContent>
        </Tabs>

        {/* Risk Detail Modal */}
        <Modal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={`Risks at L${selectedCell?.likelihood} / I${selectedCell?.impact}`}
          size="lg"
        >
          {selectedRisks.length > 0 ? (
            <div className="space-y-3">
              {selectedRisks.map(risk => (
                <div
                  key={risk.id}
                  className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">{risk.name}</p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">{risk.id} · {risk.category}</p>
                    </div>
                    <span className={cn(
                      'px-2 py-1 text-xs font-medium rounded-full',
                      risk.score >= 17 ? 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-300' :
                      risk.score >= 10 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                      'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300'
                    )}>
                      Score: {risk.score}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400">
                    <span>Owner: {risk.owner}</span>
                    <span>Status: {risk.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-neutral-500 dark:text-neutral-400">No risks at this position.</p>
          )}
        </Modal>
      </div>
    </AppLayout>
  );
}
