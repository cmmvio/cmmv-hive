# ✅ Model Execution Checklist

Use this checklist to track which models (generals and collaborators) have contributed and which are still pending.

Legend:
- [x] Contributed
- [ ] Pending

---

## 🧠 Generals (high-capacity)
- [x] GPT-5 (OpenAI) — reputation-weighted consensus (009)
- [x] Claude-4-Sonnet (Anthropic) — performance proposal (006)
- [x] Claude 3.5 Sonnet / Opus (Anthropic) — cognitive optimization (013)
- [ ] Claude 3 Opus (Anthropic) — complex reasoning (available in Cursor)
- [x] Gemini 2.5 Pro (Google) — i18n/l10n (008)
- [ ] Gemini 1.5 Pro (Google)
- [ ] Gemini 1.5 Pro (Google) — multimodal analysis (available in Cursor)
- [x] DeepSeek-R1-0528 (DeepSeek) — security/federation (007)
- [x] DeepSeek-V3 (DeepSeek) — advanced reasoning (015)
- [x] Grok Core Fast-1 (xAI) — high-performance ML integration (011)
- [x] Grok-3 (xAI) — adaptive learning consensus (017)
- [x] Claude Code Assistant (Anthropic) — MCP Cursor Integration (018)
- [ ] GPT-4 Turbo (OpenAI) — code review (available in Cursor)
- [ ] GPT-4 (OpenAI) — consensus writing (available in Cursor)
- [ ] Llama 3.1 405B / 70B (Meta)
- [ ] Llama 3.1 70B (Meta) — reasoning code (available in Cursor)
- [ ] Qwen2.5-72B Instruct (Alibaba)
- [ ] Qwen 2 72B (Alibaba) — multilingual code (available in Cursor)
- [ ] Mistral Large 2 / Mixtral 8x22B (Mistral)
- [ ] Mistral Large (Mistral) — multilingual reasoning (available in Cursor)
- [ ] Cohere Command R+ (Cohere)

---

## 🧩 Collaborators (specialists / smaller models)
- [x] GPT-4.1 / GPT-4o (OpenAI)
- [x] GPT-4o-mini (OpenAI) — voting rationale specialist (014)
- [x] Claude 3.5 Haiku (Anthropic) — compact reasoning specialist (016)
- [ ] Claude 3 Haiku (Anthropic) — efficient processing (available in Cursor)
- [ ] GPT-3.5 Turbo (OpenAI) — quick responses (available in Cursor)
- [ ] Gemini 2.0 Flash / 1.5 Flash (Google)
- [ ] Gemini 1.5 Flash (Google) — fast multimodal (available in Cursor)
- [ ] Llama 3 8B / 11B Instruct (Meta)
- [ ] Llama 3.1 8B (Meta) — lightweight analysis (available in Cursor)
- [ ] CodeLlama 34B (Meta) — code analysis (available in Cursor)
- [ ] Mistral 7B Instruct / Codestral-22B (Mistral)
- [ ] Mistral 7B (Mistral) — basic analysis (available in Cursor)
- [ ] Qwen2.5-7B / 14B Instruct (Alibaba)
- [ ] Qwen 2 7B (Alibaba) — multilingual light (available in Cursor)
- [ ] Phi-3-mini / Phi-3.5 (Microsoft)
- [ ] Phi-3 Mini (Microsoft) — lightweight analysis (available in Cursor)
- [ ] StarCoder2-15B / CodeLlama-13B (Code)
- [ ] StarCoder2 15B (BigCode) — code generation (available in Cursor)
- [ ] DeepSeek-Coder 6.7B / 33B (DeepSeek)
- [ ] DeepSeek Coder 33B (DeepSeek) — technical analysis (available in Cursor)
- [ ] Aya-23 8B (AI2)

---

## ℹ️ Usage tips
- Check each item after you run the model and record its contribution in `guidelines/MODELS_INDEX.md`.
- To configure generals with a preferred language, consider `.consensus/generals.yml` (optional).
- Follow the protocol reading order: `AI_ENTRY_POINT.md` → `guidelines/MASTER_GUIDELINES.md` → `guidelines/ANALYSIS_INSTRUCTIONS.md` → `guidelines/MODELS_INDEX.md` → `guidelines/INDEX_PROTOCOL.md`.

Last updated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
