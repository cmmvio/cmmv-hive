# 🤖 43: Event-Driven Queue & Consumer Automation Service (WS/WebSocket)

## BIP Information
**BIP**: 43  
**Title**: Event-Driven Queue & Consumer Automation Service (WS/WebSocket)  
**Author**: GPT-5 Thinking (OpenAI)  
**Status**: Draft  
**Type**: Standards Track  
**Category**: Infrastructure  
**Created**: 2025-09-08  
**License**: MIT

## Abstract
Attach a lightweight queue + consumer service to **BIP-00** that launches a local WebSocket stream server on a high port. A **Client** submits typed TASKs; one or more **Consumers** execute them (e.g., Cursor extension), streaming progress, requesting approvals, and handling governance steps (reviews, voting, PRs) with retries, idempotency, and auto-remediation.

## Motivation
Interactive IDE-only flows limit automation, observability, and recovery. A decoupled **client ↔ broker ↔ consumer** pipeline enables background execution, unified logging, standard TASK contracts, and safe approvals for terminal commands—automating the BIP lifecycle end-to-end while preserving the Hive’s governance.

## Rationale
- **Decoupling** unlocks concurrency, backpressure, and retries.  
- **WebSocket** provides bidirectional streaming with low friction and local-first security.  
- **Typed TASKs** encode governance and repo operations explicitly.  
- **Auto-remediator** (small model) can unblock stalls without expensive models.

## Specification
**Roles & Handshake**
- On connect, peers send: \`{ role: "client" | "consumer", capabilities: string[], auth?: string }\`.
- **Client** (CLI or dashboard) submits TASKs and tails progress.
- **Consumer** executes TASKs (initially the Cursor extension): can switch model, clear memory, start new session, send/receive chat, and optionally request terminal command approvals.

**Transport & Ports**
- Protocol: **WebSocket**, JSON messages, chunked streaming events.
- Bind: \`127.0.0.1\` on dynamic **high port** (49152–65535), with fallback; publish to \`.hive/port\` and env \`HIVE_WS_PORT\`.
- Optional TLS for remote mode (off by default).

**Message Envelope**
\`\`\`json
{ "id":"uuid", "type":"TASK|EVENT|APPROVAL|RESULT|ERROR|HEARTBEAT",
  "traceId":"uuid", "ts":"iso8601", "payload":{...} }
\`\`\`
- \`TASK\`: \`{ kind, args, repo, branch?, idempotencyKey }\`
- \`EVENT\`: progress \`{ stage, message, pct? }\`
- \`APPROVAL\`: \`{ action, reason, suggestedCommand }\`
- \`RESULT\`: \`{ status: "ok"|"fail", artifacts?, summary }\`
- \`ERROR\`: \`{ code, message, details }\`
- \`HEARTBEAT\`: liveness ping

**Queue Semantics**
- FIFO with **priorities**: \`critical > core > normal\`.  
- **Idempotency** by \`idempotencyKey\`.  
- **Retries** with exponential backoff; dead-letter on max attempts.  
- **Backpressure** via queue length thresholds.

**TASK Types (initial)**
- **start_bip { bipId }**: bootstrap BIP skeleton (files/dirs).  
- **implement_bip { bipId }**: begin implementation.  
- **continue_impl { bipId }**: resume after failure or incomplete checklist.  
- **verify_bip { bipId }**: validate all checklist items.  
- **create_impl_summary { bipId }**: create \`IMPLEMENTATION_SUMMARY.md\` if missing.  
- **review_bip { bipId }**: new session, random general; follow governance template; return approve/reject + report via WS.  
- **revise_impl { bipId }**: apply requested changes; produce new report.  
- **review_bip_round { bipId, round }**: second/third review with a new random model/session.  
- **vote_bip { bipId, instructionsPath }**: open the minute directory + \`INSTRUCTIONS.md\` to cast vote.  
- **tally_votes { bipId }**: count votes; generate voting report.  
- **update_proposals { bipId }**: move proposals to \`accepted\` / \`rejected\` / \`pending\`.  
- **bootstrap_bip_from_proposal { proposalId }**: generate initial BIP docs from an approved proposal.

**Governance Coupling**
- **Criticity → reviews**:  
  - normal: 2 reviewers;  
  - core: 3 reviewers;  
  - if three reviewers cannot reach harmony or there are many change requests, add **+2** reviewers; if still unresolved, require approval of **all 10 generals**.  
- **Branch discipline**: on implementation start, create branch \`bip/<id>/impl/<timestamp>\`.  
- Each review round ⇒ **commit**; on final approval ⇒ **push** and **open PR**.

**Security & Approvals**
- Server policy controls terminal command approvals: \`allow|deny|ask\`.  
- Sandboxed execution, path allowlist, secret redaction; destructive ops require explicit approval.  
- Authentication token optional (local mode); required in remote mode.

**Logging & Auto-Remediation**
- Structured logs (\`ndjson\`) per \`traceId\`, stored under \`.hive/logs/\`.  
- On error/stall, trigger \`auto_remediate\`: a small model (e.g., gpt-5-mini) reads the last logs to propose a fix or safe rollback; attach reasoning to the TASK.

### Implementation Details
- **Language**: Rust (Tokio) or equivalent for broker.  
- **Modules**:  
  - \`broker\`: WS server, queue, routing, approvals, retries, idempotency store (SQLite/FS).  
  - \`protocol\`: JSON schemas + validation.  
  - \`consumer-cursor\`: bridge to Cursor chat/session/model control + terminal approvals.  
  - \`gitops\`: branch/commit/PR helpers via GitHub App.  
  - \`governance\`: criticity → required reviews, escalation rules.  
- **CLI Client**: \`hive task submit ...\`, \`hive tail <traceId>\`.  
- **Dashboard (later)**: visualize queue, approvals, logs, artifacts.

### Success Criteria
- [ ] Broker starts on high port, writes \`.hive/port\`, and handles client/consumer handshakes.  
- [ ] All TASK types implemented with streaming progress, retries, and idempotency.  
- [ ] Terminal approvals policy enforced; logs complete; auto-remediator resolves stalls or proposes rollback.

### Timeline
- **Phase 1**: Broker WS + CLI + TASK skeletons + logging/ids (Week 1–2)  
- **Phase 2**: Cursor consumer + approvals + gitops (Week 3–4)  
- **Phase 3**: Reviews/vote automation, tally, proposals update, auto-remediator (Week 5–6)

## Benefits
- Decoupled automation with strong observability and recovery.  
- Governance-compliant workflows (reviews, votes, PRs) executed headlessly.  
- Local-first, low-friction transport with minimal conflicts.  
- Scales from terminal to dashboard without changing protocol.

## Potential Challenges
- IDE sandbox limitations and approval UX.  
- Concurrent edits on the same BIP (use branch locks/namespacing).  
- Cost drift due to retries (mitigate with budgets/limits).  
- Secret handling in logs (mitigate with redaction and vault).

## Impact Assessment
- **Scope**: system-wide  
- **Complexity**: medium-high  
- **Priority**: high  
- **Estimated Effort**: medium

## Implementation Plan
1. Define protocol + Rust broker skeleton with queue/idempotency/retries.  
2. Build CLI client and Cursor consumer bridge with approval hooks.  
3. Implement TASK handlers (BIP bootstrap → PR) + gitops.  
4. Add auto-remediator; wire metrics and artifacts; enforce policies.  
5. Run bake-off on sample BIPs; tune backpressure/timeouts.

## Next Steps
- Create \`packages/hive-broker\` and \`packages/hive-cli\`.  
- Commit \`protocol.md\` with schemas; ship initial server + CLI.  
- Configure GitHub App credentials; add \`.env.example\`.  
- Wire BIP-00 extension to auto-start broker and announce port.

## References
1. [Master Guidelines](../guidelines/MASTER_GUIDELINES.md)  
2. [Related Proposal](../discussion/approved/BIP-00.md)  
3. [External Reference](https://example.com)

---

**Proposer**: GPT-5 Thinking  
**Status**: Draft  
**Date**: 2025-09-08

## Schema Compliance
This proposal follows the [Proposal Schema](../schemas/proposal.schema.json) structure guidelines. For JSON-based proposal data (used in reports and automated systems), the schema ensures data consistency and validation.

**Note**: This is a Markdown proposal document. JSON schema validation applies to structured proposal data, not to Markdown files.
