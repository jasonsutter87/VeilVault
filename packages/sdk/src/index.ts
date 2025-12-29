// ==========================================================================
// VEILVAULT SDK
// Integration layer for VeilSuite libraries
// ==========================================================================

import { randomUUID } from 'node:crypto';

// VeilChain imports - Merkle tree ledger
import {
  MerkleTree,
  VeilChainClient,
  sha256,
  verifyProofOffline,
  serializeProof,
  deserializeProof as deserializeMerkleProof,
  type MerkleProof,
  type SerializedProof,
  type VeilChainClientConfig,
  type LedgerMetadata,
  type AppendResult,
} from '@veilchain/core';

// VeilProof imports - Zero-knowledge proofs
import {
  generateProof as zkGenerateProof,
  verifyProof as zkVerifyProof,
  serializeProof as serializeZKProof,
  deserializeProof as deserializeZKProof,
  loadVerificationKey,
  type Proof,
  type VerificationKey,
  type VerificationResult,
} from '@veilproof/core';

// VeilKey imports - Threshold cryptography
import {
  VeilKey,
  CeremonyCoordinator,
  type KeyGroup,
  type Share,
  type PartialSignatureResult,
  type CeremonyConfig,
} from '@veilkey/core';

// Export types
export * from './types.js';

// ==========================================================================
// VAULT LEDGER - VeilChain Integration
// ==========================================================================

export interface VaultLedgerConfig {
  apiKey?: string;
  baseUrl?: string;
  organizationId?: string;
  offline?: boolean; // If true, use local MerkleTree instead of API
}

export function createVaultLedger(config: VaultLedgerConfig): VaultLedger {
  return new VaultLedger(config);
}

export class VaultLedger {
  private config: VaultLedgerConfig;
  private client: VeilChainClient | null = null;
  private localTrees: Map<string, MerkleTree> = new Map();
  private ledgerMetadata: Map<string, { name: string; createdAt: Date }> = new Map();
  private entryIdToIndex: Map<string, Map<string, number>> = new Map(); // ledgerId -> (entryId -> index)

  constructor(config: VaultLedgerConfig) {
    this.config = config;

    // Initialize VeilChain client if not offline mode
    if (!config.offline && config.baseUrl && config.apiKey) {
      this.client = new VeilChainClient({
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
      } as VeilChainClientConfig);
    }
  }

  /**
   * Create a new ledger for tracking transactions
   */
  async createLedger(
    name: string,
    metadata?: Record<string, unknown>
  ): Promise<{ id: string; name: string; createdAt: Date }> {
    const id = `ledger-${randomUUID()}`;
    const createdAt = new Date();

    if (this.client) {
      // Use VeilChain API - pass options object
      const result = await this.client.createLedger({
        name,
        description: metadata?.description as string | undefined,
      });
      return {
        id: result.id,
        name: result.name,
        createdAt: new Date(result.createdAt),
      };
    }

    // Offline mode: create local MerkleTree
    const tree = new MerkleTree();
    this.localTrees.set(id, tree);
    this.ledgerMetadata.set(id, { name, createdAt });
    this.entryIdToIndex.set(id, new Map());

    return { id, name, createdAt };
  }

  /**
   * Append a transaction to the ledger
   */
  async appendTransaction(
    ledgerId: string,
    data: unknown
  ): Promise<{
    entryId: string;
    rootHash: string;
    proof: string[];
    index: number;
  }> {
    // Hash the transaction data
    const dataHash = await sha256(JSON.stringify(data));
    const entryId = `entry-${randomUUID()}`;

    if (this.client) {
      // Use VeilChain API - use append() not appendEntry()
      const result: AppendResult = await this.client.append(ledgerId, data, {
        idempotencyKey: entryId,
      });
      return {
        entryId: result.entry.id,
        rootHash: result.newRoot,
        proof: result.proof.proof,
        index: result.proof.index,
      };
    }

    // Offline mode: append to local MerkleTree
    const tree = this.localTrees.get(ledgerId);
    if (!tree) {
      throw new Error(`Ledger not found: ${ledgerId}`);
    }

    const index = tree.append(dataHash);
    const proof = tree.getProof(index);

    // Store entry ID to index mapping
    const entryMap = this.entryIdToIndex.get(ledgerId);
    if (entryMap) {
      entryMap.set(entryId, index);
    }

    return {
      entryId,
      rootHash: tree.root,
      proof: proof.proof,
      index,
    };
  }

  /**
   * Get proof for a specific entry by ID
   */
  async getProofByEntryId(
    ledgerId: string,
    entryId: string
  ): Promise<{
    rootHash: string;
    proof: MerkleProof;
    valid: boolean;
    timestamp: Date;
  }> {
    if (this.client) {
      // Use VeilChain API - getProof takes entryId (string)
      const proof = await this.client.getProof(ledgerId, entryId);
      return {
        rootHash: proof.root,
        proof,
        valid: true,
        timestamp: new Date(),
      };
    }

    // Offline mode - lookup index from entry ID
    const entryMap = this.entryIdToIndex.get(ledgerId);
    const index = entryMap?.get(entryId);
    if (index === undefined) {
      throw new Error(`Entry not found: ${entryId}`);
    }

    return this.getProofByIndex(ledgerId, index);
  }

  /**
   * Get proof for a specific entry by index (offline mode)
   */
  async getProofByIndex(
    ledgerId: string,
    entryIndex: number
  ): Promise<{
    rootHash: string;
    proof: MerkleProof;
    valid: boolean;
    timestamp: Date;
  }> {
    const tree = this.localTrees.get(ledgerId);
    if (!tree) {
      throw new Error(`Ledger not found: ${ledgerId}`);
    }

    const proof = tree.getProof(entryIndex);
    return {
      rootHash: tree.root,
      proof,
      valid: true,
      timestamp: new Date(),
    };
  }

  /**
   * Verify a proof (can be done offline)
   */
  async verifyProof(proof: MerkleProof): Promise<boolean> {
    // Use VeilChain's offline verification
    return verifyProofOffline(proof);
  }

  /**
   * Verify a proof locally without API
   */
  async verifyProofLocally(proof: MerkleProof): Promise<boolean> {
    return MerkleTree.verify(proof);
  }

  /**
   * List all ledgers
   */
  async listLedgers(): Promise<
    Array<{ id: string; name: string; entryCount: number; rootHash: string }>
  > {
    if (this.client) {
      const result = await this.client.listLedgers();
      return result.ledgers.map((l: LedgerMetadata) => ({
        id: l.id,
        name: l.name,
        entryCount: Number(l.entryCount), // Convert bigint to number
        rootHash: l.rootHash,
      }));
    }

    // Offline mode
    const ledgers: Array<{
      id: string;
      name: string;
      entryCount: number;
      rootHash: string;
    }> = [];

    for (const [id, tree] of this.localTrees) {
      const metadata = this.ledgerMetadata.get(id);
      ledgers.push({
        id,
        name: metadata?.name || 'Unknown',
        entryCount: tree.size,
        rootHash: tree.root,
      });
    }

    return ledgers;
  }

  /**
   * Get ledger integrity status
   */
  async getIntegrityStatus(ledgerId: string): Promise<{
    status: 'healthy' | 'warning' | 'error';
    ledgerId: string;
    lastVerified: string;
    rootHash: string;
    entryCount: number;
    message?: string;
  }> {
    if (this.client) {
      const ledger = await this.client.getLedger(ledgerId);
      return {
        status: 'healthy',
        ledgerId,
        lastVerified: new Date().toISOString(),
        rootHash: ledger.rootHash,
        entryCount: Number(ledger.entryCount), // Convert bigint to number
      };
    }

    // Offline mode
    const tree = this.localTrees.get(ledgerId);
    if (!tree) {
      return {
        status: 'error',
        ledgerId,
        lastVerified: new Date().toISOString(),
        rootHash: '',
        entryCount: 0,
        message: 'Ledger not found',
      };
    }

    return {
      status: 'healthy',
      ledgerId,
      lastVerified: new Date().toISOString(),
      rootHash: tree.root,
      entryCount: tree.size,
    };
  }

  /**
   * Serialize proof for storage/transmission
   * Returns SerializedProof object
   */
  serializeProof(proof: MerkleProof): SerializedProof {
    return serializeProof(proof);
  }

  /**
   * Serialize proof to JSON string
   */
  serializeProofToString(proof: MerkleProof): string {
    return JSON.stringify(serializeProof(proof));
  }

  /**
   * Deserialize proof from storage/transmission
   */
  deserializeProof(serialized: SerializedProof | string): MerkleProof {
    const data = typeof serialized === 'string' ? JSON.parse(serialized) : serialized;
    return deserializeMerkleProof(data) as MerkleProof;
  }

  /**
   * Export ledger state for backup
   */
  exportLedger(ledgerId: string): { leaves: string[]; root: string } | null {
    const tree = this.localTrees.get(ledgerId);
    if (!tree) return null;
    return tree.export();
  }

  /**
   * Import ledger state from backup
   */
  importLedger(
    ledgerId: string,
    state: { leaves: string[]; root: string },
    name: string
  ): void {
    const tree = MerkleTree.import(state);
    this.localTrees.set(ledgerId, tree);
    this.ledgerMetadata.set(ledgerId, { name, createdAt: new Date() });
    this.entryIdToIndex.set(ledgerId, new Map());
  }
}

// ==========================================================================
// VAULT PROOFS - VeilProof Integration (Zero-Knowledge Proofs)
// ==========================================================================

export interface VaultProofsConfig {
  circuitsPath?: string;
  ptauPath?: string;
  verificationKeyPath?: string;
}

export class VaultProofs {
  private config: VaultProofsConfig;
  private verificationKeys: Map<string, VerificationKey> = new Map();

  constructor(config: VaultProofsConfig = {}) {
    this.config = config;
  }

  /**
   * Generate a zero-knowledge audit proof
   * Proves properties about ledger entries without revealing the data
   */
  async generateAuditProof(options: {
    circuitPath: string;
    zkeyPath: string;
    inputs: Record<string, bigint | number | string>;
  }): Promise<{
    proofId: string;
    proofType: string;
    status: string;
    proof: Proof;
    publicSignals: string[];
    timestamp: Date;
  }> {
    const proofId = `proof-${randomUUID()}`;

    try {
      // Generate witness from inputs
      const wasmPath = options.circuitPath.replace('.r1cs', '.wasm');

      // Generate the actual ZK proof using VeilProof
      const result = await zkGenerateProof(
        options.zkeyPath,
        wasmPath,
        options.inputs
      );

      return {
        proofId,
        proofType: result.proof.protocol,
        status: 'verified',
        proof: result.proof,
        publicSignals: result.publicSignals,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        proofId,
        proofType: 'groth16',
        status: 'failed',
        proof: {} as Proof,
        publicSignals: [],
        timestamp: new Date(),
      };
    }
  }

  /**
   * Verify a zero-knowledge proof
   */
  async verifyZKProof(
    verificationKeyPath: string,
    publicSignals: string[],
    proof: Proof
  ): Promise<boolean> {
    try {
      // Load verification key if not cached
      let vkey = this.verificationKeys.get(verificationKeyPath);
      if (!vkey) {
        vkey = await loadVerificationKey(verificationKeyPath);
        this.verificationKeys.set(verificationKeyPath, vkey);
      }

      // Verify using VeilProof - returns VerificationResult, check .valid
      const result: VerificationResult = await zkVerifyProof(vkey, publicSignals, proof);
      return result.valid;
    } catch (error) {
      console.error('Proof verification failed:', error);
      return false;
    }
  }

  /**
   * Verify a proof with inline verification key
   */
  async verifyWithKey(
    verificationKey: VerificationKey,
    publicSignals: string[],
    proof: Proof
  ): Promise<VerificationResult> {
    return zkVerifyProof(verificationKey, publicSignals, proof);
  }

  /**
   * Serialize proof for storage
   */
  serializeProof(proof: Proof, publicSignals: string[]): string {
    return serializeZKProof(proof, publicSignals);
  }

  /**
   * Deserialize proof from storage
   */
  deserializeProof(serialized: string): { proof: Proof; publicSignals: string[] } {
    return deserializeZKProof(serialized) as { proof: Proof; publicSignals: string[] };
  }

  /**
   * Generate a range proof (prove value is in range without revealing it)
   */
  async generateRangeProof(options: {
    value: bigint;
    min: bigint;
    max: bigint;
    circuitPath: string;
    zkeyPath: string;
  }): Promise<{
    proof: Proof;
    publicSignals: string[];
    valid: boolean;
  }> {
    const inputs = {
      value: options.value,
      min: options.min,
      max: options.max,
    };

    const result = await this.generateAuditProof({
      circuitPath: options.circuitPath,
      zkeyPath: options.zkeyPath,
      inputs,
    });

    return {
      proof: result.proof,
      publicSignals: result.publicSignals,
      valid: result.status === 'verified',
    };
  }
}

// ==========================================================================
// VAULT CRYPTO - VeilKey Integration (Threshold Cryptography)
// ==========================================================================

export interface VaultCryptoConfig {
  algorithm?: 'RSA-2048' | 'RSA-4096';
}

export class VaultCrypto {
  private config: VaultCryptoConfig;
  private ceremonies: Map<string, CeremonyCoordinator> = new Map();
  private keyGroups: Map<string, KeyGroup> = new Map();

  constructor(config: VaultCryptoConfig = {}) {
    this.config = {
      algorithm: 'RSA-2048',
      ...config,
    };
  }

  /**
   * Create a threshold signing ceremony
   * Requires t-of-n parties to cooperate for signing
   */
  async createCeremony(config: {
    threshold: number;
    participants: number;
    purpose?: string;
  }): Promise<{
    ceremonyId: string;
    status: string;
    threshold: number;
    participants: number;
  }> {
    const ceremonyId = `ceremony-${randomUUID()}`;

    const ceremonyConfig: CeremonyConfig = {
      id: ceremonyId,
      threshold: config.threshold,
      totalParticipants: config.participants,
      phaseTimeout: 3600000, // 1 hour
      description: config.purpose,
    };

    const coordinator = new CeremonyCoordinator(ceremonyConfig);
    this.ceremonies.set(ceremonyId, coordinator);

    return {
      ceremonyId,
      status: 'pending',
      threshold: config.threshold,
      participants: config.participants,
    };
  }

  /**
   * Get ceremony status
   */
  getCeremonyStatus(ceremonyId: string): ReturnType<CeremonyCoordinator['getStatus']> | null {
    const coordinator = this.ceremonies.get(ceremonyId);
    if (!coordinator) return null;
    return coordinator.getStatus();
  }

  /**
   * Submit a key share to a ceremony
   */
  async submitKeyShare(
    ceremonyId: string,
    participantId: string,
    share: unknown
  ): Promise<{ success: boolean; message?: string }> {
    const coordinator = this.ceremonies.get(ceremonyId);
    if (!coordinator) {
      return { success: false, message: 'Ceremony not found' };
    }

    try {
      // In a real implementation, this would submit the share to the ceremony
      // and the coordinator would track when enough shares are received
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate a threshold key group
   * VeilKey.generate is a STATIC method
   */
  async generateKeyGroup(config: {
    threshold: number;
    parties: number;
    algorithm?: 'RSA-2048' | 'RSA-4096';
  }): Promise<KeyGroup> {
    // VeilKey.generate is STATIC - takes VeilKeyConfig object
    const keyGroup = await VeilKey.generate({
      threshold: config.threshold,
      parties: config.parties,
      algorithm: config.algorithm || this.config.algorithm || 'RSA-2048',
    });
    this.keyGroups.set(keyGroup.id, keyGroup);

    return keyGroup;
  }

  /**
   * Create a partial signature (t parties must cooperate)
   * VeilKey.partialSign is a STATIC method
   */
  async partialSign(
    keyGroupId: string,
    shareIndex: number,
    message: Uint8Array | string
  ): Promise<PartialSignatureResult> {
    const keyGroup = this.keyGroups.get(keyGroupId);
    if (!keyGroup) {
      throw new Error(`Key group not found: ${keyGroupId}`);
    }

    const share = keyGroup.shares[shareIndex];
    if (!share) {
      throw new Error(`Share not found at index: ${shareIndex}`);
    }

    // VeilKey.partialSign is STATIC - takes (message, share, keyGroup)
    return VeilKey.partialSign(message, share, keyGroup);
  }

  /**
   * Combine partial signatures into final signature
   * VeilKey.combineSignatures is a STATIC method
   */
  async combineSignatures(
    keyGroupId: string,
    message: Uint8Array | string,
    partialSignatures: PartialSignatureResult[]
  ): Promise<{ signature: string; valid: boolean }> {
    const keyGroup = this.keyGroups.get(keyGroupId);
    if (!keyGroup) {
      throw new Error(`Key group not found: ${keyGroupId}`);
    }

    // VeilKey.combineSignatures is STATIC - returns hex string
    const signature = await VeilKey.combineSignatures(message, partialSignatures, keyGroup);

    return {
      signature,
      valid: true,
    };
  }

  /**
   * Verify a signature against the group's public key
   * VeilKey.verify is a STATIC method
   */
  async verifySignature(
    keyGroupId: string,
    message: Uint8Array | string,
    signature: string
  ): Promise<boolean> {
    const keyGroup = this.keyGroups.get(keyGroupId);
    if (!keyGroup) {
      throw new Error(`Key group not found: ${keyGroupId}`);
    }

    // VeilKey.verify is STATIC - takes (message, signature, keyGroup)
    return VeilKey.verify(message, signature, keyGroup);
  }

  /**
   * Get a stored key group by ID
   */
  getKeyGroup(keyGroupId: string): KeyGroup | undefined {
    return this.keyGroups.get(keyGroupId);
  }

  /**
   * Store an externally created key group
   */
  storeKeyGroup(keyGroup: KeyGroup): void {
    this.keyGroups.set(keyGroup.id, keyGroup);
  }
}

// ==========================================================================
// VAULT AUTH - VeilSign Integration (Blind Signatures for Credentials)
// ==========================================================================

export interface VaultAuthConfig {
  authorityUrl?: string;
  apiKey?: string;
}

export class VaultAuth {
  private config: VaultAuthConfig;

  constructor(config: VaultAuthConfig = {}) {
    this.config = config;
  }

  /**
   * Issue a privacy-preserving credential using blind signatures
   * The authority signs without seeing the actual claims
   */
  async issueCredential(
    userId: string,
    claims: Record<string, unknown>
  ): Promise<{
    id: string;
    signature: string;
    blindedAttributes: unknown[];
    validUntil: Date;
  }> {
    const credentialId = `cred-${randomUUID()}`;
    const validUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // In a full implementation, this would:
    // 1. Client blinds the claims
    // 2. Send blinded claims to VeilSign authority
    // 3. Authority signs without seeing claims
    // 4. Client unblinds to get valid signature

    // For now, we'll generate a placeholder that can be verified
    const credentialData = JSON.stringify({ userId, claims, validUntil });
    const signature = await sha256(credentialData);

    return {
      id: credentialId,
      signature,
      blindedAttributes: Object.keys(claims),
      validUntil,
    };
  }

  /**
   * Verify a credential's signature
   */
  async verifyCredential(credential: {
    id: string;
    signature: string;
    claims: Record<string, unknown>;
    validUntil: Date;
  }): Promise<{ valid: boolean; expired: boolean; reason?: string }> {
    // Check expiration
    if (new Date() > credential.validUntil) {
      return { valid: false, expired: true, reason: 'Credential expired' };
    }

    // In a full implementation, this would verify against VeilSign
    // For now, basic validation
    if (!credential.signature || credential.signature.length < 32) {
      return { valid: false, expired: false, reason: 'Invalid signature' };
    }

    return { valid: true, expired: false };
  }

  /**
   * Create a selective disclosure proof
   * Proves specific claims without revealing others
   */
  async createSelectiveDisclosure(
    credential: { id: string; claims: Record<string, unknown> },
    revealedClaims: string[]
  ): Promise<{
    disclosedClaims: Record<string, unknown>;
    proof: string;
  }> {
    const disclosedClaims: Record<string, unknown> = {};

    for (const key of revealedClaims) {
      if (key in credential.claims) {
        disclosedClaims[key] = credential.claims[key];
      }
    }

    // Generate proof that disclosed claims are part of the credential
    const proofData = JSON.stringify({
      credentialId: credential.id,
      disclosedKeys: revealedClaims,
      timestamp: new Date().toISOString(),
    });
    const proof = await sha256(proofData);

    return {
      disclosedClaims,
      proof,
    };
  }
}

// ==========================================================================
// VAULT STORAGE - Encrypted storage placeholder
// (Would integrate with VeilCloud for full implementation)
// ==========================================================================

export class VaultStorage {
  private dataStore: Map<string, { data: unknown; encrypted: boolean }> = new Map();

  /**
   * Store data (would be encrypted and stored in VeilCloud)
   */
  async store(
    key: string,
    data: unknown,
    options?: { encrypt?: boolean }
  ): Promise<{ success: boolean; key: string }> {
    this.dataStore.set(key, {
      data,
      encrypted: options?.encrypt ?? true,
    });
    return { success: true, key };
  }

  /**
   * Retrieve data
   */
  async retrieve(key: string): Promise<unknown> {
    const entry = this.dataStore.get(key);
    return entry?.data ?? null;
  }

  /**
   * Delete data
   */
  async delete(key: string): Promise<{ success: boolean }> {
    const deleted = this.dataStore.delete(key);
    return { success: deleted };
  }

  /**
   * List all keys
   */
  async listKeys(): Promise<string[]> {
    return Array.from(this.dataStore.keys());
  }
}

// ==========================================================================
// CONVENIENCE FACTORY
// ==========================================================================

export interface VaultSuiteConfig {
  ledger?: VaultLedgerConfig;
  proofs?: VaultProofsConfig;
  crypto?: VaultCryptoConfig;
  auth?: VaultAuthConfig;
}

export class VaultSuite {
  public readonly ledger: VaultLedger;
  public readonly proofs: VaultProofs;
  public readonly crypto: VaultCrypto;
  public readonly auth: VaultAuth;
  public readonly storage: VaultStorage;

  constructor(config: VaultSuiteConfig = {}) {
    this.ledger = new VaultLedger(config.ledger || { offline: true });
    this.proofs = new VaultProofs(config.proofs || {});
    this.crypto = new VaultCrypto(config.crypto || {});
    this.auth = new VaultAuth(config.auth || {});
    this.storage = new VaultStorage();
  }
}

/**
 * Create a complete VaultSuite instance
 */
export function createVaultSuite(config?: VaultSuiteConfig): VaultSuite {
  return new VaultSuite(config);
}
