// ==========================================================================
// API CLIENT
// Client for communicating with VeilVault API
// ==========================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: boolean;
  message?: string;
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    const data = await response.json();
    return data;
  } catch (error) {
    return {
      success: false,
      error: true,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Ledger API
export const ledgerApi = {
  list: () => fetchApi<any[]>('/api/ledgers'),

  get: (id: string) => fetchApi<any>(`/api/ledgers/${id}`),

  create: (data: { name: string; description?: string }) =>
    fetchApi<any>('/api/ledgers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getIntegrity: (id: string) => fetchApi<any>(`/api/ledgers/${id}/integrity`),

  getTransactions: (id: string, limit = 100, offset = 0) =>
    fetchApi<any[]>(`/api/ledgers/${id}/transactions?limit=${limit}&offset=${offset}`),
};

// Transaction API
export const transactionApi = {
  create: (data: {
    ledgerId: string;
    type: 'credit' | 'debit' | 'transfer' | 'adjustment';
    amount: number;
    currency: string;
    accountId: string;
    counterpartyId?: string;
    reference?: string;
  }) =>
    fetchApi<any>('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getProof: (ledgerId: string, entryId: string) =>
    fetchApi<any>(`/api/transactions/${ledgerId}/${entryId}/proof`),

  exportProof: (ledgerId: string, entryId: string) =>
    fetchApi<any>(`/api/transactions/${ledgerId}/${entryId}/proof/export`),
};

// Audit API
export const auditApi = {
  list: (ledgerId: string) => fetchApi<any[]>(`/api/audits?ledgerId=${ledgerId}`),

  get: (id: string) => fetchApi<any>(`/api/audits/${id}`),

  create: (data: {
    ledgerId: string;
    name: string;
    description?: string;
    startDate: string;
    endDate: string;
    expiresInDays?: number;
  }) =>
    fetchApi<any>('/api/audits', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  export: (id: string) => fetchApi<string>(`/api/audits/${id}/export`),

  verify: (id: string) =>
    fetchApi<any>(`/api/audits/${id}/verify`, { method: 'POST' }),

  revoke: (id: string) =>
    fetchApi<any>(`/api/audits/${id}`, { method: 'DELETE' }),
};

// Verify API
export const verifyApi = {
  verifyProof: (data: {
    ledgerId: string;
    entryId: string;
    entryHash: string;
    proof: string;
  }) =>
    fetchApi<any>('/api/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  verifyBatch: (data: {
    ledgerId: string;
    proofs: Array<{ entryId: string; entryHash: string; proof: string }>;
  }) =>
    fetchApi<any>('/api/verify/batch', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  verifyLive: (ledgerId: string, entryId: string) =>
    fetchApi<any>(`/api/verify/live/${ledgerId}/${entryId}`, { method: 'POST' }),

  getInstructions: () => fetchApi<any>('/api/verify/instructions'),
};

// Health API
export const healthApi = {
  check: () => fetchApi<any>('/api/health'),
  detailed: () => fetchApi<any>('/api/health/detailed'),
};
