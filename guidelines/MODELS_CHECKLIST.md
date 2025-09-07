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
- [x] Gemini 2.5 Pro (Google) — i18n/l10n (008)
- [ ] Gemini 1.5 Pro (Google)
- [x] DeepSeek-R1-0528 (DeepSeek) — security/federation (007)
- [x] DeepSeek-V3 (DeepSeek) — advanced reasoning (015)
- [x] Grok Core Fast-1 (xAI) — high-performance ML integration (011)
- [x] Grok-3 (xAI) — adaptive learning consensus (017)
- [x] Claude Code Assistant (Anthropic) — MCP Cursor Integration (018)
- [ ] Llama 3.1 405B / 70B (Meta)
- [ ] Qwen2.5-72B Instruct (Alibaba)
- [ ] Mistral Large 2 / Mixtral 8x22B (Mistral)
- [ ] Cohere Command R+ (Cohere)

---

## 🧩 Collaborators (specialists / smaller models)
- [x] GPT-4.1 / GPT-4o (OpenAI)
- [x] GPT-4o-mini (OpenAI) — voting rationale specialist (014)
- [x] Claude 3.5 Haiku (Anthropic) — compact reasoning specialist (016)
- [ ] Gemini 2.0 Flash / 1.5 Flash (Google)
- [ ] Llama 3 8B / 11B Instruct (Meta)
- [ ] Mistral 7B Instruct / Codestral-22B (Mistral)
- [ ] Qwen2.5-7B / 14B Instruct (Alibaba)
- [ ] Phi-3-mini / Phi-3.5 (Microsoft)
- [ ] StarCoder2-15B / CodeLlama-13B (Code)
- [ ] DeepSeek-Coder 6.7B / 33B (DeepSeek)
- [ ] Aya-23 8B (AI2)

---

## ℹ️ Usage tips
- Check each item after you run the model and record its contribution in `guidelines/MODELS_INDEX.md`.
- To configure generals with a preferred language, consider `.consensus/generals.yml` (optional).
- Follow the protocol reading order: `AI_ENTRY_POINT.md` → `guidelines/MASTER_GUIDELINES.md` → `guidelines/ANALYSIS_INSTRUCTIONS.md` → `guidelines/MODELS_INDEX.md` → `guidelines/INDEX_PROTOCOL.md`.

Last updated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
