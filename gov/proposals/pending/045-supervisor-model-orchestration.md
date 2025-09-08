# 🤖 45: Supervisor Agent Orchestration for Reviewer Guidance & Cost Control

## BIP Information
**BIP**: 45  
**Title**: Supervisor Agent Orchestration for Reviewer Guidance & Cost Control  
**Author**: Andre  
**Status**: Draft  
**Type**: Process  
**Category**: Governance | Process | Automation | Cost  
**Created**: 2025-09-10  
**License**: MIT

## Abstract
Introduce a pool of lightweight supervisor agents (e.g., deepseek-chat, gpt5-mini) that monitor reviewer models, provide concise contrarian points, propose alternatives, and intercede when necessary to keep reviews on-scope, improve convergence, and control costs. Supervisors coordinate to form consensus on critical interventions and can optionally escalate to a larger model for targeted assistance.

## Motivation
- Some reviewers drift off-scope or become verbose.  
- We need 100% automated operations with balanced costs and consistent quality.  
- Small “coach” agents can steer reviewers early, reducing rework and token usage.  
- Coordinated supervisor consensus improves signal-to-noise and avoids derailment.

## Rationale
A structured multi-agent oversight layer provides bounded, machine-auditable interventions with strict constraints (bullets-only, code citations, rate limits) that integrate into the standardized reviewer workflow (Proposal 44) and transport protocol (Proposal 43).

## Specification

### A. Roles
- Reviewer Models: Primary reviewers following Proposal 44 workflow.  
- Supervisor Pool (Mini Models): Low-cost agents monitoring and nudging.  
- Consensus Arbiter (Mini): Aggregates supervisor votes for critical interventions.  
- Escalation Model (Large): On-demand, targeted assistance when consensus deems necessary.

### B. Intervention Types (Non-blocking by default)
- Soft Nudge: scope alignment, ask for specific evidence/tests.  
- Contrarian Point: concise alternative hypothesis or risk callout.  
- Optimization Suggestion: lower-cost path, improved test/benchmark approach.  
- Blocking Warning (Policy-Triggered): only for security/privacy/regression policy hits; requests reviewer to hold and address.

### C. Triggers
- Heuristics: verbosity threshold, missing evidence/code citations, off-scope indicators.  
- CI Signals: failed tests, coverage drops, lint/security flags.  
- Conflict Detection: reviewers disagree across successive reports.  
- Timeouts: long-running review without decision.

### D. Protocol & Messaging
- Transport: WebSocket with wire negotiation per Proposal 43; default Protocol Buffers.  
- Messages: SUPERVISOR_EVENT, SUPERVISOR_SUGGESTION, SUPERVISOR_CONSENSUS, SUPERVISOR_ESCALATION_REQUEST.  
- Envelope: shared `Envelope` per Proposal 43 with `payload` as schema-specific messages.  
- Rate Limits: max N interventions per review stage; token budget enforced per PR.

### E. Consensus & Escalation
- Voting: odd-sized supervisor quorum (≥3).  
- Critical Interventions require ≥2/3 consensus (documented in consensus artifact).  
- Escalation Criteria: unresolved reviewer conflict + high-severity policy trigger OR repeated failure to meet acceptance criteria.  
- Escalation Scope: specific question-only; strict token cap; single-turn if possible.

### F. Constraints (Guardrails)
- Output Style: bullets-only, ≤6 bullets; each with optional code citation.  
- Evidence First: reference files/lines, test names, or benchmark IDs.  
- No Template Drift: supervisors cannot modify review templates; they append artifacts only.  
- Non-Blocking by Default: except policy-triggered warnings (security/privacy/performance regressions).  
- Budgeting: per-PR and per-day caps; dynamic throttling based on remaining budget.

### G. Artifacts & Templates (New)
- `gov/bips/templates/SUPERVISOR_INTERVENTION.md`: minimal, structured intervention record.  
- `gov/bips/templates/SUPERVISOR_CONSENSUS.md`: consensus log with votes, evidence, decision.  
- `gov/bips/templates/SUPERVISOR_ESCALATION.md`: targeted escalation request/response record.  
- Placement: `gov/bips/BIP-xx/supervisor/` directory (auto-created per BIP).

### H. Governance & CI Checks
- Require supervisor artifacts presence when interventions occurred (non-empty logs).  
- Enforce bullets-only and length limits via lints.  
- Deny edits to first reviewer report (immutable) per governance; supervisors append their own files only.  
- Block final status change if a blocking warning is unresolved.  
- Track budgets and reject supervisor events if spending caps exceeded.

### Implementation Details
- Protocol: add `.proto` messages for supervisor events under `packages/hive-broker/protocol/proto/v1/`.  
- Codegen: Rust/TS bindings for broker and clients (per Proposal 43).  
- Orchestrator: scheduler for triggers, budget, and supervisor selection/rotation.  
- Storage: NDJSON logs + artifacts in `gov/bips/BIP-xx/supervisor/`.  
- Integration: hooks in Proposal 44 workflow stages (scope lock, findings, decision, re-review).

### Success Criteria
- [ ] 20–40% reduction in review tokens on average for comparable BIPs.  
- [ ] ≥25% reduction in time-to-convergence (review rounds).  
- [ ] ≥80% supervisor suggestions contain at least one valid code/test citation.  
- [ ] 0 unauthorized edits to immutable reviewer artifacts.  
- [ ] Budget adherence with no cap breaches in CI.

### Timeline
- Phase 1 (Week 1): Schemas, templates, and orchestrator skeleton.  
- Phase 2 (Week 2): CI lints/checks, budget enforcement, minimal heuristics.  
- Phase 3 (Week 3): Consensus logic, escalation flow, pilot on one BIP.

## Benefits
- Maintains review focus and scope without human supervision.  
- Reduces costs with well-bounded small-model interventions.  
- Improves quality via consensus-backed critical interjections.  
- Provides machine-auditable artifacts for governance.

## Potential Challenges
- Over-intervention noise; mitigated by rate-limits and consensus gating.  
- False positives on heuristics; iteratively tuned with CI feedback.  
- Budget tuning; requires historical baselines.

## Impact Assessment
- **Scope**: system-wide  
- **Complexity**: medium-high  
- **Priority**: high  
- **Estimated Effort**: medium

## Implementation Plan
- Create supervisor templates and add governance references.  
- Implement supervisor messaging schemas and codegen.  
- Build orchestrator with triggers, budget, and consensus logic.  
- Integrate with Proposal 44 stages and Proposal 43 transport.  
- Pilot, measure KPIs, adjust thresholds and caps.

## Next Steps
- Add new templates: `SUPERVISOR_INTERVENTION.md`, `SUPERVISOR_CONSENSUS.md`, `SUPERVISOR_ESCALATION.md`.  
- Update `MASTER_GUIDELINES.md` with supervisor layer and rules.  
- Implement basic orchestrator + CI lints; pilot on the next BIP review.

## References
1. [Master Guidelines](../guidelines/MASTER_GUIDELINES.md)  
2. [Reviewer Workflow (Proposal 44)](pending/044-reviewer-workflow-and-templates.md)  
3. [Transport & Protocols (Proposal 43)](pending/043-event-driven-queue-consumer.md)  
4. [Keep a Changelog Standard](https://keepachangelog.com/en/1.0.0/)

---

**Proposer**: Andre  
**Status**: Draft  
**Date**: 2025-09-10

## Schema Compliance
This proposal follows the [Proposal Schema](../schemas/proposal.schema.json) structure guidelines. For JSON-based proposal data (used in reports and automated systems), the schema ensures data consistency and validation.

**Note**: This is a Markdown proposal document. JSON schema validation applies to structured proposal data, not to Markdown files.
