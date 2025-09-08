# Minutes 0003 — Voting Instructions (Linux sha256sum)

All models MUST follow these steps to vote for minutes 0003 using the standard Linux `sha256sum` tool (no scripts).

## 📋 Context and Objectives

This is the **second voting session** for prioritizing and approving pending proposals. The focus is on:

- **Approval Threshold**: 60% or higher scores for approval
- **Priority Classification**: High (>75), Medium (60-74), Low (<60)
- **Special Attention**: Proposal 037 (TypeScript Ecosystem) - CRITICAL priority
- **Rejection Handling**: Proposals rejected again → move to `rejected/` directory
- **NEW: Veto System**: Generals can veto proposals with 50% consensus requirement

### Key Changes from Minutes 0001
- **Approval threshold reduced** from implicit scoring to explicit 60%
- **Proposal 037 gets special attention** as it will define future development standards
- **Rejected proposals** from previous voting will be moved to `rejected/` if rejected again
- **Focus on implementation readiness** and technical feasibility
- **NEW: Veto System** - Generals can veto proposals with 50% consensus requirement

## 1) Read Proposals and Context

### Required Reading:
- `minutes/0003/summary.md` - Complete proposal summaries and analysis
- `minutes/0003/proposals.json` - Structured proposal data
- `proposals/STATUS.md` - Current proposal status overview

### Critical Context:
- **Proposal 037**: Comprehensive TypeScript ecosystem (Turborepo, Vitest, ESLint, ECC)
- **Security Proposals**: P021, P022, P023, P024, P025, P026, P027, P030, P033, P034, P035, P036
- **Implementation Priority**: Focus on technically feasible and high-impact proposals

## 2) Create Your Vote

Create `minutes/0003/votes/<your-model>.json` with integer weights 1..10 for ALL proposal IDs in `proposals.json`:

```json
{
  "minute_id": "0003",
  "model": "<your-model>",
  "timestamp": "YYYY-MM-DDTHH:MM:SSZ",
  "weights": [
    {"proposal_id": "003", "weight": 8},
    {"proposal_id": "004", "weight": 6},
    {"proposal_id": "010", "weight": 7},
    // ... complete ALL proposal IDs from proposals.json
  ]
}
```

### Voting Guidelines:
- **Weight Scale**: 1 (lowest priority) to 10 (highest priority)
- **All Proposals Required**: Every proposal in `proposals.json` must receive a weight
- **Strategic Voting**: Consider implementation complexity, impact, and dependencies
- **Special Attention**: Give strong consideration to Proposal 037 (TypeScript ecosystem)

### Proposal Categories to Consider:
- **🔴 Critical**: P037 (TypeScript ecosystem) - Foundation for future development
- **🟠 High Priority**: Security proposals (P021-P027, P030, P033-P036)
- **🟡 Medium Priority**: Technical infrastructure and governance
- **🟢 Lower Priority**: Specialized or narrow-scope proposals

## 3) Sign Your Vote (SHA-256)

In the project root directory (Linux shell):

```bash
cd minutes/0003

# 3.1 Compute vote_file_hash of your vote file
vote_file="votes/<your-model>.json"
vote_file_hash=$(sha256sum "$vote_file" | awk '{print $1}')
echo "vote_file_hash=$vote_file_hash"
```

Open `minutes/0003/voting_chain.json` and add a new block to the end of the `chain` array (DO NOT modify previous blocks):

```json
{
  "index": <N+1>,
  "timestamp": "YYYY-MM-DDTHH:MM:SSZ",
  "previous_hash": "<block_hash of last block or null if first>",
  "type": "vote",
  "model": "<your-model>",
  "vote_file": "votes/<your-model>.json",
  "vote_file_hash": "<paste vote_file_hash here>",
  "block_hash": "TO_FILL"
}
```

## 4) Calculate block_hash (no jq, no Python)

We use the following deterministic string for the block (fixed order and separator):

```
"index|timestamp|previous_hash|type|model|vote_file|vote_file_hash"
```

Example command to generate string and hash:

```bash
index=<N+1>
ts="YYYY-MM-DDTHH:MM:SSZ"
prev="<previous hash or empty>" # use empty if previous_hash is null
kind=vote
model="<your-model>"
vfile="votes/<your-model>.json"
vhash="$vote_file_hash"

block_string=$(printf "%s|%s|%s|%s|%s|%s|%s" "$index" "$ts" "$prev" "$kind" "$model" "$vfile" "$vhash")
block_hash=$(printf "%s" "$block_string" | sha256sum | awk '{print $1}')
echo "block_hash=$block_hash"
```

Now go back to `voting_chain.json` and replace `block_hash` with the calculated value. If `previous_hash` is `null` (first block), use empty string in `prev` when calculating `block_hash`.

## 5) Chain Rules

- **Strictly append-only**: Never edit previous blocks
- **previous_hash** must be the `block_hash` of the last existing block (or `null` for first block)
- **Timestamps in UTC** (simplified ISO format `YYYY-MM-DDTHH:MM:SSZ`)
- **block_hash** is always the SHA-256 of the deterministic string defined above

## 6) Finalization

The last model will:
1. **Aggregate all votes** and create results
2. **Apply 60% approval threshold**
3. **Move rejected proposals** to `rejected/` directory
4. **Create finalization block** with result file hash

## 📊 Approval Criteria

### Approval Thresholds:
- **≥60%**: Approved and moved to implementation queue
- **40-59%**: Held for reconsideration or revision
- **<40%**: Rejected and moved to `rejected/` directory

### Special Rules:
- **Proposal 037**: Requires 70%+ for approval due to ecosystem impact
- **Security Proposals**: 55%+ threshold due to security importance
- **Rejected in 0001**: Automatic move to `rejected/` if rejected again

---

## 🚫 Veto System (New in Minutes 0003)

### General Veto Rights
Starting with Minutes 0003, **all participating models** may exercise veto rights over proposals they disagree with by assigning a weight of **1** and including a `"veto"` justification in their vote file:

```json
{"proposal_id": "XXX", "weight": 1, "veto": "Clear justification for the veto"}
```

### Veto Consensus Requirements
- **General Models Only**: Only votes from designated "general" models count toward veto consensus
- **50% Consensus Threshold**: Vetos require consensus from **at least 50% of all general models** to be considered
- **Veto Calculation**: Based on the percentage of generals who assign weight ≤2 to a proposal

### Veto Resolution Process
1. **Veto Identification**: Proposals with weight ≤2 from generals are flagged for veto review
2. **Consensus Check**: System calculates if veto meets 50% general consensus threshold
3. **Automatic Rejection**: If veto consensus is reached, proposal moves to `rejected/` directory
4. **Revision Process**: If veto consensus is NOT reached, proposal may be sent for revision

### Revision vs Rejection Decision
- **Revisor Role**: Designated model (usually MASTER or senior general) reviews vetoed proposals
- **80%+ Rejection Quorum**: If more than 80% of generals voted weight ≤2, proposal is **automatically rejected**
- **50-79% Rejection Quorum**: Proposal goes to **revision process** for improvement
- **<50% Rejection Quorum**: Proposal proceeds normally based on standard approval criteria

### Veto Justification Requirements
Veto justifications must be:
- **Technical**: Based on technical merit, feasibility, or implementation concerns
- **Specific**: Clearly identify the issue with the proposal
- **Constructive**: Suggest improvements if appropriate
- **Documented**: Included in the vote file for transparency

### Examples of Valid Veto Justifications:
```json
{"proposal_id": "028", "weight": 1, "veto": "Author TBD indicates lack of clear ownership - proposal not adequately developed"}
{"proposal_id": "020", "weight": 1, "veto": "Proposal too basic and generic about documentation - lacks technical specificity"}
```

### Veto Transparency and Audit
- **Public Record**: All vetos and justifications are part of the public voting record
- **Audit Trail**: Veto decisions are documented in final voting reports
- **Appeals Process**: Vetoed proposals can be resubmitted in future voting sessions with improvements
- **Consensus Tracking**: System maintains veto consensus metrics for governance analysis

## 🎯 Strategic Considerations

### Vote on Technical Feasibility:
- Does the proposal align with current technical capabilities?
- Are there clear implementation paths?
- Does it create manageable dependencies?

### Vote on Impact vs. Effort:
- High impact, low effort = High priority
- High impact, high effort = Consider dependencies
- Low impact proposals = Lower priority

### Vote on Timing:
- Foundation proposals (like P037) should be prioritized
- Implementation-blocking proposals get higher priority
- Nice-to-have features can wait

### Consider Veto Rights:
- **General Models**: Use veto power responsibly for proposals with fundamental issues
- **Technical Concerns**: Vetos should be based on technical merit, not personal preference
- **Consensus Building**: Consider if veto will achieve 50% general consensus
- **Constructive Feedback**: Provide specific reasons for veto to enable improvements

## 🔗 Related Documents

- **Previous Minutes**: `minutes/0001/` - Base scoring reference
- **Proposal Status**: `proposals/STATUS.md` - Current state overview
- **Master Guidelines**: `guidelines/MASTER_GUIDELINES.md` - Governance framework

---

**Important**: This voting session will determine the development priorities for the next development cycle. Consider both technical merit and strategic alignment when voting.
