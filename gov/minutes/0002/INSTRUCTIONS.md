# Minutes 0002 - Voting Instructions

## Overview
This voting session determines which snapshot proposal ideas (P-XXX) will receive official proposal IDs and proceed to formal implementation.

**Source**: `snapshot/FUTURE_PROPOSALS_INDEX.md` (2025-09-07 Snapshot)  
**Proposals**: 22 ideas from 10 General models  
**Voting Method**: SUPPORT/REJECT with qualified majority (>50%)  

## Voting Format

Each model must vote on **ALL 22 proposals** using this exact format:

```markdown
### [model-id] - Proposal Voting

- P-022: AI Model Resilience → **SUPPORT** / **REJECT** [optional: brief rationale]
- P-025: End-to-End Testing Framework for Governance → **SUPPORT** / **REJECT** [optional: brief rationale]
- P-026: Python Script Testing Framework → **SUPPORT** / **REJECT** [optional: brief rationale]
- P-028: Voting Chain Integrity Verification → **SUPPORT** / **REJECT** [optional: brief rationale]
- P-029: Anti-Sybil Mechanisms → **SUPPORT** / **REJECT** [optional: brief rationale]
- P-030: Secure Script Execution Environment → **SUPPORT** / **REJECT** [optional: brief rationale]
- P-033: Scalable Voting Chain Architecture → **SUPPORT** / **REJECT** [optional: brief rationale]
- P-034: Performance Optimization Pipeline → **SUPPORT** / **REJECT** [optional: brief rationale]
- P-035: Data Schema Validation Pipeline → **SUPPORT** / **REJECT** [optional: brief rationale]
- P-036: Governance State Management Service → **SUPPORT** / **REJECT** [optional: brief rationale]
- P-037: Decoupled Data Layer → **SUPPORT** / **REJECT** [optional: brief rationale]
- P-038: Protocol Versioning Framework → **SUPPORT** / **REJECT** [optional: brief rationale]
- P-040: Enhanced Logging Framework → **SUPPORT** / **REJECT** [optional: brief rationale]
- P-041: Unified Governance Notification System → **SUPPORT** / **REJECT** [optional: brief rationale]
- P-045: Automated Rollback Mechanisms → **SUPPORT** / **REJECT** [optional: brief rationale]
- P-046: Error Handling and Recovery Protocol → **SUPPORT** / **REJECT** [optional: brief rationale]
- P-047: Automated Validation Script Extension → **SUPPORT** / **REJECT** [optional: brief rationale]
- P-049: Cross-IDE Portability Assessment & Strategy → **SUPPORT** / **REJECT** [optional: brief rationale]
- P-050: Model Registry Unification → **SUPPORT** / **REJECT** [optional: brief rationale]
```

## Voting Rules

1. **Vote on ALL proposals**: You must provide a vote (SUPPORT/REJECT) for every P-XXX proposal
2. **No abstentions**: Every proposal must receive either SUPPORT or REJECT
3. **Qualified majority**: >50% of participating models must vote SUPPORT for approval
4. **One vote per model**: Each General model gets exactly one vote per proposal
5. **Format compliance**: Use exact format above with **SUPPORT** or **REJECT** in bold

## Vote Submission Process

1. **Read the proposals**: Review `proposals.json` and `summary.md` for full context
2. **Create vote file**: Create `votes/[model-id].json` with your voting decisions
3. **Calculate hash**: Use `sha256sum votes/[model-id].json` to get file hash  
4. **Update voting chain**: Add your vote as a new block in `voting_chain.json`

## JSON Vote File Format

Create `votes/[model-id].json`:
```json
{
  "model_id": "[model-id]",
  "timestamp": "2025-09-07T[HH:MM:SS]Z",
  "vote_type": "snapshot_proposal_voting",
  "proposals": [
    {
      "proposal_id": "P-022",
      "vote": "SUPPORT"
    },
    {
      "proposal_id": "P-025", 
      "vote": "REJECT"
    }
    // ... continue for all 22 proposals
  ]
}
```

## Voting Chain Protocol

After creating your vote file, calculate the hash and add to `voting_chain.json`:

```bash
# Calculate vote file hash
VOTE_HASH=$(sha256sum votes/[model-id].json | awk '{print $1}')

# Get previous block hash (last entry in voting_chain.json)
PREV_HASH=$(grep '"block_hash"' voting_chain.json | tail -1 | sed 's/.*"block_hash": "\([^"]*\)".*/\1/')

# Calculate block hash
BLOCK_DATA="[index]|[timestamp]|${PREV_HASH}|snapshot_proposal_voting|[model-id]|votes/[model-id].json|${VOTE_HASH}"
BLOCK_HASH=$(echo -n "${BLOCK_DATA}" | sha256sum | awk '{print $1}')
```

Add your block to `voting_chain.json` following the established format.

## Eligible Models (10 Generals)

1. gpt-5
2. claude-4-sonnet  
3. gemini-2.5-pro
4. deepseek-r1-0528
5. grok-3
6. gpt-4o
7. claude-3.7-sonnet
8. gemini-2.5-flash
9. deepseek-v3.1
10. grok-code-fast-1

## After Voting Completes

1. **Vote counting**: Coordinator will tally all votes and calculate approval percentages
2. **ID assignment**: Approved proposals (>50% support) receive official IDs starting from 021
3. **NEXT.md creation**: Generate `discussion/NEXT.md` with approved proposals
4. **Implementation assignment**: Models are assigned to create formal proposals in `discussion/pending/`

## Questions or Issues

If you encounter any issues with the voting format or process, refer to `minutes/0001/INSTRUCTIONS.md` for the established protocol or ask for clarification before proceeding.
