'use client';

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  StatusBadge,
  IntegrityIndicator,
  VerificationBadge,
} from '@veilvault/ui';

// Mock data - in production this would come from API
const mockStats = {
  totalLedgers: 5,
  totalTransactions: 12847,
  verificationsPassed: 99.8,
  activeAlerts: 0,
};

const mockLedgers = [
  {
    id: '1',
    name: 'Main Transaction Ledger',
    status: 'healthy' as const,
    transactions: 8234,
    lastVerified: '2 min ago',
  },
  {
    id: '2',
    name: 'Accounts Receivable',
    status: 'healthy' as const,
    transactions: 2156,
    lastVerified: '5 min ago',
  },
  {
    id: '3',
    name: 'Accounts Payable',
    status: 'warning' as const,
    transactions: 2457,
    lastVerified: '12 min ago',
  },
];

const mockRecentVerifications = [
  { id: '1', type: 'Transaction', verified: true, timestamp: '10:42 AM' },
  { id: '2', type: 'Audit Package', verified: true, timestamp: '10:38 AM' },
  { id: '3', type: 'Transaction', verified: true, timestamp: '10:35 AM' },
  { id: '4', type: 'Ledger Root', verified: true, timestamp: '10:30 AM' },
];

export function DashboardOverview() {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Ledgers</p>
                <p className="text-3xl font-bold">{mockStats.totalLedgers}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">📚</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Transactions</p>
                <p className="text-3xl font-bold">
                  {mockStats.totalTransactions.toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Integrity Score</p>
                <p className="text-3xl font-bold text-green-600">
                  {mockStats.verificationsPassed}%
                </p>
              </div>
              <IntegrityIndicator
                score={mockStats.verificationsPassed}
                size="sm"
                showScore={false}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Alerts</p>
                <p className="text-3xl font-bold">{mockStats.activeAlerts}</p>
              </div>
              <StatusBadge
                status={mockStats.activeAlerts === 0 ? 'healthy' : 'warning'}
                label={mockStats.activeAlerts === 0 ? 'All Clear' : 'Attention'}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ledgers List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Ledgers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockLedgers.map((ledger) => (
                  <div
                    key={ledger.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span>📒</span>
                      </div>
                      <div>
                        <p className="font-medium">{ledger.name}</p>
                        <p className="text-sm text-gray-500">
                          {ledger.transactions.toLocaleString()} transactions
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500">
                        {ledger.lastVerified}
                      </span>
                      <StatusBadge status={ledger.status} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Verifications */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Recent Verifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockRecentVerifications.map((verification) => (
                  <div
                    key={verification.id}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">{verification.type}</p>
                      <p className="text-xs text-gray-500">
                        {verification.timestamp}
                      </p>
                    </div>
                    <VerificationBadge
                      verified={verification.verified}
                      size="sm"
                      showLabel={false}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Integrity Ring */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Overall Integrity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center py-4">
                <IntegrityIndicator
                  score={mockStats.verificationsPassed}
                  size="lg"
                  label="System Health"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
