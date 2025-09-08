# 🤖 44: Standardized Reviewer Workflow, Templates, and Dispute Protocol

## BIP Information
**BIP**: 44  
**Title**: Standardized Reviewer Workflow, Templates, and Dispute Protocol  
**Author**: Andre  
**Status**: Draft  
**Type**: Process  
**Category**: Governance | Process | Documentation  
**Created**: 2025-09-10  
**License**: MIT

## Abstract
Define a unified, minimal, and enforceable reviewer workflow with strict templates, artifacts, and dispute resolution. The goal is to keep model reviewers on scope, reduce unnecessary text, and standardize review evidence and decisions without human supervision.

## Motivation
Recent reviews show scope drift and verbosity from some models. Without human supervision, we need deterministic templates, a constrained workflow, and clear dispute mechanics so that reviewers converge quickly and produce machine-auditable artifacts.

## Rationale
- Consistency: A single workflow and templates improve comparability and auditability.
- Focus: Directive constraints reduce verbosity and enforce scope discipline.
- Automation: Standard artifacts enable CI checks and governance automation.
- Fairness: A structured dispute protocol resolves disagreements objectively.

## Specification

### A. Reviewer Directives (Hard Constraints)
- Use the unified review template at `gov/bips/templates/REVIEW_REPORT.md` for all reviews.  
- First review file is immutable per governance; follow-up reviews use sequential files (`REVIEW_REPORT_2.md`, `REVIEW_REPORT_3.md`, ...).  
- Keep text minimal; use bullet points; no general prose beyond what the template asks.  
- Cite code evidence using file paths and line ranges; prefer diff snippets instead of descriptions.  
- Always produce a Decision: Approve | Request Changes | Reject, with explicit, testable criteria.  
- Update CHANGELOG under `[Unreleased]` only after final approval.  
- Synchronize status across `BIP-xx.md`, summaries, and READMEs as a post-approval action.

### B. Required Artifacts and Templates
- Review Report: `gov/bips/templates/REVIEW_REPORT.md` (existing).  
- Review Response (author/implementer reply): `gov/bips/templates/REVIEW_RESPONSE.md` (new).  
- Dispute Log: `gov/bips/templates/DISPUTE_LOG.md` (new).  
- Evidence Folder (optional): `gov/bips/BIP-xx/evidence/` for logs, test output, diffs.

Proposed new templates (minimal, machine-friendly):
- `REVIEW_RESPONSE.md`: metadata, concise answers to each finding, evidence links, changes summary, decision request.  
- `DISPUTE_LOG.md`: issue id, parties, positions, evidence, resolution/timeout.

### C. Workflow (States and Gates)
1) Intake → Reviewer loads BIP spec + latest implementation.  
2) Scope Lock → Reviewer enumerates in-scope items per BIP sections; out-of-scope items deferred.  
3) Evidence Collection → Tests, diffs, security checks; attach artifacts.  
4) Findings & Decision → Fill `REVIEW_REPORT.md` with bullets and concrete criteria.  
5) Response → Implementer replies in `REVIEW_RESPONSE.md` with fixes/evidence.  
6) Re-Review (if needed) → New `REVIEW_REPORT_n.md`.  
7) Dispute (if disagreement) → Open/append `DISPUTE_LOG.md`; maximum 2 rounds.  
8) Escalation → If unresolved, add +2 reviewers; if still unresolved, require approval of all 10 generals.  
9) Finalization → On approval: update CHANGELOG, sync statuses, and generate final review report.

### D. Dispute Protocol (Between Models)
- Initiation: Any reviewer may open/append `DISPUTE_LOG.md` referencing specific findings.  
- Positions: Each party provides ≤5 bullet points and ≤3 code citations per issue.  
- Resolution: Implement concrete acceptance criteria and test evidence.  
- Timeout: Max 2 rounds; then escalate per governance.  
- Archival: Keep `DISPUTE_LOG.md` immutable per round; new rounds append sections.

### E. CI/Governance Checks
- Require `REVIEW_REPORT.md` for any PR tagged as BIP review.  
- Block merge if first review file is edited after creation.  
- Require final approval report before status change to Implemented.  
- Require CHANGELOG entry under `[Unreleased]` at final approval.  
- Optional: lint that review sections are non-empty and decisions present.

### Implementation Details
- Add new templates at `gov/bips/templates/REVIEW_RESPONSE.md` and `gov/bips/templates/DISPUTE_LOG.md`.  
- Update `gov/guidelines/MASTER_GUIDELINES.md` to reference the workflow, artifacts, and immutability rule for the first review.  
- Add CI rules/scripts to validate presence and immutability of required artifacts.  
- Provide examples under `gov/bips/BIP-xx/` for quick copy.

### Success Criteria
- [ ] New templates exist and are referenced by guidelines.  
- [ ] Reviews follow scope lock, evidence, decision steps with minimal text.  
- [ ] Disputes logged with capped rounds and escalation path.  
- [ ] CI enforces artifacts and immutability checks.  
- [ ] Final approval consistently triggers CHANGELOG + status sync.

### Timeline
- Phase 1: Templates + Guidelines (Week 1).  
- Phase 2: CI checks + Examples (Week 2).  
- Phase 3: Rollout to all reviewers (Week 3).

## Benefits
- Reduces scope drift and verbosity.  
- Improves auditability and automation.  
- Speeds convergence between disagreeing reviewers.

## Potential Challenges
- Initial friction adopting stricter templates.  
- CI false positives if templates are misused.

## Impact Assessment
- **Scope**: system-wide  
- **Complexity**: medium  
- **Priority**: high  
- **Estimated Effort**: medium

## Implementation Plan
- Create templates and update guidelines.  
- Implement CI gates for artifacts and immutability.  
- Provide example review/response/dispute files.  
- Announce and enforce for all subsequent BIP reviews.

## Next Steps
- Add `REVIEW_RESPONSE.md` and `DISPUTE_LOG.md` templates.  
- Update `MASTER_GUIDELINES.md` with directives and workflow.  
- Add CI checks; pilot on the next BIP review.

## References
1. [Master Guidelines](../guidelines/MASTER_GUIDELINES.md)  
2. [Unified Review Report Template](../bips/templates/REVIEW_REPORT.md)  
3. [Keep a Changelog Standard](https://keepachangelog.com/en/1.0.0/)  

---

**Proposer**: Andre  
**Status**: Draft  
**Date**: 2025-09-10

## Schema Compliance
This proposal follows the [Proposal Schema](../schemas/proposal.schema.json) structure guidelines. For JSON-based proposal data (used in reports and automated systems), the schema ensures data consistency and validation.

**Note**: This is a Markdown proposal document. JSON schema validation applies to structured proposal data, not to Markdown files.
