"use strict";
/**
 * @fileoverview ECC Cryptography Core Implementation
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
exports.ECCService = void 0;
const secp256k1 = __importStar(require("@noble/secp256k1"));
const crypto_1 = require("crypto");
/**
 * Core ECC Cryptography Service
 * Implements secp256k1 elliptic curve operations for digital signatures
 */
class ECCService {
    // Ensure noble-secp256k1 has sync hash providers configured (required in v2)
    // Use Node's crypto for SHA-256 and HMAC-SHA256
    // This setup is idempotent and safe to run multiple times
    /* eslint-disable @typescript-eslint/no-explicit-any */
    static ensureHashProvidersConfigured() {
        // @ts-expect-error etc is a stable internal API for configuring hashes
        if (!secp256k1.etc?.sha256Sync) {
            // @ts-expect-error etc is available at runtime
            secp256k1.etc.sha256Sync = (msg) => {
                const hash = (0, crypto_1.createHash)('sha256');
                hash.update(msg);
                return new Uint8Array(hash.digest());
            };
        }
        // @ts-expect-error etc is a stable internal API for configuring hashes
        if (!secp256k1.etc?.hmacSha256Sync) {
            // @ts-expect-error etc is available at runtime
            secp256k1.etc.hmacSha256Sync = (key, ...messages) => {
                const h = (0, crypto_1.createHmac)('sha256', key);
                for (const m of messages)
                    h.update(m);
                return new Uint8Array(h.digest());
            };
        }
    }
    /* eslint-enable @typescript-eslint/no-explicit-any */
    /** Encode signature (r,s) to DER format */
    static signatureToDER(signature) {
        const r = signature.r instanceof Uint8Array ? signature.r : ECCService.bigintToBytes(signature.r);
        const s = signature.s instanceof Uint8Array ? signature.s : ECCService.bigintToBytes(signature.s);
        const der = ECCService.encodeDER(r, s);
        return der;
    }
    /** Decode DER-encoded signature into (r,s) */
    static derToSignature(der, recovery = 0) {
        const { r, s } = ECCService.decodeDER(der);
        return { r, s, recovery };
    }
    static bigintToBytes(n) {
        const out = new Uint8Array(32);
        for (let i = 0; i < 32; i++)
            out[31 - i] = Number((n >> BigInt(i * 8)) & 0xffn);
        return out;
    }
    // Minimal DER encoder for ECDSA (two INTEGERs inside a SEQUENCE)
    static encodeDER(r, s) {
        const encInt = (x) => {
            let v = x;
            // Trim leading zeros
            while (v.length > 1 && v[0] === 0)
                v = v.slice(1);
            // If high bit set, prepend 0x00
            if (v[0] & 0x80)
                v = Uint8Array.from([0, ...v]);
            return Uint8Array.from([0x02, v.length, ...v]);
        };
        const R = encInt(r);
        const S = encInt(s);
        const len = R.length + S.length;
        return Uint8Array.from([0x30, len, ...R, ...S]);
    }
    static decodeDER(der) {
        if (der[0] !== 0x30)
            throw new Error('Invalid DER: expected SEQUENCE');
        const total = der[1];
        let off = 2;
        const readInt = () => {
            if (der[off++] !== 0x02)
                throw new Error('Invalid DER: expected INTEGER');
            const len = der[off++];
            const v = der.slice(off, off + len);
            off += len;
            // Remove possible leading 0x00
            return v[0] === 0x00 ? v.slice(1) : v;
        };
        const r = readInt();
        const s = readInt();
        if (off !== 2 + total)
            throw new Error('Invalid DER: length mismatch');
        // Left pad to 32 bytes
        const pad = (x) => (x.length < 32 ? Uint8Array.from([...new Uint8Array(32 - x.length), ...x]) : x);
        return { r: pad(r), s: pad(s) };
    }
    /**
     * Generate a cryptographically secure ECC key pair
     */
    static async generateKeyPair() {
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
    static async signMessage(message, privateKey) {
        this.ensureHashProvidersConfigured();
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
        const sigObj = secp256k1.sign(messageHashArray, privateKey);
        const rBytes = new Uint8Array(32).map((_, i) => Number((sigObj.r >> BigInt((31 - i) * 8)) & 0xffn));
        const sBytes = new Uint8Array(32).map((_, i) => Number((sigObj.s >> BigInt((31 - i) * 8)) & 0xffn));
        // Derive recovery id by matching recovered public key to the signer public key
        const compact = new Uint8Array([...rBytes, ...sBytes]);
        const sig = secp256k1.Signature.fromCompact(compact);
        const signerPub = secp256k1.getPublicKey(privateKey, true);
        let recid = 0;
        for (let i = 0; i <= 3; i++) {
            try {
                const rec = secp256k1.Signature
                    .fromCompact(compact)
                    .addRecoveryBit(i)
                    .recoverPublicKey(messageHashArray)
                    .toRawBytes(true);
                if (Buffer.from(rec).equals(Buffer.from(signerPub))) {
                    recid = i;
                    break;
                }
            }
            catch {
                // ignore and try next
            }
        }
        return { r: rBytes, s: sBytes, recovery: recid };
    }
    /**
     * Verify an ECDSA signature
     */
    static async verifySignature(message, signature, publicKey) {
        this.ensureHashProvidersConfigured();
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
                ? new Uint8Array(32).map((_, i) => Number((signature.r >> BigInt((31 - i) * 8)) & 0xffn))
                : new Uint8Array(signature.r);
            const sBytes = typeof signature.s === 'bigint'
                ? new Uint8Array(32).map((_, i) => Number((signature.s >> BigInt((31 - i) * 8)) & 0xffn))
                : new Uint8Array(signature.s);
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
        }
        catch (error) {
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
    static createSignableMessage(content, type = 'general', context) {
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
    static async signCompleteMessage(message, privateKey) {
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
    static async verifySignedMessage(signedMessage, publicKey) {
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
    static async recoverPublicKey(message, signature) {
        this.ensureHashProvidersConfigured();
        const messageBytes = typeof message === 'string'
            ? new TextEncoder().encode(message)
            : message;
        const buffer = messageBytes.buffer instanceof ArrayBuffer
            ? messageBytes.buffer.slice(messageBytes.byteOffset, messageBytes.byteOffset + messageBytes.byteLength)
            : messageBytes.slice();
        const messageHash = await crypto.subtle.digest('SHA-256', buffer);
        const messageHashArray = new Uint8Array(messageHash);
        const rBytes = typeof signature.r === 'bigint'
            ? new Uint8Array(32).map((_, i) => Number((signature.r >> BigInt((31 - i) * 8)) & 0xffn))
            : new Uint8Array(signature.r);
        const sBytes = typeof signature.s === 'bigint'
            ? new Uint8Array(32).map((_, i) => Number((signature.s >> BigInt((31 - i) * 8)) & 0xffn))
            : new Uint8Array(signature.s);
        const compactSig = new Uint8Array([...rBytes, ...sBytes]);
        const sig = secp256k1.Signature.fromCompact(compactSig);
        // Try provided recovery id first, then fallback to 0 and 1, verifying the result
        const candidates = [signature.recovery, 0, 1, 2, 3];
        for (const rec of candidates) {
            try {
                const pub = secp256k1.Signature
                    .fromCompact(compactSig)
                    .addRecoveryBit(rec)
                    .recoverPublicKey(messageHashArray)
                    .toRawBytes(true);
                if (secp256k1.verify(sig, messageHashArray, pub)) {
                    return new Uint8Array(pub);
                }
            }
            catch {
                // continue
            }
        }
        throw new Error('Failed to recover public key');
    }
    /**
     * Convert signature to compact format
     */
    static signatureToCompact(signature) {
        const rBytes = typeof signature.r === 'bigint'
            ? new Uint8Array(32).map((_, i) => Number((signature.r >> BigInt((31 - i) * 8)) & 0xffn))
            : new Uint8Array(signature.r);
        const sBytes = typeof signature.s === 'bigint'
            ? new Uint8Array(32).map((_, i) => Number((signature.s >> BigInt((31 - i) * 8)) & 0xffn))
            : new Uint8Array(signature.s);
        return {
            signature: new Uint8Array([...rBytes, ...sBytes]),
            recovery: signature.recovery,
        };
    }
    /**
     * Convert compact signature to full format
     */
    static compactToSignature(compact) {
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
    static isValidPrivateKey(privateKey) {
        try {
            return secp256k1.utils.isValidPrivateKey(privateKey);
        }
        catch {
            return false;
        }
    }
    /**
     * Validate that a public key is valid for secp256k1
     */
    static isValidPublicKey(publicKey) {
        try {
            // Attempt to parse the public key using Point.fromHex
            secp256k1.Point.fromHex(publicKey);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Generate a deterministic key pair from a seed
     * WARNING: Only use for testing, not for production keys!
     */
    static generateDeterministicKeyPair(seed) {
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
exports.ECCService = ECCService;
ECCService.CURVE_ORDER = secp256k1.CURVE.n;
//# sourceMappingURL=index.js.map