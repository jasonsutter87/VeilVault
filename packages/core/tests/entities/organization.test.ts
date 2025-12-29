import { describe, it, expect } from 'vitest';
import {
  createOrganization,
  activateOrganization,
  upgradeTier,
  hasFeature,
  canAddUser,
  canAddLedger,
  slugify,
  TIER_LIMITS,
  DEFAULT_SETTINGS,
  type CreateOrganizationInput,
} from '../../src/entities/organization.js';

describe('Organization Entity', () => {
  describe('createOrganization', () => {
    it('should create organization with valid input', () => {
      const input: CreateOrganizationInput = {
        name: 'First Bank',
        type: 'regional_bank',
        contactEmail: 'contact@firstbank.com',
      };

      const org = createOrganization(input);

      expect(org.id).toBeDefined();
      expect(org.name).toBe('First Bank');
      expect(org.type).toBe('regional_bank');
      expect(org.status).toBe('trial');
      expect(org.contact.email).toBe('contact@firstbank.com');
    });

    it('should generate correct slug from name', () => {
      const org = createOrganization({
        name: 'First National Bank & Trust',
        type: 'regional_bank',
        contactEmail: 'test@test.com',
      });

      expect(org.slug).toBe('first-national-bank-trust');
    });

    it('should default to starter tier', () => {
      const org = createOrganization({
        name: 'Test Bank',
        type: 'credit_union',
        contactEmail: 'test@test.com',
      });

      expect(org.subscription.tier).toBe('starter');
      expect(org.subscription.maxUsers).toBe(5);
      expect(org.subscription.maxLedgers).toBe(3);
    });

    it('should use specified tier', () => {
      const org = createOrganization({
        name: 'Enterprise Bank',
        type: 'enterprise_bank',
        tier: 'enterprise',
        contactEmail: 'test@test.com',
      });

      expect(org.subscription.tier).toBe('enterprise');
      expect(org.subscription.maxUsers).toBe(-1); // unlimited
      expect(org.subscription.maxLedgers).toBe(-1);
    });

    it('should apply default settings', () => {
      const org = createOrganization({
        name: 'Test Bank',
        type: 'credit_union',
        contactEmail: 'test@test.com',
      });

      expect(org.settings).toEqual(DEFAULT_SETTINGS);
      expect(org.settings.timezone).toBe('America/New_York');
      expect(org.settings.requireMFA).toBe(false);
    });

    it('should set trial renewal date 30 days ahead', () => {
      const org = createOrganization({
        name: 'Test Bank',
        type: 'credit_union',
        contactEmail: 'test@test.com',
      });

      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      const expectedRenewal = new Date(org.subscription.startDate.getTime() + thirtyDaysMs);

      expect(org.subscription.renewalDate?.getTime()).toBe(expectedRenewal.getTime());
    });
  });

  describe('slugify', () => {
    it('should convert to lowercase', () => {
      expect(slugify('UPPERCASE')).toBe('uppercase');
    });

    it('should replace spaces with hyphens', () => {
      expect(slugify('First Bank')).toBe('first-bank');
    });

    it('should remove special characters', () => {
      expect(slugify('Bank & Trust Co.')).toBe('bank-trust-co');
    });

    it('should handle leading/trailing special chars', () => {
      expect(slugify('---Bank---')).toBe('bank');
    });

    it('should handle multiple consecutive special chars', () => {
      expect(slugify('First   National   Bank')).toBe('first-national-bank');
    });
  });

  describe('activateOrganization', () => {
    it('should change status from trial to active', () => {
      const org = createOrganization({
        name: 'Test Bank',
        type: 'credit_union',
        contactEmail: 'test@test.com',
      });

      expect(org.status).toBe('trial');

      const activated = activateOrganization(org);

      expect(activated.status).toBe('active');
    });

    it('should update the updatedAt timestamp', () => {
      const org = createOrganization({
        name: 'Test Bank',
        type: 'credit_union',
        contactEmail: 'test@test.com',
      });

      const activated = activateOrganization(org);

      expect(activated.updatedAt.getTime()).toBeGreaterThanOrEqual(org.createdAt.getTime());
    });
  });

  describe('upgradeTier', () => {
    it('should upgrade from starter to professional', () => {
      const org = createOrganization({
        name: 'Test Bank',
        type: 'credit_union',
        contactEmail: 'test@test.com',
        tier: 'starter',
      });

      const upgraded = upgradeTier(org, 'professional');

      expect(upgraded.subscription.tier).toBe('professional');
      expect(upgraded.subscription.maxUsers).toBe(25);
      expect(upgraded.subscription.maxLedgers).toBe(20);
    });

    it('should upgrade from professional to enterprise', () => {
      const org = createOrganization({
        name: 'Test Bank',
        type: 'enterprise_bank',
        contactEmail: 'test@test.com',
        tier: 'professional',
      });

      const upgraded = upgradeTier(org, 'enterprise');

      expect(upgraded.subscription.tier).toBe('enterprise');
      expect(upgraded.subscription.maxUsers).toBe(-1);
      expect(upgraded.subscription.features).toContain('zk_proofs');
      expect(upgraded.subscription.features).toContain('sso');
    });

    it('should update features when upgrading', () => {
      const org = createOrganization({
        name: 'Test Bank',
        type: 'credit_union',
        contactEmail: 'test@test.com',
        tier: 'starter',
      });

      expect(org.subscription.features).not.toContain('api_access');

      const upgraded = upgradeTier(org, 'professional');

      expect(upgraded.subscription.features).toContain('api_access');
    });
  });

  describe('hasFeature', () => {
    it('should return true for enabled features', () => {
      const org = createOrganization({
        name: 'Test Bank',
        type: 'credit_union',
        contactEmail: 'test@test.com',
        tier: 'enterprise',
      });

      expect(hasFeature(org, 'zk_proofs')).toBe(true);
      expect(hasFeature(org, 'sso')).toBe(true);
      expect(hasFeature(org, 'basic_audit')).toBe(true);
    });

    it('should return false for disabled features', () => {
      const org = createOrganization({
        name: 'Test Bank',
        type: 'credit_union',
        contactEmail: 'test@test.com',
        tier: 'starter',
      });

      expect(hasFeature(org, 'zk_proofs')).toBe(false);
      expect(hasFeature(org, 'sso')).toBe(false);
      expect(hasFeature(org, 'api_access')).toBe(false);
    });

    it('should return false for non-existent features', () => {
      const org = createOrganization({
        name: 'Test Bank',
        type: 'credit_union',
        contactEmail: 'test@test.com',
        tier: 'enterprise',
      });

      expect(hasFeature(org, 'nonexistent_feature')).toBe(false);
    });
  });

  describe('canAddUser', () => {
    it('should allow adding users within limit', () => {
      const org = createOrganization({
        name: 'Test Bank',
        type: 'credit_union',
        contactEmail: 'test@test.com',
        tier: 'starter',
      });

      expect(canAddUser(org, 0)).toBe(true);
      expect(canAddUser(org, 4)).toBe(true);
    });

    it('should deny adding users at limit', () => {
      const org = createOrganization({
        name: 'Test Bank',
        type: 'credit_union',
        contactEmail: 'test@test.com',
        tier: 'starter',
      });

      expect(canAddUser(org, 5)).toBe(false);
      expect(canAddUser(org, 10)).toBe(false);
    });

    it('should always allow for unlimited tier', () => {
      const org = createOrganization({
        name: 'Test Bank',
        type: 'enterprise_bank',
        contactEmail: 'test@test.com',
        tier: 'enterprise',
      });

      expect(canAddUser(org, 0)).toBe(true);
      expect(canAddUser(org, 100)).toBe(true);
      expect(canAddUser(org, 10000)).toBe(true);
    });
  });

  describe('canAddLedger', () => {
    it('should allow adding ledgers within limit', () => {
      const org = createOrganization({
        name: 'Test Bank',
        type: 'credit_union',
        contactEmail: 'test@test.com',
        tier: 'starter',
      });

      expect(canAddLedger(org, 0)).toBe(true);
      expect(canAddLedger(org, 2)).toBe(true);
    });

    it('should deny adding ledgers at limit', () => {
      const org = createOrganization({
        name: 'Test Bank',
        type: 'credit_union',
        contactEmail: 'test@test.com',
        tier: 'starter',
      });

      expect(canAddLedger(org, 3)).toBe(false);
    });

    it('should always allow for unlimited tier', () => {
      const org = createOrganization({
        name: 'Test Bank',
        type: 'enterprise_bank',
        contactEmail: 'test@test.com',
        tier: 'enterprise',
      });

      expect(canAddLedger(org, 1000)).toBe(true);
    });
  });

  describe('TIER_LIMITS', () => {
    it('should have correct starter limits', () => {
      expect(TIER_LIMITS.starter.maxUsers).toBe(5);
      expect(TIER_LIMITS.starter.maxLedgers).toBe(3);
      expect(TIER_LIMITS.starter.features).toContain('basic_audit');
    });

    it('should have correct professional limits', () => {
      expect(TIER_LIMITS.professional.maxUsers).toBe(25);
      expect(TIER_LIMITS.professional.maxLedgers).toBe(20);
      expect(TIER_LIMITS.professional.features).toContain('api_access');
    });

    it('should have unlimited enterprise tier', () => {
      expect(TIER_LIMITS.enterprise.maxUsers).toBe(-1);
      expect(TIER_LIMITS.enterprise.maxLedgers).toBe(-1);
    });

    it('should have correct regulator features', () => {
      expect(TIER_LIMITS.regulator.features).toContain('read_only_access');
      expect(TIER_LIMITS.regulator.features).toContain('real_time_monitoring');
      expect(TIER_LIMITS.regulator.features).toContain('cross_institution');
    });
  });
});
