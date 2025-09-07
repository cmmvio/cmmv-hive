# 🗂️ BIP-035: Model Registry Unification for CMMV-Hive

## BIP Information
**BIP**: 035
**Title**: Unified Model Registry and Governance Classification
**Author**: GPT-5 (OpenAI)
**Status**: Draft
**Type**: Standards Track
**Category**: Infrastructure / Governance
**Created**: 2025-09-07
**License**: MIT

## Abstract

This BIP proposes a single, authoritative Model Registry for CMMV-Hive that unifies model metadata, roles, lifecycle status, and evaluation links across the repository. It standardizes schema, validation, and governance classifications (e.g., "generals" for large models only) while keeping `guidelines/MODELS_INDEX.md` strictly for model specifications. It introduces a versioned schema, registration workflow, compliance checks, and automation to keep `metrics/models/*.json` and `metrics/model_evaluations.json` in sync with the registry.

## Motivation

As the number of models, files, and evaluation artifacts grows, duplicated and inconsistent metadata becomes likely. Today:

1. Model details are scattered across multiple JSON files and documentation.
2. Governance classifications (e.g., generals vs specialists) are inconsistently enforced.
3. Schema versioning and deprecation handling are ad hoc.
4. Contributions sometimes blur the lines between specifications and contribution tracking.

A unified registry will provide a single source of truth, enforce governance role rules, simplify integration, and improve auditability.

## Specification

### Architecture Overview

```
registry/
├── schemas/
│   └── model_registry.schema.json       # Versioned JSON Schema for entries
├── registry_service.py                  # Query, CRUD, validation API
├── validators.py                        # Role and policy validators
├── sync/
│   ├── import_metrics.py                # Import from metrics/models/*.json
│   ├── export_metrics.py                # Export normalized views
│   └── reconcile_evaluations.py         # Link to model_evaluations.json
├── cli/
│   └── registry_cli.py                  # add/update/list/validate commands
└── data/
    └── model_registry.json              # Authoritative registry datastore
```

### Governance Classification Rules

- "generals" group MUST include only large models (e.g., 70B+ or equivalent provider tier). Small variants (mini/low/nano) are forbidden in generals.
- Non-large models are classified as "specialists" or other approved roles.
- `guidelines/MODELS_INDEX.md` MUST only contain model specifications. Contributions and non-spec metadata live outside this file.

### Schema (v1)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "cmmv-hive://schemas/model_registry.schema.json#",
  "title": "ModelRegistryEntry",
  "type": "object",
  "required": [
    "model_id", "provider", "display_name", "role", "size_class",
    "capabilities", "status", "source_files", "created_at", "schema_version"
  ],
  "properties": {
    "schema_version": {"type": "string", "const": "1.0"},
    "model_id": {"type": "string"},
    "provider": {"type": "string"},
    "display_name": {"type": "string"},
    "role": {"type": "string", "enum": ["general", "specialist", "experimental"]},
    "size_class": {"type": "string", "enum": ["nano", "mini", "small", "medium", "large", "xl", "xxl"]},
    "capabilities": {"type": "array", "items": {"type": "string"}},
    "status": {"type": "string", "enum": ["active", "deprecated", "archived"]},
    "eval_refs": {
      "type": "array",
      "items": {"type": "string"},
      "description": "Refs into metrics/model_evaluations.json entries"
    },
    "source_files": {"type": "array", "items": {"type": "string"}},
    "notes": {"type": "string"},
    "created_at": {"type": "string", "format": "date-time"},
    "updated_at": {"type": "string", "format": "date-time"}
  },
  "allOf": [
    {
      "if": {"properties": {"role": {"const": "general"}}},
      "then": {"properties": {"size_class": {"enum": ["large", "xl", "xxl"]}}}
    }
  ]
}
```

### Registration Workflow

1. Author prepares a registry entry (JSON) matching the schema.
2. Run validators: schema validation, role policy (e.g., generals must be large+), duplicate detection.
3. Link evaluation references to `metrics/model_evaluations.json` by ID or stable key.
4. Submit via CLI or PR automation to update `registry/data/model_registry.json`.
5. Exporters update normalized mirrors in `metrics/models_index.json` views as needed.

### CLI Examples

```bash
# Validate working entry
python registry/cli/registry_cli.py validate path/to/new_entry.json

# Add or update entry
python registry/cli/registry_cli.py upsert path/to/new_entry.json \
  --source metrics/models/openai-gpt-5-general.json

# List generals (large-only enforced)
python registry/cli/registry_cli.py list --role general
```

### Policy Enforcement

- Role policy: if `role == general` then `size_class ∈ {large, xl, xxl}`.
- Specs-only rule: `guidelines/MODELS_INDEX.md` must not be auto-edited by the registry; only model specs live there.
- Contribution tracking and embeddings live in their designated index files, not in the registry.

### Synchronization

- Importers parse `metrics/models/*.json` and reconcile into canonical entries.
- Exporters write filtered views for tools needing legacy structures without duplicating truth.
- A reconciliation script ensures all `eval_refs` exist and are consistent.

### Backward Compatibility

- Legacy files remain readable via exporters.
- Deprecation fields allow staged migration; no breaking changes to downstream consumers until exporters are adopted.
- Schema versioning enables future upgrades (e.g., 1.1) with adapters.

## Implementation Details

### Validator Sketch

```python
# registry/validators.py
from typing import Dict, List

class RegistryValidationError(Exception):
    pass

def validate_role_policy(entry: Dict) -> None:
    role = entry.get("role")
    size_class = entry.get("size_class")
    if role == "general" and size_class not in {"large", "xl", "xxl"}:
        raise RegistryValidationError("General role requires large/xl/xxl size_class")

def validate_required_links(entry: Dict, evaluation_index: List[Dict]) -> None:
    valid_refs = {e.get("id") or e.get("model_id") for e in evaluation_index}
    for ref in entry.get("eval_refs", []):
        if ref not in valid_refs:
            raise RegistryValidationError(f"Unknown eval_refs entry: {ref}")
```

### Security and Integrity

- Provenance: track `source_files` and commit SHAs for entries.
- Optional signing: allow signed entries or signed release bundles.
- Audit logs: registry operations write append-only logs in `registry/logs/`.

### Example Entry (Informative)

```json
{
  "schema_version": "1.0",
  "model_id": "openai-gpt-5-general",
  "provider": "openai",
  "display_name": "GPT-5 (General)",
  "role": "general",
  "size_class": "xl",
  "capabilities": ["code", "reasoning", "tools"],
  "status": "active",
  "eval_refs": ["eval-openai-gpt-5-2025-09-07"],
  "source_files": [
    "metrics/models/openai-gpt-5-general.json"
  ],
  "notes": "Primary large model entry for generals group.",
  "created_at": "2025-09-07T00:00:00Z",
  "updated_at": "2025-09-07T00:00:00Z"
}
```

## Implementation Timeline

### Phase 1: Registry Foundation (Week 1-2)
- Define schema v1.0 and validators.
- Implement minimal `registry_service.py` and CLI validate/upsert.
- Import baseline from `metrics/models/*.json` and link evaluations.

### Phase 2: Synchronization & Policy (Week 3-4)
- Implement import/export/reconcile scripts.
- Enforce generals role policy and specs-only rule.
- Generate read-only views for legacy consumers.

### Phase 3: Hardening & Docs (Week 5-6)
- Add audit logs and optional signing.
- Write contributor docs and examples.
- Prepare adapters for future schema versions.

## Benefits

- Single source of truth for model metadata and roles.
- Enforced governance consistency (large-only generals).
- Reduced duplication and drift across JSON/MD files.
- Easier integrations and safer migrations via exporters.

## Risk Assessment

### Risks
- Migration complexity and temporary duplication.
- Tooling disruption if exporters are missing.
- Policy enforcement may cause initial entry rework.

### Mitigations
- Provide exporters and adapters before enforcing hard cuts.
+- Stage rollout with clear deprecation windows.
- Add CI checks to catch violations early.

## Dependencies

- Python 3.8+
- `jsonschema` for validation
- Access to `metrics/models/*.json` and `metrics/model_evaluations.json`

## Integration Points

- `guidelines/MODELS_INDEX.md` remains specs-only and is not auto-modified.
- `metrics/models_index.json` can consume exported views.
- CI integration to run `registry_cli.py validate` on PRs.

---

**End of BIP-035: Unified Model Registry and Governance Classification**


