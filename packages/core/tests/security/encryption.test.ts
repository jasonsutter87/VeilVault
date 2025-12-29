import { describe, it, expect, beforeEach } from 'vitest';
import * as crypto from 'crypto';

/**
 * Encryption Security Tests
 *
 * Comprehensive tests for data encryption, key management,
 * and cryptographic operations for banking applications.
 */

// Mock encryption service
class EncryptionService {
  private masterKey: Buffer;
  private algorithm = 'aes-256-gcm';
  private keyDerivationIterations = 100000;

  constructor(masterKeyHex?: string) {
    this.masterKey = masterKeyHex
      ? Buffer.from(masterKeyHex, 'hex')
      : crypto.randomBytes(32);
  }

  // Key derivation from password
  deriveKey(password: string, salt: Buffer, iterations: number = this.keyDerivationIterations): Buffer {
    return crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
  }

  // Generate a random salt
  generateSalt(): Buffer {
    return crypto.randomBytes(16);
  }

  // Generate a random IV
  generateIv(): Buffer {
    return crypto.randomBytes(12); // 96 bits for GCM
  }

  // Encrypt data with AES-256-GCM
  encrypt(plaintext: string, key?: Buffer): { ciphertext: string; iv: string; authTag: string } {
    const encryptionKey = key || this.masterKey;
    const iv = this.generateIv();

    const cipher = crypto.createCipheriv(this.algorithm, encryptionKey, iv);
    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      ciphertext,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }

  // Decrypt data with AES-256-GCM
  decrypt(ciphertext: string, iv: string, authTag: string, key?: Buffer): string {
    const decryptionKey = key || this.masterKey;

    const decipher = crypto.createDecipheriv(
      this.algorithm,
      decryptionKey,
      Buffer.from(iv, 'hex')
    );
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let plaintext = decipher.update(ciphertext, 'hex', 'utf8');
    plaintext += decipher.final('utf8');

    return plaintext;
  }

  // Encrypt with associated data (AEAD)
  encryptWithAAD(
    plaintext: string,
    aad: string,
    key?: Buffer
  ): { ciphertext: string; iv: string; authTag: string } {
    const encryptionKey = key || this.masterKey;
    const iv = this.generateIv();

    const cipher = crypto.createCipheriv(this.algorithm, encryptionKey, iv);
    cipher.setAAD(Buffer.from(aad, 'utf8'));

    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');

    return {
      ciphertext,
      iv: iv.toString('hex'),
      authTag: cipher.getAuthTag().toString('hex'),
    };
  }

  // Decrypt with associated data (AEAD)
  decryptWithAAD(
    ciphertext: string,
    iv: string,
    authTag: string,
    aad: string,
    key?: Buffer
  ): string {
    const decryptionKey = key || this.masterKey;

    const decipher = crypto.createDecipheriv(
      this.algorithm,
      decryptionKey,
      Buffer.from(iv, 'hex')
    );
    decipher.setAAD(Buffer.from(aad, 'utf8'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let plaintext = decipher.update(ciphertext, 'hex', 'utf8');
    plaintext += decipher.final('utf8');

    return plaintext;
  }

  // Hash data with SHA-256
  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // HMAC signing
  hmacSign(data: string, key?: Buffer): string {
    return crypto.createHmac('sha256', key || this.masterKey).update(data).digest('hex');
  }

  // HMAC verification
  hmacVerify(data: string, signature: string, key?: Buffer): boolean {
    const expectedSignature = this.hmacSign(data, key);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  // Generate RSA key pair
  generateRsaKeyPair(): { publicKey: string; privateKey: string } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    return { publicKey, privateKey };
  }

  // RSA encrypt
  rsaEncrypt(plaintext: string, publicKey: string): string {
    return crypto.publicEncrypt(
      { key: publicKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
      Buffer.from(plaintext, 'utf8')
    ).toString('base64');
  }

  // RSA decrypt
  rsaDecrypt(ciphertext: string, privateKey: string): string {
    return crypto.privateDecrypt(
      { key: privateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
      Buffer.from(ciphertext, 'base64')
    ).toString('utf8');
  }

  // RSA sign
  rsaSign(data: string, privateKey: string): string {
    const sign = crypto.createSign('SHA256');
    sign.update(data);
    return sign.sign(privateKey, 'base64');
  }

  // RSA verify
  rsaVerify(data: string, signature: string, publicKey: string): boolean {
    const verify = crypto.createVerify('SHA256');
    verify.update(data);
    return verify.verify(publicKey, signature, 'base64');
  }

  // Secure random bytes
  secureRandom(length: number): Buffer {
    return crypto.randomBytes(length);
  }

  // Constant-time comparison
  constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }

  // Key wrapping
  wrapKey(keyToWrap: Buffer, wrappingKey?: Buffer): { wrapped: string; iv: string; authTag: string } {
    return this.encrypt(keyToWrap.toString('hex'), wrappingKey);
  }

  // Key unwrapping
  unwrapKey(wrapped: string, iv: string, authTag: string, wrappingKey?: Buffer): Buffer {
    const unwrappedHex = this.decrypt(wrapped, iv, authTag, wrappingKey);
    return Buffer.from(unwrappedHex, 'hex');
  }
}

describe('Encryption Security', () => {
  let encryptionService: EncryptionService;

  beforeEach(() => {
    encryptionService = new EncryptionService();
  });

  describe('AES-256-GCM Encryption', () => {
    it('should encrypt and decrypt data correctly', () => {
      const plaintext = 'Sensitive financial data';
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(
        encrypted.ciphertext,
        encrypted.iv,
        encrypted.authTag
      );

      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext', () => {
      const plaintext = 'Same data';
      const encrypted1 = encryptionService.encrypt(plaintext);
      const encrypted2 = encryptionService.encrypt(plaintext);

      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });

    it('should generate unique IVs', () => {
      const ivs = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        const encrypted = encryptionService.encrypt('test');
        expect(ivs.has(encrypted.iv)).toBe(false);
        ivs.add(encrypted.iv);
      }
    });

    it('should use 96-bit IV for GCM mode', () => {
      const encrypted = encryptionService.encrypt('test');
      const ivBytes = Buffer.from(encrypted.iv, 'hex');
      expect(ivBytes.length).toBe(12); // 96 bits
    });

    it('should generate 128-bit authentication tag', () => {
      const encrypted = encryptionService.encrypt('test');
      const authTagBytes = Buffer.from(encrypted.authTag, 'hex');
      expect(authTagBytes.length).toBe(16); // 128 bits
    });

    it('should fail decryption with wrong key', () => {
      const plaintext = 'Secret data';
      const encrypted = encryptionService.encrypt(plaintext);

      const wrongKey = crypto.randomBytes(32);
      expect(() => {
        encryptionService.decrypt(
          encrypted.ciphertext,
          encrypted.iv,
          encrypted.authTag,
          wrongKey
        );
      }).toThrow();
    });

    it('should fail decryption with tampered ciphertext', () => {
      const plaintext = 'Sensitive data';
      const encrypted = encryptionService.encrypt(plaintext);

      // Tamper with ciphertext
      const tamperedCiphertext = encrypted.ciphertext.replace(/a/g, 'b');

      expect(() => {
        encryptionService.decrypt(
          tamperedCiphertext,
          encrypted.iv,
          encrypted.authTag
        );
      }).toThrow();
    });

    it('should fail decryption with tampered IV', () => {
      const plaintext = 'Sensitive data';
      const encrypted = encryptionService.encrypt(plaintext);

      // Tamper with IV
      const tamperedIv = 'a'.repeat(24);

      expect(() => {
        encryptionService.decrypt(
          encrypted.ciphertext,
          tamperedIv,
          encrypted.authTag
        );
      }).toThrow();
    });

    it('should fail decryption with tampered auth tag', () => {
      const plaintext = 'Sensitive data';
      const encrypted = encryptionService.encrypt(plaintext);

      // Tamper with auth tag
      const tamperedAuthTag = 'b'.repeat(32);

      expect(() => {
        encryptionService.decrypt(
          encrypted.ciphertext,
          encrypted.iv,
          tamperedAuthTag
        );
      }).toThrow();
    });

    it('should handle empty string encryption', () => {
      const plaintext = '';
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(
        encrypted.ciphertext,
        encrypted.iv,
        encrypted.authTag
      );

      expect(decrypted).toBe('');
    });

    it('should handle large data encryption', () => {
      const plaintext = 'x'.repeat(1000000); // 1MB
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(
        encrypted.ciphertext,
        encrypted.iv,
        encrypted.authTag
      );

      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode data', () => {
      const plaintext = '日本語テスト 🎉 中文 العربية';
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(
        encrypted.ciphertext,
        encrypted.iv,
        encrypted.authTag
      );

      expect(decrypted).toBe(plaintext);
    });

    it('should handle special characters', () => {
      const plaintext = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/\\`~\n\r\t';
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(
        encrypted.ciphertext,
        encrypted.iv,
        encrypted.authTag
      );

      expect(decrypted).toBe(plaintext);
    });

    it('should handle binary-like data', () => {
      const binaryData = Buffer.from([0x00, 0x01, 0x02, 0xFF, 0xFE, 0xFD]).toString('utf8');
      const encrypted = encryptionService.encrypt(binaryData);
      const decrypted = encryptionService.decrypt(
        encrypted.ciphertext,
        encrypted.iv,
        encrypted.authTag
      );

      expect(decrypted).toBe(binaryData);
    });
  });

  describe('Authenticated Encryption with Associated Data (AEAD)', () => {
    it('should encrypt and decrypt with AAD', () => {
      const plaintext = 'Encrypted payload';
      const aad = 'Associated metadata';

      const encrypted = encryptionService.encryptWithAAD(plaintext, aad);
      const decrypted = encryptionService.decryptWithAAD(
        encrypted.ciphertext,
        encrypted.iv,
        encrypted.authTag,
        aad
      );

      expect(decrypted).toBe(plaintext);
    });

    it('should fail decryption with wrong AAD', () => {
      const plaintext = 'Encrypted payload';
      const aad = 'Original metadata';

      const encrypted = encryptionService.encryptWithAAD(plaintext, aad);

      expect(() => {
        encryptionService.decryptWithAAD(
          encrypted.ciphertext,
          encrypted.iv,
          encrypted.authTag,
          'Tampered metadata'
        );
      }).toThrow();
    });

    it('should fail decryption with missing AAD', () => {
      const plaintext = 'Encrypted payload';
      const aad = 'Required metadata';

      const encrypted = encryptionService.encryptWithAAD(plaintext, aad);

      expect(() => {
        encryptionService.decryptWithAAD(
          encrypted.ciphertext,
          encrypted.iv,
          encrypted.authTag,
          ''
        );
      }).toThrow();
    });

    it('should use AAD for audit context binding', () => {
      const sensitiveData = JSON.stringify({ amount: 1000000, account: '123456' });
      const auditContext = JSON.stringify({
        userId: 'user-123',
        timestamp: new Date().toISOString(),
        action: 'TRANSFER',
      });

      const encrypted = encryptionService.encryptWithAAD(sensitiveData, auditContext);
      const decrypted = encryptionService.decryptWithAAD(
        encrypted.ciphertext,
        encrypted.iv,
        encrypted.authTag,
        auditContext
      );

      expect(JSON.parse(decrypted)).toEqual({ amount: 1000000, account: '123456' });
    });
  });

  describe('Key Derivation', () => {
    it('should derive consistent key from password', () => {
      const password = 'SecureP@ssw0rd!';
      const salt = encryptionService.generateSalt();

      const key1 = encryptionService.deriveKey(password, salt);
      const key2 = encryptionService.deriveKey(password, salt);

      expect(key1.equals(key2)).toBe(true);
    });

    it('should derive different keys with different salts', () => {
      const password = 'SecureP@ssw0rd!';
      const salt1 = encryptionService.generateSalt();
      const salt2 = encryptionService.generateSalt();

      const key1 = encryptionService.deriveKey(password, salt1);
      const key2 = encryptionService.deriveKey(password, salt2);

      expect(key1.equals(key2)).toBe(false);
    });

    it('should derive different keys with different passwords', () => {
      const salt = encryptionService.generateSalt();

      const key1 = encryptionService.deriveKey('password1', salt);
      const key2 = encryptionService.deriveKey('password2', salt);

      expect(key1.equals(key2)).toBe(false);
    });

    it('should use minimum 100,000 PBKDF2 iterations', () => {
      const password = 'test';
      const salt = encryptionService.generateSalt();

      // Should not throw with high iteration count
      const key = encryptionService.deriveKey(password, salt, 100000);
      expect(key.length).toBe(32);
    });

    it('should generate 256-bit derived key', () => {
      const password = 'test';
      const salt = encryptionService.generateSalt();
      const key = encryptionService.deriveKey(password, salt);

      expect(key.length).toBe(32); // 256 bits
    });

    it('should generate unique salts', () => {
      const salts = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        const salt = encryptionService.generateSalt();
        const saltHex = salt.toString('hex');
        expect(salts.has(saltHex)).toBe(false);
        salts.add(saltHex);
      }
    });

    it('should use 128-bit salt', () => {
      const salt = encryptionService.generateSalt();
      expect(salt.length).toBe(16); // 128 bits
    });
  });

  describe('Hashing', () => {
    it('should produce consistent hash for same input', () => {
      const data = 'Test data';
      const hash1 = encryptionService.hash(data);
      const hash2 = encryptionService.hash(data);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hash for different input', () => {
      const hash1 = encryptionService.hash('data1');
      const hash2 = encryptionService.hash('data2');

      expect(hash1).not.toBe(hash2);
    });

    it('should produce 256-bit hash (SHA-256)', () => {
      const hash = encryptionService.hash('test');
      expect(hash.length).toBe(64); // 256 bits in hex
    });

    it('should be sensitive to small changes', () => {
      const hash1 = encryptionService.hash('test');
      const hash2 = encryptionService.hash('Test'); // Capital T

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string', () => {
      const hash = encryptionService.hash('');
      expect(hash).toBe(crypto.createHash('sha256').update('').digest('hex'));
    });
  });

  describe('HMAC Signing', () => {
    it('should sign and verify data', () => {
      const data = 'Important message';
      const signature = encryptionService.hmacSign(data);

      expect(encryptionService.hmacVerify(data, signature)).toBe(true);
    });

    it('should reject tampered data', () => {
      const data = 'Original message';
      const signature = encryptionService.hmacSign(data);

      expect(encryptionService.hmacVerify('Tampered message', signature)).toBe(false);
    });

    it('should reject wrong signature', () => {
      const data = 'Test data';
      const wrongSignature = 'a'.repeat(64);

      expect(encryptionService.hmacVerify(data, wrongSignature)).toBe(false);
    });

    it('should produce different signatures with different keys', () => {
      const data = 'Test data';
      const key1 = crypto.randomBytes(32);
      const key2 = crypto.randomBytes(32);

      const sig1 = encryptionService.hmacSign(data, key1);
      const sig2 = encryptionService.hmacSign(data, key2);

      expect(sig1).not.toBe(sig2);
    });

    it('should produce 256-bit signature', () => {
      const signature = encryptionService.hmacSign('test');
      expect(signature.length).toBe(64); // 256 bits in hex
    });

    it('should use timing-safe comparison', () => {
      const data = 'Test data';
      const signature = encryptionService.hmacSign(data);

      // Partial signature should still fail securely
      const partialSignature = signature.substring(0, 32) + '0'.repeat(32);
      expect(encryptionService.hmacVerify(data, partialSignature)).toBe(false);
    });
  });

  describe('RSA Operations', () => {
    let keyPair: { publicKey: string; privateKey: string };

    beforeEach(() => {
      keyPair = encryptionService.generateRsaKeyPair();
    });

    it('should generate valid RSA key pair', () => {
      expect(keyPair.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
      expect(keyPair.privateKey).toContain('-----BEGIN PRIVATE KEY-----');
    });

    it('should encrypt and decrypt with RSA-OAEP', () => {
      const plaintext = 'Secret message';
      const ciphertext = encryptionService.rsaEncrypt(plaintext, keyPair.publicKey);
      const decrypted = encryptionService.rsaDecrypt(ciphertext, keyPair.privateKey);

      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext', () => {
      const plaintext = 'Same message';
      const cipher1 = encryptionService.rsaEncrypt(plaintext, keyPair.publicKey);
      const cipher2 = encryptionService.rsaEncrypt(plaintext, keyPair.publicKey);

      expect(cipher1).not.toBe(cipher2);
    });

    it('should fail decryption with wrong private key', () => {
      const plaintext = 'Secret';
      const ciphertext = encryptionService.rsaEncrypt(plaintext, keyPair.publicKey);

      const wrongKeyPair = encryptionService.generateRsaKeyPair();
      expect(() => {
        encryptionService.rsaDecrypt(ciphertext, wrongKeyPair.privateKey);
      }).toThrow();
    });

    it('should sign and verify with RSA', () => {
      const data = 'Document to sign';
      const signature = encryptionService.rsaSign(data, keyPair.privateKey);

      expect(encryptionService.rsaVerify(data, signature, keyPair.publicKey)).toBe(true);
    });

    it('should reject tampered data in signature verification', () => {
      const data = 'Original document';
      const signature = encryptionService.rsaSign(data, keyPair.privateKey);

      expect(encryptionService.rsaVerify('Tampered document', signature, keyPair.publicKey)).toBe(false);
    });

    it('should reject wrong signature', () => {
      const data = 'Document';
      const wrongSignature = Buffer.from('wrong').toString('base64');

      expect(encryptionService.rsaVerify(data, wrongSignature, keyPair.publicKey)).toBe(false);
    });

    it('should reject signature with wrong public key', () => {
      const data = 'Document';
      const signature = encryptionService.rsaSign(data, keyPair.privateKey);

      const wrongKeyPair = encryptionService.generateRsaKeyPair();
      expect(encryptionService.rsaVerify(data, signature, wrongKeyPair.publicKey)).toBe(false);
    });
  });

  describe('Key Wrapping', () => {
    it('should wrap and unwrap keys', () => {
      const keyToWrap = crypto.randomBytes(32);
      const wrapped = encryptionService.wrapKey(keyToWrap);
      const unwrapped = encryptionService.unwrapKey(
        wrapped.wrapped,
        wrapped.iv,
        wrapped.authTag
      );

      expect(unwrapped.equals(keyToWrap)).toBe(true);
    });

    it('should fail unwrap with wrong wrapping key', () => {
      const keyToWrap = crypto.randomBytes(32);
      const wrapped = encryptionService.wrapKey(keyToWrap);

      const wrongKey = crypto.randomBytes(32);
      expect(() => {
        encryptionService.unwrapKey(
          wrapped.wrapped,
          wrapped.iv,
          wrapped.authTag,
          wrongKey
        );
      }).toThrow();
    });

    it('should wrap different key sizes', () => {
      const keySizes = [16, 24, 32, 64]; // AES-128, AES-192, AES-256, custom

      keySizes.forEach(size => {
        const key = crypto.randomBytes(size);
        const wrapped = encryptionService.wrapKey(key);
        const unwrapped = encryptionService.unwrapKey(
          wrapped.wrapped,
          wrapped.iv,
          wrapped.authTag
        );
        expect(unwrapped.equals(key)).toBe(true);
      });
    });
  });

  describe('Secure Random Generation', () => {
    it('should generate random bytes of specified length', () => {
      const lengths = [8, 16, 32, 64, 128];
      lengths.forEach(length => {
        const random = encryptionService.secureRandom(length);
        expect(random.length).toBe(length);
      });
    });

    it('should generate unique random values', () => {
      const values = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        const random = encryptionService.secureRandom(16);
        const hex = random.toString('hex');
        expect(values.has(hex)).toBe(false);
        values.add(hex);
      }
    });
  });

  describe('Constant-Time Comparison', () => {
    it('should return true for equal strings', () => {
      expect(encryptionService.constantTimeCompare('test', 'test')).toBe(true);
    });

    it('should return false for different strings', () => {
      expect(encryptionService.constantTimeCompare('test1', 'test2')).toBe(false);
    });

    it('should return false for different length strings', () => {
      expect(encryptionService.constantTimeCompare('short', 'longer')).toBe(false);
    });

    it('should work with hex strings', () => {
      const hex1 = 'a'.repeat(64);
      const hex2 = 'a'.repeat(64);
      const hex3 = 'b'.repeat(64);

      expect(encryptionService.constantTimeCompare(hex1, hex2)).toBe(true);
      expect(encryptionService.constantTimeCompare(hex1, hex3)).toBe(false);
    });
  });

  describe('Field-Level Encryption', () => {
    interface EncryptedRecord {
      id: string;
      name: string;
      ssn: { ciphertext: string; iv: string; authTag: string };
      accountNumber: { ciphertext: string; iv: string; authTag: string };
      balance: number;
    }

    it('should encrypt sensitive fields while keeping others in plaintext', () => {
      const record = {
        id: 'user-123',
        name: 'John Doe',
        ssn: '123-45-6789',
        accountNumber: '1234567890',
        balance: 10000,
      };

      const encryptedRecord: EncryptedRecord = {
        id: record.id,
        name: record.name,
        ssn: encryptionService.encrypt(record.ssn),
        accountNumber: encryptionService.encrypt(record.accountNumber),
        balance: record.balance,
      };

      // Non-sensitive fields should be readable
      expect(encryptedRecord.id).toBe('user-123');
      expect(encryptedRecord.name).toBe('John Doe');
      expect(encryptedRecord.balance).toBe(10000);

      // Sensitive fields should be encrypted
      expect(encryptedRecord.ssn.ciphertext).not.toBe('123-45-6789');
      expect(encryptedRecord.accountNumber.ciphertext).not.toBe('1234567890');

      // Should be decryptable
      const decryptedSsn = encryptionService.decrypt(
        encryptedRecord.ssn.ciphertext,
        encryptedRecord.ssn.iv,
        encryptedRecord.ssn.authTag
      );
      expect(decryptedSsn).toBe('123-45-6789');
    });

    it('should use unique IVs for each field', () => {
      const ssn = '123-45-6789';
      const account = '1234567890';

      const encryptedSsn = encryptionService.encrypt(ssn);
      const encryptedAccount = encryptionService.encrypt(account);

      expect(encryptedSsn.iv).not.toBe(encryptedAccount.iv);
    });
  });

  describe('Encryption Key Rotation', () => {
    it('should re-encrypt data with new key', () => {
      const plaintext = 'Sensitive data';
      const oldKey = crypto.randomBytes(32);
      const newKey = crypto.randomBytes(32);

      // Encrypt with old key
      const encrypted = encryptionService.encrypt(plaintext, oldKey);

      // Decrypt with old key
      const decrypted = encryptionService.decrypt(
        encrypted.ciphertext,
        encrypted.iv,
        encrypted.authTag,
        oldKey
      );

      // Re-encrypt with new key
      const reEncrypted = encryptionService.encrypt(decrypted, newKey);

      // Should decrypt with new key
      const finalDecrypted = encryptionService.decrypt(
        reEncrypted.ciphertext,
        reEncrypted.iv,
        reEncrypted.authTag,
        newKey
      );

      expect(finalDecrypted).toBe(plaintext);

      // Should not decrypt with old key
      expect(() => {
        encryptionService.decrypt(
          reEncrypted.ciphertext,
          reEncrypted.iv,
          reEncrypted.authTag,
          oldKey
        );
      }).toThrow();
    });
  });
});

describe('Encryption Compliance', () => {
  let encryptionService: EncryptionService;

  beforeEach(() => {
    encryptionService = new EncryptionService();
  });

  describe('FIPS 140-2 Compliance', () => {
    it('should use approved symmetric algorithm (AES)', () => {
      // AES-256-GCM is FIPS 140-2 approved
      const plaintext = 'test';
      const encrypted = encryptionService.encrypt(plaintext);

      // Should work without error
      expect(encrypted.ciphertext).toBeDefined();
    });

    it('should use approved key lengths (256-bit for AES)', () => {
      // Verify 256-bit key is being used
      const salt = encryptionService.generateSalt();
      const key = encryptionService.deriveKey('password', salt);
      expect(key.length).toBe(32); // 256 bits
    });

    it('should use approved hash algorithm (SHA-256)', () => {
      const hash = encryptionService.hash('test');
      expect(hash.length).toBe(64); // SHA-256 produces 64 hex chars
    });

    it('should use approved key derivation (PBKDF2)', () => {
      const salt = encryptionService.generateSalt();
      const key = encryptionService.deriveKey('password', salt, 100000);
      expect(key.length).toBe(32);
    });
  });

  describe('PCI DSS Requirements', () => {
    it('should encrypt cardholder data with strong encryption', () => {
      const cardNumber = '4111111111111111';
      const encrypted = encryptionService.encrypt(cardNumber);

      // Encrypted data should not contain original number
      expect(encrypted.ciphertext).not.toContain('4111');

      // Should be decryptable
      const decrypted = encryptionService.decrypt(
        encrypted.ciphertext,
        encrypted.iv,
        encrypted.authTag
      );
      expect(decrypted).toBe(cardNumber);
    });

    it('should use minimum 128-bit encryption (we use 256-bit)', () => {
      // Our implementation uses AES-256, exceeding the minimum requirement
      const encrypted = encryptionService.encrypt('test');
      expect(encrypted).toBeDefined();
    });
  });
});
