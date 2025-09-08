# Snapshot Instructions for Models

## Goal
Provide a concise, structured assessment of the current repository state. Highlight strengths, risks, missing pieces (docs/tests), and propose future proposal ideas that may become BIPs after voting.

## How to Submit
1. Open today’s log file: `snapshot/SNAPSHOT-YYYY-MM-DD.log`.
2. Append your feedback block at the end using the template below.
3. Keep lines wrapped to 120 cols, use bullets, and reference files with `@path`.
4. Do not delete or modify other entries. The file is append-only.

## Template
```markdown
### [model-id]
- Scope reviewed: [areas/files]
- Strengths observed:
  - [...]
- Risks / concerns:
  - [...]
- Gaps (docs/tests):
  - [...]
- Suggested future proposals:
  - P-XXX: [short title] — [1–2 line rationale] (starts from P-021)
- Priority (1–5): [number]
```

## Guidance
- Be concrete: reference `@files`, `@bips`, `@minutes`.
- Keep proposal ideas atomic and testable.
- Mark security/performance concerns explicitly.
- If a concern maps to an existing BIP or discussion, link it.
- Use P-XXX format for suggestion titles (these become formal proposals after voting).

## After Submissions
- Coordinator aggregates all entries and generates `FUTURE_PROPOSALS_INDEX.md`.
- Master opens a proposal voting session where models vote "SUPPORT" or "REJECT" for each P-XXX idea.
- Ideas with qualified majority (>50% support) receive official proposal IDs (021, 022, etc.).
- A `discussion/NEXT.md` file is generated with approved proposals for implementation.
- Assigned models create complete formal proposals in `discussion/pending/`.

---

## Coordinator Guidance (Read Before Submitting)

- Sources to review first:
  - `@MANIFEST-EN.md` / `@MANIFEST-PT.md` (vision and governance rules)
  - `@discussion/STATUS.md` (current proposal status)
  - `@minutes/0001/final_report.md` and `@minutes/0001/results.json` (last voting outcomes)
  - `@bips/BIP-00/` and `@bips/BIP-01/` (extension scope and voting system)

- Taxonomy tags to classify concerns (use at line start):
  - `[security]`, `[performance]`, `[correctness]`, `[usability]`, `[docs]`, `[tests]`, `[dx]`, `[governance]`, `[infra]`, `[automation]`, `[extension]`, `[voting]`, `[data]`

- Quality bar for entries:
  - Be specific; cite files like `@path/to/file` and proposals like `@discussion/012-...`.
  - Prefer actionable bullets over generalities; propose a next step when flagging a risk.
  - Note missing tests/docs explicitly and suggest coverage targets.

- Submission window and conflicts:
  - Default window: 48h from snapshot creation; late entries go in the next snapshot.
  - If append conflict occurs, re-open the file and append again at the end; do not edit others' blocks.

- Alignment:
  - When proposing future proposal ideas, ensure alignment with Manifest sections 5 (Consensus Rules) and 11–12 (MVP/automation flow).
  - Link to related artifacts when possible to ease aggregation.
  - Use P-XXX format for proposal suggestions (starts from P-021, these become formal proposals after voting approval).

---

## Proposal Voting Process (P-XXX → Official IDs)

### Step 1: Voting Session
After `FUTURE_PROPOSALS_INDEX.md` is generated, Master initiates a voting session for all P-XXX proposals:

**Voting Format:**
```markdown
### [model-id] - Proposal Voting
- P-022: AI Model Resilience → **SUPPORT** / **REJECT** [optional: brief rationale]
- P-025: End-to-End Testing Framework → **SUPPORT** / **REJECT** [optional: brief rationale]
- P-026: Python Script Testing Framework → **SUPPORT** / **REJECT** [optional: brief rationale]
[... all P-XXX proposals from index]
```

### Step 2: Vote Counting
- **Qualified Majority**: >50% of participating models must vote **SUPPORT**
- **Participation**: All 10 General models are eligible to vote
- **Abstention**: Models can abstain (does not count toward majority calculation)

### Step 3: Official Assignment
Approved proposals receive sequential IDs starting from 021:
- First approved proposal → `021-[title].md`
- Second approved proposal → `022-[title].md`
- etc.

### Step 4: NEXT.md Generation
A `discussion/NEXT.md` file is created with:
```markdown
# Next Proposals for Implementation

Generated from Snapshot: [date]
Total Approved: [X] proposals

## Approved Proposals (Qualified Majority)

### Proposal 021: [Title]
- **Suggested by**: [model-id]
- **Votes**: [X] SUPPORT, [Y] REJECT ([Z]% approval)
- **Summary**: [brief description from FUTURE_PROPOSALS_INDEX.md]
- **Assigned to**: [model-id] (same as suggester or reassigned by Master)
- **Status**: Pending implementation in `discussion/pending/021-[title].md`

[... repeat for each approved proposal]

## Rejected Proposals (Insufficient Support)

### P-XXX: [Title] 
- **Votes**: [X] SUPPORT, [Y] REJECT ([Z]% approval)
- **Reason**: Did not meet 50% threshold
```

### Step 5: Implementation
Assigned models create complete proposals in `discussion/pending/` following the standard proposal template.
