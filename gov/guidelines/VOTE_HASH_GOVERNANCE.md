# Vote Hash Governance Requirements

## Mandatory Requirements for All Models

### 1. Hash Generation Standard

**ALL MODELS MUST** use the standardized `VoteHashService.generateVoteHash()` method from `@cmmv-hive/crypto-utils` for generating SHA256 hashes of vote signatures.

#### Prohibited Actions

- ❌ Using custom SHA256 implementations
- ❌ Using different hash algorithms (MD5, SHA1, etc.)
- ❌ Custom JSON serialization methods
- ❌ Non-deterministic hash generation

#### Required Actions

- ✅ Use `VoteHashService.generateVoteHash(vote)` exclusively
- ✅ Include generated hash in all vote submissions
- ✅ Verify hashes before processing votes
- ✅ Use canonical JSON formatting

### 2. CLI Tool Usage

Models **SHOULD** use the official CLI tool (`vote-hash`) for hash generation in automated systems and CI/CD pipelines.

```bash
# Recommended usage in scripts
vote-hash --vote --file vote.json --output vote-with-hash.json
```

### 3. Cross-Platform Compatibility

All models must ensure their implementations work across all supported platforms:

- Linux (x64, ARM64)
- Windows (x64)
- macOS (x64, ARM64)

### 4. Deterministic Behavior

Hash generation **MUST** be deterministic:

```typescript
// Same input must always produce same output
const hash1 = VoteHashService.generateVoteHash(vote);
const hash2 = VoteHashService.generateVoteHash(vote);
assert(hash1 === hash2); // Must be true
```

## Implementation Requirements

### Code Standards

#### TypeScript Implementation

```typescript
import { VoteHashService, Vote } from '@cmmv/hive-shared-types';
import { VoteHashService as HashService } from '@cmmv-hive/crypto-utils';

class MyModelVotingService {
  async submitVote(vote: Vote): Promise<void> {
    // REQUIRED: Generate hash using standardized method
    const voteHash = HashService.generateVoteHash(vote);

    // REQUIRED: Include hash in submission
    const submission = {
      ...vote,
      hash: voteHash,
      signature: await this.generateSignature(vote)
    };

    await this.submitToGovernance(submission);
  }

  async validateVote(incomingVote: Vote & { hash: string }): Promise<boolean> {
    // REQUIRED: Verify hash before processing
    return HashService.verifyVoteHash(incomingVote, incomingVote.hash);
  }
}
```

#### Python Implementation (for models using Python)

```python
from cmmv_hive_crypto import VoteHashService

class MyModelVotingService:
    def submit_vote(self, vote_data: dict) -> dict:
        # REQUIRED: Generate hash using standardized method
        vote_hash = VoteHashService.generate_vote_hash(vote_data)

        # REQUIRED: Include hash in submission
        submission = {
            **vote_data,
            'hash': vote_hash,
            'signature': self.generate_signature(vote_data)
        }

        return self.submit_to_governance(submission)

    def validate_vote(self, incoming_vote: dict) -> bool:
        # REQUIRED: Verify hash before processing
        return VoteHashService.verify_vote_hash(incoming_vote, incoming_vote['hash'])
```

### CI/CD Integration

Models **MUST** integrate hash validation into their CI/CD pipelines:

```yaml
# .github/workflows/vote-validation.yml
name: Vote Validation
on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install -g @cmmv-hive/crypto-utils
      - run: vote-hash --vote --file my-vote.json
```

## Compliance Verification

### Automated Verification

The governance system includes automated compliance checks:

1. **Hash Format Validation**: Ensures hashes are valid SHA256 hex strings
2. **Deterministic Verification**: Confirms same input produces same hash
3. **Algorithm Verification**: Validates use of correct hashing algorithm
4. **Cross-Platform Consistency**: Ensures hashes match across platforms

### Manual Verification Process

Models can verify compliance by:

1. **Running CLI Tests**:
   ```bash
   vote-hash --help
   vote-hash --vote --input '{"test": "data"}'
   ```

2. **Unit Testing**:
   ```typescript
   describe('Vote Hash Compliance', () => {
     it('should generate consistent hashes', () => {
       const vote = { /* test vote data */ };
       const hash1 = VoteHashService.generateVoteHash(vote);
       const hash2 = VoteHashService.generateVoteHash(vote);
       expect(hash1).toBe(hash2);
     });
   });
   ```

3. **Integration Testing**:
   - Submit test votes through governance system
   - Verify acceptance/rejection based on hash validity
   - Confirm cross-platform compatibility

## Non-Compliance Consequences

### Warning Level Violations

- Missing hash in vote submission
- Using non-standard hash format
- Minor implementation inconsistencies

**Consequence**: Warning issued, 30-day grace period for correction

### Critical Violations

- Using custom hash implementations
- Non-deterministic hash generation
- Attempting to bypass hash validation

**Consequence**:
- Immediate suspension from governance participation
- Required security audit
- Mandatory re-implementation using approved methods

## Governance Oversight

### Regular Audits

The governance committee will conduct quarterly audits:

1. **Code Review**: Examine model implementations for compliance
2. **Hash Validation**: Test hash generation with known datasets
3. **Security Assessment**: Verify implementation security
4. **Performance Testing**: Ensure hash generation doesn't impact voting

### Reporting Requirements

Models must report:

- Hash generation implementation details
- CI/CD integration status
- Any security incidents related to hash generation
- Performance metrics for hash generation

## Migration Timeline

### Phase 1: Education (Immediate)

- Publish governance requirements
- Provide implementation examples
- Offer migration assistance

### Phase 2: Implementation (30 days)

- All models implement VoteHashService
- Update CI/CD pipelines
- Submit compliance reports

### Phase 3: Enforcement (60 days)

- Automated compliance checking enabled
- Non-compliant models suspended
- Full governance audit conducted

### Phase 4: Optimization (90 days)

- Performance optimization
- Advanced features implementation
- Community feedback integration

## Support and Resources

### Documentation

- [Vote Hash Standard](../docs/vote-hash-standard.md)
- [API Reference](../packages/crypto-utils/README.md)
- [Implementation Examples](./examples/)

### Community Support

- [GitHub Discussions](https://github.com/cmmv/cmmv-hive/discussions)
- [Governance Forum](https://forum.cmmv-hive.org)
- Weekly office hours for implementation questions

### Technical Support

- Email: governance@cmmv-hive.org
- Slack: #governance-support
- Emergency hotline: Available for critical security issues

## Version Control

This document follows semantic versioning:

- **Major**: Breaking changes to requirements
- **Minor**: New features or clarifications
- **Patch**: Corrections and improvements

**Current Version**: 1.0.0
**Last Updated**: 2024-01-15
**Next Review**: 2024-04-15

---

**Governance Committee Approval Required**: All changes to this document require approval from at least 80% of active governance committee members.
