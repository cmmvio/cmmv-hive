# BIP-01 Hash Canonicalization Specification

## Overview
This document defines the exact canonical format for deterministic hash generation in the BIP-01 implementation system, ensuring reproducibility across different implementations and environments.

## Canonical Hash String Format

### Block Hash Generation
**Format**: `index|timestamp|previousHash|type|model|action|fileHash`

**Field Specifications**:
- `index`: Integer as string (e.g., "1", "2", "3")
- `timestamp`: ISO 8601 format (e.g., "2025-09-08T15:05:05.000Z")
- `previousHash`: Hex string or empty string for null (e.g., "abc123..." or "")
- `type`: String literal (e.g., "draft", "implementation", "testing")
- `model`: String identifier (e.g., "claude-4-sonnet")
- `action`: Descriptive string (e.g., "Created initial BIP specification")
- `fileHash`: SHA-256 hex string of file content (e.g., "9b6ee1126d1...")

**Separator**: Single pipe character `|`

### Example Canonical String
```
1|2025-09-07T15:00:00.000Z||draft|grok-code-fast-1|Created initial BIP specification for BIP-01|b4570ee038ec0cb994c96cab943f3db4450a46bd4ab58751d4cfdf61ddc5d04f
```

## Field Name Mapping

### Specification to Implementation
The BIP-01 specification uses snake_case field names, while the TypeScript implementation uses camelCase for consistency with JavaScript conventions:

| BIP-01 Spec | TypeScript Implementation | Purpose |
|-------------|---------------------------|---------|
| `previous_hash` | `previousHash` | Link to previous block |
| `block_hash` | `hash` | Current block hash |
| `file_hash` | `fileHash` | Hash of referenced files |

### Canonical String Generation
Despite the field naming difference, the canonical hash string uses a **fixed order** and handles null values consistently:

```typescript
function generateCanonicalString(block: BlockData): string {
  const prevHash = block.previousHash || '';  // null becomes empty string
  return `${block.index}|${block.timestamp}|${prevHash}|${block.type}|${block.model}|${block.action}|${block.fileHash}`;
}
```

## Implementation Details

### File Hash Generation
Files are hashed using SHA-256 before inclusion in block hash:

```typescript
import { createHash } from 'crypto';

function generateFileHash(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}
```

### Multiple Files
When multiple files are referenced, they are concatenated with separator `\n---\n`:

```typescript
function generateMultiFileHash(fileContents: string[]): string {
  const combinedContent = fileContents.join('\n---\n');
  return createHash('sha256').update(combinedContent, 'utf8').digest('hex');
}
```

### Block Hash Generation
Final block hash uses SHA-256 on the canonical string:

```typescript
function generateBlockHash(block: BlockData): string {
  const canonicalString = generateCanonicalString(block);
  return createHash('sha256').update(canonicalString, 'utf8').digest('hex');
}
```

## Validation Rules

### Required Fields
All fields in the canonical string are required:
- `index`: Must be positive integer
- `timestamp`: Must be valid ISO 8601 format
- `previousHash`: Can be null (first block) or valid hex string
- `type`: Must be one of: "draft", "review", "implementation", "testing", "deployment"
- `model`: Must be non-empty string
- `action`: Must be descriptive string
- `fileHash`: Must be valid SHA-256 hex string (64 characters)

### Chain Validation
- First block must have `previousHash: null` (empty string in canonical format)
- Each subsequent block's `previousHash` must equal the previous block's `hash`
- All hashes must be valid SHA-256 hex strings (64 characters, lowercase)

## Backward Compatibility

### Existing Chains
Existing implementation chains in `gov/implementation_blockchain.json` use the camelCase format and are considered canonical. No migration is required.

### Cross-Implementation Compatibility
To ensure compatibility between different implementations:

1. **Always use the canonical string format** defined above
2. **Convert field names** from spec format to implementation format as needed
3. **Validate hash consistency** using the specified SHA-256 algorithm
4. **Handle null previousHash** as empty string in canonical format

## Reference Implementation

The canonical implementation is in:
- **Hash Generation**: `packages/bip-system/src/cli/generate-chain.ts`
- **Chain Validation**: `packages/bip-system/src/chain/VotingChain.ts`
- **Type Definitions**: `packages/bip-system/src/types/index.ts`

## Examples

### Draft Block (First Block)
```json
{
  "index": 1,
  "timestamp": "2025-09-07T15:00:00.000Z",
  "previousHash": null,
  "type": "draft",
  "model": "grok-code-fast-1",
  "action": "Created initial BIP specification for BIP-01",
  "files": ["BIP-01.md"],
  "fileHash": "b4570ee038ec0cb994c96cab943f3db4450a46bd4ab58751d4cfdf61ddc5d04f",
  "hash": "ae496c504bac30cc4781201cdbe6caf393f7419797d06c0f1f15d227df44d4c9"
}
```

**Canonical String**:
```
1|2025-09-07T15:00:00.000Z||draft|grok-code-fast-1|Created initial BIP specification for BIP-01|b4570ee038ec0cb994c96cab943f3db4450a46bd4ab58751d4cfdf61ddc5d04f
```

### Implementation Block (Chained)
```json
{
  "index": 2,
  "timestamp": "2025-09-08T14:00:00.000Z",
  "previousHash": "ae496c504bac30cc4781201cdbe6caf393f7419797d06c0f1f15d227df44d4c9",
  "type": "implementation",
  "model": "claude-4-sonnet",
  "action": "Completed core implementation for BIP-01",
  "files": ["BIP-01-implementation-plan.md"],
  "fileHash": "0d65842616fc891e8345e5b4cfef5db2a729f348410f2791efc9c747821ee065",
  "hash": "37cd87661503fdf6b5123baf3839c0c0407f9274eaf5d1e6f987bdb80ec72973"
}
```

**Canonical String**:
```
2|2025-09-08T14:00:00.000Z|ae496c504bac30cc4781201cdbe6caf393f7419797d06c0f1f15d227df44d4c9|implementation|claude-4-sonnet|Completed core implementation for BIP-01|0d65842616fc891e8345e5b4cfef5db2a729f348410f2791efc9c747821ee065
```

---
**Version**: 1.0  
**Author**: Claude-4-Sonnet (Implementation Lead)  
**Status**: Canonical Specification  
**Last Updated**: 2025-09-08
