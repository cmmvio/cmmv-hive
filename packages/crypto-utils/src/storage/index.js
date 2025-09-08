"use strict";
/**
 * @fileoverview Secure Key Storage Service
 * @author CMMV-Hive Team
 * @version 1.0.0
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignatureService = exports.ECCService = exports.SecureKeyStorage = void 0;
const crypto_1 = require("crypto");
const secp256k1 = __importStar(require("@noble/secp256k1"));
const index_js_1 = require("../ecc/index.js");
/**
 * Secure Key Storage Service
 * Provides encrypted storage and management of cryptographic keys
 */
class SecureKeyStorage {
    /**
     * Store an encrypted private key
     */
    static async storePrivateKey(keyId, privateKey, passphrase, metadata = {}) {
        const salt = (0, crypto_1.randomBytes)(this.SALT_LENGTH);
        // Derive encryption key from passphrase
        const encryptionKey = (0, crypto_1.pbkdf2Sync)(passphrase, salt, this.PBKDF2_ITERATIONS, this.KEY_LENGTH, 'sha256');
        const iv = (0, crypto_1.randomBytes)(this.IV_LENGTH);
        // Create cipher
        const cipher = (0, crypto_1.createCipheriv)(this.ALGORITHM, encryptionKey, iv);
        // Encrypt the private key
        const encryptedKey = Buffer.concat([
            cipher.update(privateKey),
            cipher.final()
        ]);
        const authTag = cipher.getAuthTag();
        // Store the encrypted key with metadata
        const storageEntry = {
            keyId,
            encryptedPrivateKey: Buffer.concat([
                salt,
                iv,
                authTag,
                encryptedKey
            ]).toString('base64'),
            publicKey: Buffer.from(await this.derivePublicKey(privateKey)).toString('hex'),
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)), // 1 year
            metadata: {
                purpose: 'signing',
                algorithm: 'secp256k1',
                keySize: 256,
                usageCount: 0,
                ...metadata,
            },
        };
        this.inMemoryStorage.set(keyId, storageEntry);
    }
    /**
     * Retrieve and decrypt a private key
     */
    static async retrievePrivateKey(keyId, passphrase) {
        const entry = this.inMemoryStorage.get(keyId);
        if (!entry) {
            throw new Error(`Key ${keyId} not found`);
        }
        // Check if key has expired
        if (new Date() > entry.expiresAt) {
            throw new Error(`Key ${keyId} has expired`);
        }
        try {
            const encryptedData = Buffer.from(entry.encryptedPrivateKey, 'base64');
            // Extract components
            const salt = encryptedData.subarray(0, this.SALT_LENGTH);
            const iv = encryptedData.subarray(this.SALT_LENGTH, this.SALT_LENGTH + this.IV_LENGTH);
            const authTag = encryptedData.subarray(this.SALT_LENGTH + this.IV_LENGTH, this.SALT_LENGTH + this.IV_LENGTH + this.TAG_LENGTH);
            const encryptedKey = encryptedData.subarray(this.SALT_LENGTH + this.IV_LENGTH + this.TAG_LENGTH);
            // Derive decryption key
            const decryptionKey = (0, crypto_1.pbkdf2Sync)(passphrase, salt, this.PBKDF2_ITERATIONS, this.KEY_LENGTH, 'sha256');
            // Create decipher
            const decipher = (0, crypto_1.createDecipheriv)(this.ALGORITHM, decryptionKey, iv);
            decipher.setAuthTag(authTag);
            // Decrypt the private key
            const decryptedKey = Buffer.concat([
                decipher.update(encryptedKey),
                decipher.final()
            ]);
            // Update usage metadata (create new object to avoid readonly issues)
            entry.metadata = {
                ...entry.metadata,
                usageCount: entry.metadata.usageCount + 1,
                lastUsed: new Date(),
            };
            return new Uint8Array(decryptedKey);
        }
        catch (error) {
            throw new Error(`Failed to decrypt key ${keyId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Rotate a key pair with new expiration
     */
    static async rotateKeyPair(oldKeyId, passphrase, newPassphrase) {
        // Retrieve the old key
        const oldPrivateKey = await this.retrievePrivateKey(oldKeyId, passphrase);
        // Generate new key pair
        const newKeyPair = await index_js_1.ECCService.generateKeyPair();
        // Store the new key
        const newKeyId = `rotated-${Date.now()}`;
        await this.storePrivateKey(newKeyId, newKeyPair.privateKey, newPassphrase || passphrase, {
            purpose: 'signing',
            algorithm: 'secp256k1',
            keySize: 256,
            usageCount: 0,
        });
        // Create new model identity
        const now = new Date();
        const expiresAt = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000));
        const modelIdentity = {
            modelName: `rotated-model-${newKeyId}`,
            provider: 'cmmv-hive',
            publicKey: Buffer.from(newKeyPair.publicKey).toString('hex'),
            keyId: newKeyId,
            createdAt: now,
            expiresAt,
            signature: '', // Would be set by SignatureService
        };
        // Remove old key
        this.inMemoryStorage.delete(oldKeyId);
        return modelIdentity;
    }
    /**
     * List all stored keys
     */
    static async listStoredKeys() {
        const identities = [];
        for (const [keyId, entry] of this.inMemoryStorage.entries()) {
            identities.push({
                modelName: `stored-model-${keyId}`,
                provider: 'cmmv-hive',
                publicKey: entry.publicKey,
                keyId,
                createdAt: entry.createdAt,
                expiresAt: entry.expiresAt,
                signature: '', // Not stored for security
            });
        }
        return identities;
    }
    /**
     * Delete a stored key
     */
    static async deleteKey(keyId) {
        return this.inMemoryStorage.delete(keyId);
    }
    /**
     * Get key metadata without decrypting
     */
    static async getKeyMetadata(keyId) {
        const entry = this.inMemoryStorage.get(keyId);
        return entry ? entry.metadata : null;
    }
    /**
     * Check if a key exists and is valid
     */
    static async keyExists(keyId) {
        const entry = this.inMemoryStorage.get(keyId);
        if (!entry)
            return false;
        // Check if key has expired
        return new Date() <= entry.expiresAt;
    }
    /**
     * Get storage statistics
     */
    static getStorageStats() {
        const now = new Date();
        let activeKeys = 0;
        let expiredKeys = 0;
        let totalUsage = 0;
        for (const entry of this.inMemoryStorage.values()) {
            if (now > entry.expiresAt) {
                expiredKeys++;
            }
            else {
                activeKeys++;
            }
            totalUsage += entry.metadata.usageCount;
        }
        return {
            totalKeys: this.inMemoryStorage.size,
            activeKeys,
            expiredKeys,
            totalUsage,
        };
    }
    /**
     * Clean up expired keys
     */
    static cleanupExpiredKeys() {
        const now = new Date();
        let removedCount = 0;
        for (const [keyId, entry] of this.inMemoryStorage.entries()) {
            if (now > entry.expiresAt) {
                this.inMemoryStorage.delete(keyId);
                removedCount++;
            }
        }
        return removedCount;
    }
    /**
     * Derive public key from private key
     */
    static async derivePublicKey(privateKey) {
        return secp256k1.getPublicKey(privateKey, true);
    }
}
exports.SecureKeyStorage = SecureKeyStorage;
SecureKeyStorage.ALGORITHM = 'aes-256-gcm';
SecureKeyStorage.KEY_LENGTH = 32;
SecureKeyStorage.IV_LENGTH = 12; // AES-GCM recommended IV length
SecureKeyStorage.SALT_LENGTH = 32;
SecureKeyStorage.TAG_LENGTH = 16;
SecureKeyStorage.PBKDF2_ITERATIONS = 100000;
SecureKeyStorage.inMemoryStorage = new Map();
// Re-export for convenience
var index_js_2 = require("../ecc/index.js");
Object.defineProperty(exports, "ECCService", { enumerable: true, get: function () { return index_js_2.ECCService; } });
var index_js_3 = require("../signature/index.js");
Object.defineProperty(exports, "SignatureService", { enumerable: true, get: function () { return index_js_3.SignatureService; } });
//# sourceMappingURL=index.js.map