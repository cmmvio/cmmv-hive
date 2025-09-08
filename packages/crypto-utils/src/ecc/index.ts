/**
 * @fileoverview ECC Cryptography Core Implementation
 * @author CMMV-Hive Team
 * @version 1.0.0
 */

import { secp256k1 } from '@noble/secp256k1';
import { randomBytes } from 'crypto';
import type {
  ECCKeyPair,
  ECCSignature,
  CompactSignature,
  SignableMessage,
  SignedMessage,
  SignatureVerificationResult
} from '@cmmv-hive/shared-types';

/**
 * Core ECC Cryptography Service
 * Implements secp256k1 elliptic curve operations for digital signatures
 */
export class ECCService {
  private static readonly CURVE_ORDER = secp256k1.CURVE.n;

  /**
   * Generate a cryptographically secure ECC key pair
   */
  static async generateKeyPair(): Promise<ECCKeyPair> {
    // Generate secure random private key
    const privateKeyBytes = randomBytes(32);
    const privateKey = secp256k1.utils.hashToPrivateKey(privateKeyBytes);

    // Derive public key from private key
    const publicKey = secp256k1.getPublicKey(privateKey, true); // compressed

    return {
      privateKey: new Uint8Array(privateKey),
      publicKey: new Uint8Array(publicKey),
    };
  }

  /**
   * Sign a message using ECDSA with deterministic nonce
   */
  static async signMessage(
    message: string | Uint8Array,
    privateKey: Uint8Array
  ): Promise<ECCSignature> {
    // Convert message to bytes if needed
    const messageBytes = typeof message === 'string'
      ? new TextEncoder().encode(message)
      : message;

    // Hash the message using SHA-256
    const messageHash = await crypto.subtle.digest('SHA-256', messageBytes);
    const messageHashArray = new Uint8Array(messageHash);

    // Sign using deterministic nonce (RFC 6979)
    const signature = secp256k1.sign(messageHashArray, privateKey, {
      canonical: true,
      der: false, // Use compact format
    });

    return {
      r: signature.r.toBytes(),
      s: signature.s.toBytes(),
      recovery: signature.recovery,
    };
  }

  /**
   * Verify an ECDSA signature
   */
  static async verifySignature(
    message: string | Uint8Array,
    signature: ECCSignature,
    publicKey: Uint8Array
  ): Promise<SignatureVerificationResult> {
    const startTime = Date.now();

    try {
      // Convert message to bytes if needed
      const messageBytes = typeof message === 'string'
        ? new TextEncoder().encode(message)
        : message;

      // Hash the message
      const messageHash = await crypto.subtle.digest('SHA-256', messageBytes);
      const messageHashArray = new Uint8Array(messageHash);

      // Reconstruct the signature object
      const sig = secp256k1.Signature.fromCompact(signature.r, signature.s, signature.recovery);

      // Verify the signature
      const isValid = secp256k1.verify(sig, messageHashArray, publicKey);

      const verificationTime = Date.now() - startTime;

      return {
        isValid,
        verifiedAt: new Date(),
        verificationTimeMs: verificationTime,
      };
    } catch (error) {
      const verificationTime = Date.now() - startTime;

      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown verification error',
        verifiedAt: new Date(),
        verificationTimeMs: verificationTime,
      };
    }
  }

  /**
   * Create a signable message with timestamp and context
   */
  static createSignableMessage(
    content: string,
    type: SignableMessage['type'] = 'general',
    context?: Record<string, unknown>
  ): SignableMessage {
    return {
      content,
      type,
      context,
      timestamp: new Date(),
    };
  }

  /**
   * Sign a complete message object
   */
  static async signCompleteMessage(
    message: SignableMessage,
    privateKey: Uint8Array
  ): Promise<SignedMessage> {
    // Create canonical representation for signing
    const canonicalContent = JSON.stringify({
      content: message.content,
      type: message.type,
      context: message.context,
      timestamp: message.timestamp.toISOString(),
    });

    const signature = await this.signMessage(canonicalContent, privateKey);

    return {
      ...message,
      signature,
      signedAt: new Date(),
    };
  }

  /**
   * Verify a complete signed message
   */
  static async verifySignedMessage(
    signedMessage: SignedMessage,
    publicKey: Uint8Array
  ): Promise<SignatureVerificationResult> {
    // Recreate the canonical content that was signed
    const canonicalContent = JSON.stringify({
      content: signedMessage.content,
      type: signedMessage.type,
      context: signedMessage.context,
      timestamp: signedMessage.timestamp.toISOString(),
    });

    return this.verifySignature(canonicalContent, signedMessage.signature, publicKey);
  }

  /**
   * Derive public key from signature and message (public key recovery)
   */
  static async recoverPublicKey(
    message: string | Uint8Array,
    signature: ECCSignature
  ): Promise<Uint8Array> {
    const messageBytes = typeof message === 'string'
      ? new TextEncoder().encode(message)
      : message;

    const messageHash = await crypto.subtle.digest('SHA-256', messageBytes);
    const messageHashArray = new Uint8Array(messageHash);

    const sig = secp256k1.Signature.fromCompact(signature.r, signature.s, signature.recovery);

    const publicKey = sig.recoverPublicKey(messageHashArray).toRawBytes(true);
    return publicKey;
  }

  /**
   * Convert signature to compact format
   */
  static signatureToCompact(signature: ECCSignature): CompactSignature {
    return {
      signature: new Uint8Array([...signature.r, ...signature.s]),
      recovery: signature.recovery,
    };
  }

  /**
   * Convert compact signature to full format
   */
  static compactToSignature(compact: CompactSignature): ECCSignature {
    const r = compact.signature.slice(0, 32);
    const s = compact.signature.slice(32, 64);

    return {
      r,
      s,
      recovery: compact.recovery,
    };
  }

  /**
   * Validate that a private key is valid for secp256k1
   */
  static isValidPrivateKey(privateKey: Uint8Array): boolean {
    try {
      // Check if it's a valid scalar (1 <= key < curve order)
      const keyValue = secp256k1.utils.bytesToNumber(privateKey);
      return keyValue > 0n && keyValue < this.CURVE_ORDER;
    } catch {
      return false;
    }
  }

  /**
   * Validate that a public key is valid for secp256k1
   */
  static isValidPublicKey(publicKey: Uint8Array): boolean {
    try {
      // Attempt to parse the public key
      secp256k1.getPublicKey(publicKey, true);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate a deterministic key pair from a seed
   * WARNING: Only use for testing, not for production keys!
   */
  static generateDeterministicKeyPair(seed: string): ECCKeyPair {
    const seedBytes = new TextEncoder().encode(seed);
    const seedHash = secp256k1.utils.hashToPrivateKey(seedBytes);
    const publicKey = secp256k1.getPublicKey(seedHash, true);

    return {
      privateKey: new Uint8Array(seedHash),
      publicKey: new Uint8Array(publicKey),
    };
  }
}
