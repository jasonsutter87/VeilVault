// ==========================================================================
// ORGANIZATION ENTITY
// Multi-tenant organization/company model
// ==========================================================================

export type OrganizationType = 'credit_union' | 'regional_bank' | 'enterprise_bank' | 'regulator' | 'auditor_firm';
export type OrganizationStatus = 'active' | 'trial' | 'suspended' | 'cancelled';
export type SubscriptionTier = 'starter' | 'professional' | 'enterprise' | 'regulator';

export interface Organization {
  id: string;
  name: string;
  slug: string; // URL-friendly identifier
  type: OrganizationType;
  status: OrganizationStatus;
  subscription: SubscriptionInfo;
  settings: OrganizationSettings;
  branding?: OrganizationBranding;
  contact: OrganizationContact;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionInfo {
  tier: SubscriptionTier;
  startDate: Date;
  renewalDate?: Date;
  maxUsers: number;
  maxLedgers: number;
  features: string[];
}

export interface OrganizationSettings {
  timezone: string;
  dateFormat: string;
  currency: string;
  requireMFA: boolean;
  sessionTimeoutMinutes: number;
  ipWhitelist?: string[];
  auditRetentionDays: number;
  allowExternalSharing: boolean;
}

export interface OrganizationBranding {
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export interface OrganizationContact {
  email: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

export interface CreateOrganizationInput {
  name: string;
  type: OrganizationType;
  tier?: SubscriptionTier;
  contactEmail: string;
}

export const TIER_LIMITS: Record<SubscriptionTier, { maxUsers: number; maxLedgers: number; features: string[] }> = {
  starter: {
    maxUsers: 5,
    maxLedgers: 3,
    features: ['basic_audit', 'integrity_dashboard', 'email_support'],
  },
  professional: {
    maxUsers: 25,
    maxLedgers: 20,
    features: ['basic_audit', 'integrity_dashboard', 'email_support', 'api_access', 'custom_reports', 'phone_support'],
  },
  enterprise: {
    maxUsers: -1, // unlimited
    maxLedgers: -1,
    features: ['basic_audit', 'integrity_dashboard', 'email_support', 'api_access', 'custom_reports', 'phone_support', 'sso', 'multi_party', 'zk_proofs', 'dedicated_support', 'sla'],
  },
  regulator: {
    maxUsers: -1,
    maxLedgers: -1,
    features: ['read_only_access', 'real_time_monitoring', 'cross_institution', 'dedicated_support'],
  },
};

export const DEFAULT_SETTINGS: OrganizationSettings = {
  timezone: 'America/New_York',
  dateFormat: 'MM/DD/YYYY',
  currency: 'USD',
  requireMFA: false,
  sessionTimeoutMinutes: 60,
  auditRetentionDays: 2555, // ~7 years
  allowExternalSharing: true,
};

export function createOrganization(input: CreateOrganizationInput): Organization {
  const now = new Date();
  const tier = input.tier ?? 'starter';
  const limits = TIER_LIMITS[tier];

  return {
    id: crypto.randomUUID(),
    name: input.name,
    slug: slugify(input.name),
    type: input.type,
    status: 'trial',
    subscription: {
      tier,
      startDate: now,
      renewalDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
      maxUsers: limits.maxUsers,
      maxLedgers: limits.maxLedgers,
      features: limits.features,
    },
    settings: { ...DEFAULT_SETTINGS },
    contact: {
      email: input.contactEmail,
    },
    createdAt: now,
    updatedAt: now,
  };
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function activateOrganization(org: Organization): Organization {
  return {
    ...org,
    status: 'active',
    updatedAt: new Date(),
  };
}

export function upgradeTier(org: Organization, newTier: SubscriptionTier): Organization {
  const limits = TIER_LIMITS[newTier];
  return {
    ...org,
    subscription: {
      ...org.subscription,
      tier: newTier,
      maxUsers: limits.maxUsers,
      maxLedgers: limits.maxLedgers,
      features: limits.features,
    },
    updatedAt: new Date(),
  };
}

export function hasFeature(org: Organization, feature: string): boolean {
  return org.subscription.features.includes(feature);
}

export function canAddUser(org: Organization, currentUserCount: number): boolean {
  return org.subscription.maxUsers === -1 || currentUserCount < org.subscription.maxUsers;
}

export function canAddLedger(org: Organization, currentLedgerCount: number): boolean {
  return org.subscription.maxLedgers === -1 || currentLedgerCount < org.subscription.maxLedgers;
}
