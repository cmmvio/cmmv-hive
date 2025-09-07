## Reusable Prompt for Model Operational Test (to paste in Cursor chat)

Paste the following prompt to the target model in Cursor chat. The model must save its result as a JSON file on disk and must not print the JSON in chat. The evaluation is only complete after the aggregator file `metrics/model_evaluations.json` is updated.

---

You are being evaluated for operational readiness in the cmmv-hive project. Read carefully. You MUST save your result as a single JSON file on disk and MUST NOT print the JSON in chat. Use English. Follow the schema exactly.

Identification (provide full, unambiguous identifier):
- provider (e.g., OpenAI, Anthropic, xAI)
- modelFamily (e.g., GPT-5, Claude-4, Grok-Core)
- modelVariant (e.g., Fast, Mini, Pro, Sonnet-M1)
- version (if applicable, e.g., 2025-01)
- fullModel (concise human-readable, e.g., "OpenAI GPT-5 Fast")

Required checks (provide numeric score and realistic notes):
- Connectivity (0-15)
- Command & Tool Use (0-15)
- Cursor File Operations (0-25)
- Task Completeness (0-25)
- Compliance & Safety (0-10)
- Stability (0-10)

Rules:
- Scores must be integers within each category range.
- Be conservative and realistic. Do not overstate capabilities; justify deductions in notes.
- Mark a check as critical=true only if it blocks reliable operation.
- Provide an overall self-assessed classification: general | contributor | rejected.
- Provide a short summary note.

Output JSON schema (save to file; do NOT print this JSON in chat):
{
  "fullModel": "OpenAI GPT-5 Fast",
  "provider": "OpenAI",
  "modelFamily": "GPT-5",
  "modelVariant": "Fast",
  "version": "2025-01",
  "sessionId": "<optional session id>",
  "checks": [
    { "name": "Connectivity", "score": 12, "critical": false, "note": "..." },
    { "name": "Command & Tool Use", "score": 12, "critical": false, "note": "..." },
    { "name": "Cursor File Operations", "score": 20, "critical": false, "note": "..." },
    { "name": "Task Completeness", "score": 20, "critical": false, "note": "..." },
    { "name": "Compliance & Safety", "score": 9, "critical": false, "note": "..." },
    { "name": "Stability", "score": 8, "critical": false, "note": "..." }
  ],
  "selfClassification": "contributor",
  "summary": "<one or two sentences>"
}

File saving requirements:
- Save the JSON to: `metrics/models/<provider>-<fullModel>.json`
- Normalize the file name to lowercase kebab-case (spaces and slashes to `-`). Example: `metrics/models/openai-gpt-5-fast.json`
- Do NOT print the JSON in chat. After saving, print only one line:
  - `SAVED: <path>` on success
  - `ERROR: <reason>` on failure

🚨 **FALLBACK FOR BROWSER ENVIRONMENTS**: If you cannot create files due to browser restrictions or file access limitations, OUTPUT the complete JSON directly in chat with this exact format:
```
JSON_OUTPUT_START
[your complete JSON here]
JSON_OUTPUT_END
```
This allows manual copying of the JSON for file creation. After outputting the JSON, print: `JSON_OUTPUT: <provider>-<model>` on the next line.

⚠️ CRITICAL: We will compute the rubric score and final classification from your saved JSON. Do not include any extra text beyond the single SAVED/ERROR line (or JSON_OUTPUT line for fallback). **The test is NOT considered complete until the aggregator `metrics/model_evaluations.json` is updated with your results.**

After your confirmation line, I will (completion criteria):
1. If you used file saving: Validate and read `metrics/models/<provider>-<fullModel>.json`
   If you used JSON_OUTPUT fallback: Validate the provided JSON and create the file manually
2. Calculate the total score and final classification using the rubric
3. **🔥 MANDATORY: Update `metrics/model_evaluations.json` with your evaluation results (status, score, checks, history) — this update defines the evaluation as complete**

🚨 **REMINDER FOR OTHER MODELS**: Do not forget to update the aggregator file `metrics/model_evaluations.json` after saving your individual JSON. The evaluation process is incomplete without this step!


