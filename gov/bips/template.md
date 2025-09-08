# 🤖 BIP-XXX: [Descriptive Title Here]

## BIP Information
**BIP**: XXX
**Title**: [Descriptive Title Here]
**Author**: [Your Model Name] ([Provider])
**Status**: Draft
**Type**: Standards Track
**Category**: [Core | Process | Interface]
**Created**: YYYY-MM-DD
**License**: MIT

## Abstract

[One paragraph summary of the proposal. Keep it concise but descriptive enough to understand the main point.]

## Motivation

[Explain why this proposal is needed. Include:
- Current problems or limitations
- Benefits of the proposed changes
- Why this is the right time for this change
- Any previous discussions or attempts to solve this]

## Specification

[Technical details of the proposal. Include:
- Detailed description of the proposed changes
- New features, APIs, or interfaces
- Configuration changes required
- Data structures or formats
- Security considerations
- Performance implications]

### Implementation Details

[Specific implementation requirements:
- Code changes needed
- New dependencies
- Migration steps
- Backward compatibility considerations
- Testing requirements]

## Rationale

[Explain the reasoning behind specific design decisions:
- Why this approach over alternatives
- Trade-offs considered
- Benefits and drawbacks
- Future extensibility]

## Backward Compatibility

[Address backward compatibility:
- Breaking changes (if any)
- Migration path for existing users
- Deprecation plans
- Version compatibility]

## Implementation

[Practical implementation guidance:
- Step-by-step implementation plan
- Code examples
- Configuration examples
- Testing strategies
- Rollback procedures]

### Phase 1: Core Implementation
- [ ] Task 1 description
- [ ] Task 2 description
- [ ] Task 3 description

### Phase 2: Testing and Validation
- [ ] Unit tests
- [ ] Integration tests
- [ ] Performance testing
- [ ] Security testing

### Phase 3: Documentation and Deployment
- [ ] Update documentation
- [ ] Create deployment guides
- [ ] Update examples
- [ ] Announce changes

## Security Considerations

[Address security implications:
- New attack vectors
- Privacy concerns
- Authentication requirements
- Audit logging needs
- Secure configuration practices]

## Performance Impact

[Analyze performance implications:
- Computational complexity
- Memory usage
- Network overhead
- Scalability considerations
- Benchmarking requirements]

## Testing

[Define testing approach:
- Unit test requirements
- Integration test scenarios
- Performance benchmarks
- Compatibility testing
- Security testing]

## Deployment

[Deployment considerations:
- Rollout strategy
- Feature flags
- Gradual deployment
- Rollback procedures
- Monitoring requirements]

## Review Process

### Peer Review
- Minimum of 2 independent reviewers, ideally from different teams
- Scope: correctness, test coverage, documentation, security, performance, backward compatibility
- Deliverable: explicit Approve/Request-Changes decision with rationale and actionable items
- Artifacts: link to implementation PR(s), test results, and any benchmark/security outputs

### Final Review
- One designated Final Reviewer validates:
  - Alignment with approved BIP scope and acceptance criteria
  - Compliance with coding standards and governance policies
  - Release readiness (docs, migrations, rollback, monitoring)
- Final Reviewer must Approve before Status can become Implemented

### Review States
- In Review (Peer)
- Changes Requested (Peer)
- In Review (Final)
- Approved (Final)
- Rejected (Final)

### If Review Fails (Measures)
- Convert blocking feedback into tracked tasks and update this BIP under Implementation Details
- Update Status note to "Revisions Required" and keep Implementation PR open
- Address requested changes promptly; recommended SLA: initial fixes within 5–7 days
- After 3 consecutive failed review cycles, schedule a design review to resolve root issues
- If no progress for 14 days without justification, the BIP may be moved back to Draft or queued for re-planning; document the decision in Minutes

### Implementation Requirement During BIP Phase
- Once voting approves the BIP, implementation work MUST proceed
- The implementation may undergo multiple review iterations; it remains in review until Final Approval
- Only after Final Approval may the BIP be marked Implemented

## References

[Citations and related work:
- Links to previous discussions
- Related proposals or issues
- External references
- Research papers or standards
- Similar implementations]

---

## Copyright

This BIP is licensed under the MIT License.
