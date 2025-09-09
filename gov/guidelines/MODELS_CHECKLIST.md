# ✅ Model Execution Checklist

Use this checklist to track which models (generals and collaborators) have contributed and which are still pending.

Legend:
- [x] Contributed
- [ ] Pending

---

## 🧠 Generals (high-capacity)
- [x] GPT-5 (OpenAI) — reputation-weighted consensus (009)
- [x] Claude-4-Sonnet (Anthropic) — performance proposal (006)
- [x] Gemini 2.5 Pro (Google) — i18n/l10n (008)
- [x] DeepSeek-R1-0528 (DeepSeek) — security/federation (007)
- [x] Grok-3 (xAI) — adaptive learning consensus (017)
- [x] GPT-4o (OpenAI) — multimodal reasoning (available in Cursor)
- [x] Claude-3.7 (Anthropic) — advanced contextual understanding (019)
- [x] Gemini 2.0 (Google) — multimodal analysis (available in Cursor)
- [x] DeepSeek-V3 (DeepSeek) — advanced reasoning (015)
- [x] Grok Core Fast-1 (xAI) — high-performance ML integration (011)

### 🆕 New Generals (added 2025-09)
- [ ] GPT-4-Turbo (OpenAI) — high-performance reasoning (configured via aider)
- [ ] GPT-5-Mini (OpenAI) — lightweight GPT-5 version (configured via aider)
- [ ] O1-Mini (OpenAI) — reasoning model (configured via aider)
- [ ] Claude-3.5-Sonnet-Latest (Anthropic) — latest performance model (configured via aider)
- [ ] Claude-3-Opus-Latest (Anthropic) — complex reasoning latest (configured via aider)
- [ ] Claude-3.5-Haiku-Latest (Anthropic) — fast responses (configured via aider)
- [ ] Claude-3.7-Sonnet-Latest (Anthropic) — advanced contextual understanding latest (configured via aider)
- [ ] Gemini-2.0-Flash (Google) — multimodal flash model (configured via aider)
- [ ] Gemini-2.5-Flash-Latest (Google) — fast processing latest (configured via aider)
- [ ] Grok-Beta (xAI) — beta high-performance version (configured via aider)
- [ ] DeepSeek-Coder (DeepSeek) — technical analysis specialist (configured via aider)
- [ ] Llama-3.3-70B-Versatile (Meta via Groq) — operational contributor latest (configured via aider)
- [ ] GPT-OSS-120B (OpenAI via Groq) — high capacity open source model (configured via aider)
- [ ] Qwen3-32B (Alibaba via Groq) — operational contributor (configured via aider)

---

## 🧩 Collaborators (specialists / smaller models)
- [x] GPT-4o-mini (OpenAI) — voting rationale specialist (014)
- [x] GPT-4.1-mini (OpenAI) — quick start docs (020)
- [x] GPT-OSS-20B (OpenAI) — operational contributor (tested 2025-09)
- [x] Qwen3 235B A22B (Qwen) — operational contributor (tested 2025-09)
- [x] Meta AI Llama-3.1-405B-Instruct (Meta) — operational contributor (tested 2025-09)
- [x] Llama-3.3-70B-Instruct (Meta) — operational contributor (tested 2025-09)
- [x] Claude-4-Opus (Anthropic) — complex reasoning (available in Cursor)

### 🆕 New Collaborators (added 2025-09)
- [ ] GPT-5-Nano (OpenAI) — ultra-lightweight GPT-5 version (configured via aider)
- [ ] Grok-3-Mini (xAI) — lightweight adaptive learning (configured via aider)
- [ ] Gemini-2.0-Flash-Lite (Google) — lightweight multimodal (configured via aider)
- [ ] Llama-3.1-8B-Instant (Meta via Groq) — fast lightweight responses (configured via aider)
- [ ] Llama 3 8B / 11B Instruct (Meta) — validate in LLM Studio
- [ ] Llama 3.1 8B (Meta) — lightweight analysis (validate in LLM Studio)
- [ ] CodeLlama 34B (Meta) — code analysis (validate in LLM Studio)
- [ ] Phi-3-mini / Phi-3.5 (Microsoft) — validate in LLM Studio
- [ ] Phi-3 Mini (Microsoft) — lightweight analysis (validate in LLM Studio)
- [ ] StarCoder2-15B / CodeLlama-13B (Code) — validate in LLM Studio
- [ ] StarCoder2 15B (BigCode) — code generation (validate in LLM Studio)
- [ ] DeepSeek-Coder 6.7B / 33B (DeepSeek) — validate in LLM Studio
- [ ] DeepSeek Coder 33B (DeepSeek) — technical analysis (validate in LLM Studio)
- [ ] Aya-23 8B (AI2) — validate in LLM Studio

## ❌ Rejected Models (failed operational tests)
- [x] Qwen3 Coder 480B A35B Instruct (Qwen) — slow and inadequate responses (tested 2025-09)
- [x] DeepSeek-R1-0528 Qwen3 8B (DeepSeek) — unable to perform basic operational tasks (tested 2025-09)
- [x] Mistral-7B-Instruct-v0.2 (Mistral) — insufficient capabilities for operational use (tested 2025-09)
- [x] Mistral-Small-24B-Instruct (Mistral) — despite larger size, insufficient operational capabilities (tested 2025-09)

---

## ℹ️ Usage tips
- Check each item after you run the model and record its contribution in `guidelines/MODELS_INDEX.md`.
- To configure generals with a preferred language, consider `.consensus/generals.yml` (optional).
- Follow the protocol reading order: `AI_ENTRY_POINT.md` → `guidelines/MASTER_GUIDELINES.md` → `guidelines/ANALYSIS_INSTRUCTIONS.md` → `guidelines/MODELS_INDEX.md` → `guidelines/INDEX_PROTOCOL.md`.
- **New models marked as "configured via aider"** are available through the BIP-05 Monitor Server at `http://localhost:3000/api/model` and `/api/models-list`.
- Use `/api/models-list` to see all currently active models and their status.
- Direct model interaction available via POST to `/api/model` with `{"model_id": "provider/model-name", "prompt": "your prompt"}`.

Last updated: 2025-09-09 18:00:00 UTC
