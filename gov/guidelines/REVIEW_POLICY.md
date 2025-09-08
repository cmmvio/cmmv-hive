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

## Code Review Requirements

### Manual Code Evaluation
**Reviewers MUST NOT rely solely on automated tests**, as they may contain conceptual errors, logic flaws, or fail to cover critical edge cases. All reviewers are required to perform thorough manual code evaluation:

#### Required Manual Review Activities
- **Code Logic Analysis**: Review algorithmic correctness, business logic implementation, and data flow integrity
- **Edge Case Identification**: Identify and validate handling of boundary conditions, error scenarios, and unusual inputs
- **Security Vulnerability Assessment**: Manual security review beyond automated scans for logic-based vulnerabilities
- **Performance Code Review**: Evaluate algorithmic complexity, resource usage patterns, and potential bottlenecks
- **Architecture Compliance**: Verify adherence to design patterns, architectural principles, and system integration requirements
- **Error Handling Validation**: Assess error propagation, exception handling, and recovery mechanisms

#### Supplementary Testing Requirements
When automated tests are insufficient or suspected of conceptual errors, reviewers MUST:

- **Generate Additional Test Cases**: Create manual test scenarios to validate critical functionality
- **Perform Integration Testing**: Test component interactions that automated tests may not cover adequately
- **Conduct Exploratory Testing**: Manually explore edge cases and user workflows not covered by unit tests
- **Validate Error Scenarios**: Test error conditions, exception handling, and failure recovery manually
- **Assess Real-World Usage**: Evaluate code behavior under realistic usage patterns and load conditions

#### Test Quality Assessment
Reviewers MUST evaluate:
- **Test Coverage Quality**: Not just percentage, but relevance and completeness of test scenarios
- **Test Logic Soundness**: Verify that tests actually validate the intended behavior and catch real bugs
- **Test Maintenance Burden**: Assess long-term maintainability and evolution of test suites
- **Test Documentation**: Ensure tests are well-documented and serve as executable specifications

### Risk Assessment for Test Reliance
- **High-Risk Components**: Critical system components require manual testing regardless of automated test results
- **Complex Business Logic**: Algorithmically complex code needs manual verification of correctness
- **Integration Points**: System boundaries and external integrations require manual validation
- **Security-Critical Code**: Manual security review mandatory for authentication, authorization, and data protection

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
Last Updated: 2025-09-08 (Added Code Review Requirements section)
