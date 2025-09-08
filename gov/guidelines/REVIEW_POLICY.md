# Review Policy: Peer and Final Review

## Purpose
Define the mandatory review process for all approved BIPs during implementation, ensuring technical quality, compliance, and release readiness.

## Scope
Applies to all BIPs that have been approved by voting and are entering or are in implementation.

## Principles
- Quality is a shared responsibility.
- Reviews are constructive, actionable, and timely.
- Evidence-driven decisions: tests, benchmarks, security checks, and documentation are required.
- Final Approval is required before a BIP can be marked Implemented.

## Roles and Responsibilities
- Author/Implementer: Delivers implementation, evidence, and addresses feedback.
- Peer Reviewer(s): Provide technical review; at least 2 independent reviewers.
- Final Reviewer: Single designated approver who validates scope adherence and release readiness.
- Maintainers: Ensure process compliance; arbitrate when needed.
- Release Manager (optional): Coordinates release artifacts and rollout readiness.

## Workflow
1. BIP approved by voting → Implementation begins.
2. Peer Review (≥2 reviewers): Approve or Request Changes.
3. Final Review (1 reviewer): Approve or Reject.
4. If Approved (Final): set status to Implemented and proceed to release.

```
Approved → Implement → Peer Review → Final Review → Implemented
                        ↘ Changes Requested ↗
```

## Review States
- In Review (Peer)
- Changes Requested (Peer)
- In Review (Final)
- Approved (Final)
- Rejected (Final)

## Quality Gates (must pass)
- Code Quality: style, static analysis, complexity under control.
- Tests: unit, integration, e2e as applicable; coverage target agreed by team.
- Security: threat considerations; dependency and secret scans; crypto usage verified when relevant.
- Performance: no regressions against baselines; benchmarks when relevant.
- Backward Compatibility: migrations, deprecations, and fallbacks documented.
- Documentation: user/dev docs, changelog, diagrams where useful.
- Operations Readiness: observability, feature flags, rollout and rollback plans.

## Evidence Required
- Links to PR(s) and commit range.
- Test results and coverage summary.
- Security/dependency scan outputs (or N/A with rationale).
- Benchmarks/perf notes (or N/A with rationale).
- Migration plan and rollback strategy if applicable.
- Monitoring/alerting additions if applicable.

## SLAs
- First review response: within 48 hours.
- Address blocking feedback: within 5–7 days.
- Staleness: >14 days without justified progress → move to Draft or re-plan (recorded in Minutes).

## Approval Criteria
- At least 2 Peer Approvals AND 1 Final Approval.
- All Quality Gates met with evidence.
- No unresolved blocking items.

## Failure Measures (if review fails)
- Convert feedback into tracked tasks and update the BIP under Implementation Details.
- Mark status annotation as "Revisions Required" and keep PR open.
- After 3 failed review cycles, schedule a focused design review to resolve root issues.
- After 14 days inactive without justification, move to Draft or re-plan; document in Minutes.

## Exceptions
- Emergency hotfixes may ship with expedited Final Review; a retrospective Peer Review is mandatory within 7 days.

## RACI (high-level)
| Activity | Author | Peer Reviewer | Final Reviewer | Maintainers |
|---|---|---|---|---|
| Implementation | R | C | I | I |
| Peer Review | C | R | I | I |
| Final Review | I | C | R | I |
| Process Compliance | I | I | I | R |

Legend: R = Responsible, A = Accountable, C = Consulted, I = Informed

## References
- BIP Template: `gov/bips/template.md`
- BIP System: `gov/bips/README.md`
- Review Templates: `gov/bips/templates/`

---
Owner: Governance Team
Last Updated: 2025-09-08
