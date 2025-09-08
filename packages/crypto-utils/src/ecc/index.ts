/**
 * @fileoverview ECC Cryptography Core Implementation
 * @author CMMV-Hive Team
 * @version 1.0.0
 */

import * as secp256k1 from '@noble/secp256k1';
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
    const privateKey = secp256k1.utils.randomPrivateKey();

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
    const buffer = messageBytes.buffer instanceof ArrayBuffer
      ? messageBytes.buffer.slice(messageBytes.byteOffset, messageBytes.byteOffset + messageBytes.byteLength)
      : messageBytes.slice();
    const messageHash = await crypto.subtle.digest('SHA-256', buffer);
    const messageHashArray = new Uint8Array(messageHash);

    // Sign using deterministic nonce (RFC 6979)
    const signature = secp256k1.sign(messageHashArray, privateKey);

    return {
      r: new Uint8Array(32).map((_, i) => Number((signature.r >> BigInt((31 - i) * 8)) & 0xffn)),
      s: new Uint8Array(32).map((_, i) => Number((signature.s >> BigInt((31 - i) * 8)) & 0xffn)),
      recovery: signature.recovery ?? 0,
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
      const buffer = messageBytes.buffer instanceof ArrayBuffer
        ? messageBytes.buffer.slice(messageBytes.byteOffset, messageBytes.byteOffset + messageBytes.byteLength)
        : messageBytes.slice();
      const messageHash = await crypto.subtle.digest('SHA-256', buffer);
      const messageHashArray = new Uint8Array(messageHash);

      // Reconstruct the signature object
      const rBytes = typeof signature.r === 'bigint'
        ? new Uint8Array(32).map((_, i) => Number((signature.r as bigint >> BigInt((31 - i) * 8)) & 0xffn))
        : new Uint8Array(signature.r as Uint8Array);
      const sBytes = typeof signature.s === 'bigint'
        ? new Uint8Array(32).map((_, i) => Number((signature.s as bigint >> BigInt((31 - i) * 8)) & 0xffn))
        : new Uint8Array(signature.s as Uint8Array);
      const compactSig = new Uint8Array([...rBytes, ...sBytes]);
      const sig = secp256k1.Signature.fromCompact(compactSig);

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
      context: context || {},
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

    const publicKey = secp256k1.getPublicKey(privateKey, true);

    return {
      ...message,
      signature,
      signerPublicKey: new Uint8Array(publicKey),
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

    const buffer = messageBytes.buffer instanceof ArrayBuffer
      ? messageBytes.buffer.slice(messageBytes.byteOffset, messageBytes.byteOffset + messageBytes.byteLength)
      : messageBytes.slice();
    const messageHash = await crypto.subtle.digest('SHA-256', buffer);
    const messageHashArray = new Uint8Array(messageHash);

    const rBytes = typeof signature.r === 'bigint'
      ? new Uint8Array(32).map((_, i) => Number((signature.r as bigint >> BigInt((31 - i) * 8)) & 0xffn))
      : new Uint8Array(signature.r as Uint8Array);
    const sBytes = typeof signature.s === 'bigint'
      ? new Uint8Array(32).map((_, i) => Number((signature.s as bigint >> BigInt((31 - i) * 8)) & 0xffn))
      : new Uint8Array(signature.s as Uint8Array);
    const compactSig = new Uint8Array([...rBytes, ...sBytes]);
    const sig = secp256k1.Signature.fromCompact(compactSig);

    const publicKey = sig.recoverPublicKey(messageHashArray).toRawBytes(true);
    return new Uint8Array(publicKey);
  }

  /**
   * Convert signature to compact format
   */
  static signatureToCompact(signature: ECCSignature): CompactSignature {
    const rBytes = typeof signature.r === 'bigint'
      ? new Uint8Array(32).map((_, i) => Number((signature.r as bigint >> BigInt((31 - i) * 8)) & 0xffn))
      : new Uint8Array(signature.r as Uint8Array);
    const sBytes = typeof signature.s === 'bigint'
      ? new Uint8Array(32).map((_, i) => Number((signature.s as bigint >> BigInt((31 - i) * 8)) & 0xffn))
      : new Uint8Array(signature.s as Uint8Array);

    return {
      signature: new Uint8Array([...rBytes, ...sBytes]),
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
      return secp256k1.utils.isValidPrivateKey(privateKey);
    } catch {
      return false;
    }
  }

  /**
   * Validate that a public key is valid for secp256k1
   */
  static isValidPublicKey(publicKey: Uint8Array): boolean {
    try {
      // Attempt to parse the public key using Point.fromHex
      secp256k1.Point.fromHex(publicKey);
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
    // Simple deterministic key generation for testing only
    const hash = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      hash[i] = (seedBytes[i % seedBytes.length] ?? 0) ^ (i + 1);
    }

    // Ensure the key is valid by normalizing it
    const privateKey = secp256k1.utils.normPrivateKeyToScalar(hash);
    const privateKeyBytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      privateKeyBytes[31 - i] = Number((privateKey >> BigInt(i * 8)) & 0xffn);
    }

    const publicKey = secp256k1.getPublicKey(privateKeyBytes, true);

    return {
      privateKey: privateKeyBytes,
      publicKey: new Uint8Array(publicKey),
    };
  }
}
