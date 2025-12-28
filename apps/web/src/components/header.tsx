'use client';

import { Button } from '@veilvault/ui';

export function Header() {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">
            Monitor your ledger integrity in real-time
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm">
            Export Report
          </Button>
          <Button variant="primary" size="sm">
            New Ledger
          </Button>
        </div>
      </div>
    </header>
  );
}
