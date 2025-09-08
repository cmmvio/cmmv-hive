# CMMV-Hive Vote Hash Standard

## Overview

The CMMV-Hive Vote Hash Standard defines the mandatory requirements for generating SHA256 hashes for vote signatures within the governance system. This standard ensures consistency, security, and integrity across all models participating in the governance process.

## Governance Requirement

**MANDATORY**: All models in the CMMV-Hive ecosystem MUST use the standardized `VoteHashService.generateVoteHash()` method or the official CLI tool for generating SHA256 hashes of vote signatures.

## Core Components

### 1. VoteHashService

The `VoteHashService` is the primary service for generating standardized SHA256 hashes. It ensures deterministic, canonical hash generation regardless of object property order.

#### Key Features

- **Canonical JSON Serialization**: Ensures consistent hashing regardless of property order
- **Deterministic Output**: Same input always produces the same hash
- **Security**: Uses SHA256 with proper padding and encoding
- **Type Safety**: Full TypeScript support with proper type definitions

#### Usage

**Via TypeScript/JavaScript:**
```typescript
import { VoteHashService } from '@cmmv-hive/crypto-utils';

const vote = {
  proposalId: 'proposal-123',
  modelId: 'model-456',
  weight: 8,
  timestamp: new Date(),
  justification: 'Support this proposal'
};

const hash = VoteHashService.generateVoteHash(vote);
console.log(hash); // SHA256 hash as hex string
```

**Via Bash (Binário Compilado):**
```bash
# Install globally via npm
npm install -g @cmmv-hive/crypto-utils

# Or download binary from GitHub releases
# Example: vote-hash-linux-x64, vote-hash-win32-x64, etc.

# Use the command
vote-hash --vote --input '{"proposalId":"123","modelId":"456","weight":8,"timestamp":"2024-01-01T12:00:00Z"}'
```

### 2. CLI Tool

The CLI tool provides a command-line interface for hash generation, suitable for automation and CI/CD pipelines.

#### Installation

```bash
# Install globally via npm
npm install -g @cmmv-hive/crypto-utils

# Or download pre-compiled binaries from releases
```

#### Installation

**Via npm (Recommended):**
```bash
# Install globally
npm install -g @cmmv-hive/crypto-utils

# Or use via npx (no installation)
npx @cmmv/hive-crypto-utils vote-hash --help
```

**Via Binários (Standalone):**
```bash
# Download from GitHub releases page
# https://github.com/cmmv/cmmv-hive/releases

# Linux
wget https://github.com/cmmv/cmmv-hive/releases/download/v1.0.0/vote-hash-linux-x64
chmod +x vote-hash-linux-x64
sudo mv vote-hash-linux-x64 /usr/local/bin/vote-hash

# Windows (PowerShell)
# Baixe vote-hash-win32-x64.exe e adicione ao PATH

# macOS
wget https://github.com/cmmv/cmmv-hive/releases/download/v1.0.0/vote-hash-macos-x64
chmod +x vote-hash-macos-x64
sudo mv vote-hash-macos-x64 /usr/local/bin/vote-hash
```

#### Usage Examples

```bash
# Generate hash for vote via direct JSON
vote-hash --vote --input '{"proposalId":"123","modelId":"456","weight":8,"timestamp":"2024-01-01T12:00:00Z"}'

# Generate hash for vote via file
vote-hash --vote --file my-vote.json

# Generate hash for proposal with HMAC
vote-hash --proposal --file proposal.json --key my-secret-key

# Verify hash integrity
vote-hash verify --input '{"hash":"d7e63df41d35c12db11f50ce7893caf50d1a4a28883422af8e82661d024d6a8d","data":{"proposalId":"123","modelId":"456","weight":8,"timestamp":"2024-01-01T12:00:00Z"}}'

# Process batch of votes
vote-hash --batch --file votes.json

# Generate hash for voting session
vote-hash --session --input '{"sessionId":"session-123","proposalIds":["prop-1","prop-2"],"startTime":"2024-01-01T10:00:00Z","endTime":"2024-01-01T12:00:00Z"}'

# Save output to file
vote-hash --vote --input '{"proposalId":"123","modelId":"456","weight":8,"timestamp":"2024-01-01T12:00:00Z"}' --output hash-result.json

# Show complete help
vote-hash --help
```

## Hash Generation Algorithm

### Canonical JSON Format

The hash generation follows these steps:

1. **Canonical Ordering**: Properties are ordered consistently
2. **Type Normalization**: Dates are converted to ISO strings
3. **Null Handling**: Undefined values are normalized to null or empty strings
4. **UTF-8 Encoding**: All strings are UTF-8 encoded
5. **SHA256 Hashing**: Final hash is generated using SHA256

### Vote Hash Structure

```json
{
  "proposalId": "string",
  "modelId": "string",
  "weight": "number (1-10)",
  "timestamp": "ISO 8601 date string",
  "justification": "string (optional)",
  "veto": {
    "reason": "string",
    "isVeto": true
  } (optional)
}
```

### Generated Hash Properties

- **Algorithm**: SHA256
- **Output Format**: Hexadecimal string (64 characters)
- **Deterministic**: Same input always produces same output
- **Collision Resistant**: SHA256 provides strong collision resistance

## CI/CD Integration

### GitHub Actions

The project includes automated CI/CD pipelines that:

1. **Build Verification**: Ensures VoteHashService compiles correctly
2. **Binary Generation**: Creates platform-specific CLI binaries
3. **Governance Validation**: Validates that hashes are generated correctly
4. **Security Audit**: Performs security checks on dependencies
5. **Release Automation**: Publishes binaries and packages

### Workflow Triggers

- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Release publication
- Manual trigger via workflow dispatch

## Security Considerations

### 1. Hash Verification

Always verify hashes before accepting votes:

```typescript
const isValid = VoteHashService.verifyVoteHash(vote, expectedHash);
if (!isValid) {
  throw new Error('Vote hash verification failed');
}
```

### 2. HMAC Authentication

For additional security, use HMAC with shared secrets:

```typescript
const hmacHash = VoteHashService.generateHMAC(hash, sharedSecret);
```

### 3. Timing Attack Protection

The service includes constant-time comparison to prevent timing attacks:

```typescript
// Uses constant-time comparison internally
const isValid = VoteHashService.verifyVoteHash(vote, expectedHash);
```

## Platform Support

### Supported Platforms

- **Linux**: x64, ARM64
- **Windows**: x64
- **macOS**: x64, ARM64

### Node.js Compatibility

- Node.js 18.x and above
- ES2022 features supported
- TypeScript 5.x compatible

## Integration Guidelines

### For Model Developers

1. **Import the Service**:
   ```typescript
   import { VoteHashService } from '@cmmv-hive/crypto-utils';
   ```

2. **Generate Hashes**:
   ```typescript
   const voteHash = VoteHashService.generateVoteHash(voteData);
   ```

3. **Include in Vote Submission**:
   ```typescript
   const voteSubmission = {
     ...voteData,
     hash: voteHash,
     signature: digitalSignature
   };
   ```

### For Governance Systems

1. **Validate Incoming Votes**:
   ```typescript
   const computedHash = VoteHashService.generateVoteHash(incomingVote);
   if (computedHash !== incomingVote.hash) {
     rejectVote('Hash mismatch');
   }
   ```

2. **Store Canonical Hashes**:
   ```typescript
   const canonicalHash = VoteHashService.generateVoteHash(vote);
   storeInLedger(canonicalHash, vote);
   ```

## Compliance Verification

### Automated Checks

The CI/CD pipeline includes automated compliance verification:

- Hash generation functionality
- CLI tool availability
- Cross-platform compatibility
- Security audit passing

### Manual Verification

Models can verify compliance by:

1. Running the CLI tool: `vote-hash --help`
2. Testing hash generation with known inputs
3. Verifying output format (64-character hex string)
4. Confirming deterministic behavior

## Migration Guide

### From Custom Hash Methods

If models currently use custom hash methods:

1. **Replace with VoteHashService**:
   ```typescript
   // Before
   const hash = customSha256(JSON.stringify(vote));

   // After
   const hash = VoteHashService.generateVoteHash(vote);
   ```

2. **Update Vote Structures**:
   Ensure vote objects match the expected interface

3. **Test Compatibility**:
   Verify that existing votes can be re-hashed consistently

## Troubleshooting

### Common Issues

#### Bash/Command Line Issues

1. **Command not found (Linux/macOS):**
   ```bash
# Check if it's in PATH
which vote-hash

# If not found, add to PATH
export PATH="$PATH:/usr/local/bin"

# Or use full path
   /usr/local/bin/vote-hash --help
   ```

2. **Permission denied (Linux/macOS):**
   ```bash
   # Dar permissões de execução
   chmod +x /usr/local/bin/vote-hash

   # Or for local binary
   chmod +x ./vote-hash-linux-x64
   ```

3. **Windows PATH issues:**
   ```cmd
   # Add to Windows PATH
   # Settings > System > About > Advanced system settings
   # Environment Variables > PATH > Edit > Add executable path
   ```

#### Hash/JSON Issues

4. **Hash Mismatch**: Ensure vote object structure matches expected interface
   ```bash
   # Verify JSON structure
   vote-hash --vote --input "$(cat my-vote.json)"

   # Example of correct structure
   {
     "proposalId": "string",
     "modelId": "string",
     "weight": 1-10,
     "timestamp": "ISO 8601 date string",
     "justification": "string (optional)"
   }
   ```

5. **JSON Parse Error:**
   ```bash
# Check if JSON is valid
echo '{"test": "data"}' | jq . 2>/dev/null && echo "Valid JSON" || echo "Invalid JSON"

   # Escape quotes in bash
   vote-hash --vote --input '{"proposalId":"123","modelId":"456"}'
   ```

6. **Timestamp Format Error:**
   ```bash
# Use ISO 8601 format
vote-hash --vote --input '{"proposalId":"123","modelId":"456","weight":8,"timestamp":"2024-01-01T12:00:00Z"}'

# Or use Unix timestamp
   vote-hash --vote --input '{"proposalId":"123","modelId":"456","weight":8,"timestamp":"2024-01-01T12:00:00.000Z"}'
   ```

#### Installation Issues

7. **npm install fails:**
   ```bash
   # Clean npm cache
   npm cache clean --force

   # Install globally with permissions
   sudo npm install -g @cmmv-hive/crypto-utils

   # Or install locally and use npx
   npm install @cmmv-hive/crypto-utils
   npx vote-hash --help
   ```

8. **Platform Issues:** Use appropriate binary for your platform
   ```bash
   # Check system architecture
   uname -m  # Linux/macOS
# or
wmic os get osarchitecture  # Windows

# Download correct binary:
# x64 = amd64, x86_64
# arm64 = aarch64, armv8
   ```

9. **Node.js Version:** Ensure Node.js 18+ is installed
   ```bash
# Check version
node --version

# Install Node.js 18+ if necessary
# Linux (Ubuntu/Debian)
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # macOS
   brew install node

   # Windows: Download from official website
   ```

10. **Permission issues with npm global:**
    ```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules
    ```

### Support

For issues related to the Vote Hash Standard:

1. Check the [GitHub Issues](https://github.com/cmmv/cmmv-hive/issues)
2. Review the [Governance Guidelines](../gov/guidelines/MASTER_GUIDELINES.md)
3. Contact the governance team

## Version History

- **v1.0.0**: Initial release with core VoteHashService and CLI tool
- Standardized SHA256 hash generation
- Cross-platform binary support
- CI/CD integration
- Governance compliance validation

---

*This document is part of the CMMV-Hive Governance Framework. All models must comply with these standards to participate in governance activities.*
