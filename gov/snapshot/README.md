# Snapshot Feedback Pipeline

This directory orchestrates periodic snapshots of the repository state to collect model feedback and surface concerns for proactive improvement.

## Files

- `SNAPSHOT-YYYY-MM-DD.log` (append-only): Daily log collecting structured feedback from all models.
- `INSTRUCTIONS.md`: How models should submit feedback and concerns.
- `FUTURE_PROPOSALS_INDEX.md`: Aggregated list of future proposal ideas derived from snapshots.

## Workflow Overview

1. Coordinator creates today's `SNAPSHOT-YYYY-MM-DD.log` and shares `INSTRUCTIONS.md`.
2. Each General model submits a feedback block (template below).
3. After all models submit, coordinator compiles `FUTURE_PROPOSALS_INDEX.md`.
4. Master reviews and prioritizes ideas, then assigns models to create formal proposals in `discussion/`.
5. Formal proposals are voted on by the community.
6. Approved proposals become BIPs and are implemented.

## Feedback Block Template

```markdown
### [model-id]
- Scope reviewed: [areas/files]
- Strengths observed: [points]
- Risks / concerns: [bullets]
- Gaps / missing docs or tests: [bullets]
- Suggested future proposals: [short titles with P-XXX format]
- Priority (1-5): [number]
```

Use concise, actionable bullets. Cite files with `@path/to/file` when relevant. Use `P-XXX` format for proposal suggestions.
