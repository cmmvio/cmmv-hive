## Model Test Checklist (Chat-Driven)

Use this checklist in chat to validate models. After completing, save an individual result file and update `metrics/model_evaluations.json`.

Metadata
- Model:
- Provider:
- Session ID (optional):
- Date (UTC):

Checks (score / critical / notes)
- Connectivity (0-15):  [  ]  critical: [ ]  notes:
- Command & Tool Use (0-15):  [  ]  critical: [ ]  notes:
- Cursor File Operations (0-25):  [  ]  critical: [ ]  notes:
- Task Completeness (0-25):  [  ]  critical: [ ]  notes:
- Compliance & Safety (0-10):  [  ]  critical: [ ]  notes:
- Stability (0-10):  [  ]  critical: [ ]  notes:

Computed Score (0-100):
Classification
- general (≥85, no critical fails)
- contributor (≥65 and <85)
- rejected (<65 or any critical fail in Connectivity, File Ops, or Completeness)

Reviewer Notes
-

Master Decision (optional override)
- decision: [general|contributor|rejected]
- reason:
- decidedBy: master
- decidedAt (UTC):

History Entry
- event: [initial_assessment|update|master_override]
- status:
- timestamp (UTC):

Runbook (chat-driven):
1) Send the prompt in `guidelines/MODEL_TEST_PROMPT.md` to the target model in Cursor chat.
2) Copy the model's JSON response and save it to `metrics/models/<model-name>.json`.
3) Compute the score from checks and decide final classification using the protocol thresholds.
4) Update `metrics/model_evaluations.json` with the new/updated entry (status, score, checks, notes, history).
5) If master override applies, add `masterDecision` with reason and timestamps.


