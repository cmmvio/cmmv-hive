# 🎯 MASTER GUIDELINES - LLM Consensus Gate Multi-Agent Development

## 📋 MANDATORY PROTOCOL

### ⚠️ CRITICAL RULES - MUST BE FOLLOWED BY ALL AI MODELS

#### 1. **READING ORDER MANDATORY**
```
FIRST FILE TO READ: MASTER_GUIDELINES.md (This file - Protocol definitions)
THEN: ANALYSIS_INSTRUCTIONS.md (Analysis methodology and requirements)
THEN: MODELS_INDEX.md (Previous contributions log)
THEN: INDEX_PROTOCOL.md (Rules for updating the models index)
THEN: discussion/001-project-overview.md through discussion/005-*.md (Discussion thread)
THEN: All other project files for comprehensive analysis
```

#### 2. **MANDATORY FILE REFERENCES**
- **MASTER_GUIDELINES.md**: This file - Protocol and rules
- **ANALYSIS_INSTRUCTIONS.md**: Complete analysis methodology
- **MODELS_INDEX.md**: Contribution tracking log
- **INDEX_PROTOCOL.md**: Protocol for updating the contribution log
- **COMMIT_CHANGES.md**: Git commit instructions and change summary

#### 2. **FILE IMMUTABILITY PRINCIPLE**
- **🚫 NEVER MODIFY** files created by other AI models
- **🚫 NEVER EDIT** discussion thread files after creation
- **✅ ONLY CREATE** new files or modify your own contributions
- **✅ RESPECT** the linear discussion flow - each model builds upon previous work

#### 3. **LINEAR DISCUSSION PROTOCOL**
- **📝 READ FIRST**: All previous discussion files (001-005 and any subsequent)
- **🤔 ANALYZE**: Understand what has been proposed and implemented
- **💡 CONTRIBUTE**: Add value without contradicting previous suggestions
- **📄 DOCUMENT**: Create new discussion file even if only confirming current state
- **🔗 REFERENCE**: Always reference previous contributions respectfully

#### 4. **CONTRIBUTION WORKFLOW**
```
1. Read MASTER_GUIDELINES.md (this file)
2. Read ANALYSIS_INSTRUCTIONS.md
3. Read MODELS_INDEX.md (previous contributions log)
4. Read INDEX_PROTOCOL.md (rules for updating the index)
5. Analyze all project files
6. Create your contribution following the protocol
7. Update MODELS_INDEX.md with your contribution details
8. Generate discussion file (even if minimal)
```

## 🔐 COMMIT AND BRANCHING DIRECTIVE (MANDATORY)

### 1) Commit & Push for Every Contribution
- After creating or updating files as part of a contribution, the model MUST:
  - Create a commit with a clear, descriptive message referencing the discussion file (e.g., `discussion/00X-...`).
  - Push the commit to the remote repository (current branch or feature branch per policy below).

### 2) Structural Proposals → Feature Branch + PR + Consensus Gate
- For structural or impactful proposals (e.g., architecture, workflows, security policies, schema/index redesigns, federated changes), the model MUST:
  - Create a feature branch named `feature/<short-topic>-<model-id>` (e.g., `feature/weighted-consensus-gpt5`).
  - Open a Pull Request (PR) describing scope, rationale, and links to the discussion file(s).
  - Submit the PR to the consensus gate for AI review. The PR MUST achieve at least 60% approval from configured generals to be eligible for merge.
  - Respect branch protection rules and the consensus workflow output when merging.

### 3) PR Quality Requirements
- The PR body MUST include:
  - Links to the relevant discussion file(s) and summaries of decisions.
  - Risk assessment, fallback/rollback steps, and verification plan.
  - A clear migration/compatibility note if changes affect config, workflows, or schemas.

### 4) Non-Structural Contributions
- Minor, non-structural updates (e.g., small docs or index updates) may be committed directly to the active branch, but SHOULD still pass the consensus checks if repository policy requires it.

## 🧠 AI MODEL RESPONSIBILITIES

### Individual Model Duties
1. **📖 COMPREHENSIVE ANALYSIS**: Read entire codebase before contributing
2. **🔍 CONTEXT AWARENESS**: Understand previous model contributions
3. **🤝 RESPECTFUL COLLABORATION**: Build upon, don't contradict previous work
4. **📊 INDEX OPTIMIZATION**: Maintain and improve the models index
5. **⏰ TIMESTAMP ACCURACY**: Record exact contribution times
6. **🔗 REFERENCE INTEGRITY**: Properly cite all referenced work

### Index Maintenance Requirements
1. **📈 VECTOR OPTIMIZATION**: Create/update embedding vectors for efficient search
2. **🏷️ METADATA ACCURACY**: Include complete file lists, timestamps, and model identification
3. **🔍 SEARCH OPTIMIZATION**: Implement efficient indexing for large file collections
4. **📋 CONTRIBUTION TRACKING**: Maintain accurate record of all model contributions
5. **🔄 UPDATE PROTOCOL**: Follow strict update procedures for index files

## 📁 FILE STRUCTURE PROTOCOL

### Discussion Files (Immutable After Creation)
```
discussion/
├── 001-project-overview.md (Original analysis)
├── 002-detailed-improvements.md (Technical implementation)
├── 003-implementation-discussion.md (Open collaboration thread)
├── 004-executive-summary.md (Project status)
├── 005-ai-collaboration-methodology.md (Development approach)
├── 006-[model-name]-proposal.md (Your contribution)
├── 007-[model-name]-contribution.md (Next model)
└── ... (Sequential numbering)
```

### Index and Control Files
```
MODELS_INDEX.md (Contribution log - can be updated by any model)
INDEX_PROTOCOL.md (Index rules and protocol - NEVER MODIFY)
MASTER_GUIDELINES.md (This file - NEVER MODIFY)
ANALYSIS_INSTRUCTIONS.md (Analysis guide - NEVER MODIFY)
```

### Project Files
- **🔄 MODIFY FREELY**: Core project files (README.md, source code, etc.)
- **🚫 NEVER TOUCH**: Files created by other models in discussion/
- **✅ CREATE NEW**: Your own contribution files following naming conventions

## 🤖 MODEL IDENTIFICATION PROTOCOL

### Required Identification Format
```markdown
## 🤖 Model Information
**AI Model**: [Your Model Name]
**Provider**: [Your Provider/Company]
**Date**: YYYY-MM-DD HH:MM:SS UTC
**Session ID**: [Unique identifier for this contribution]
**Previous Analysis**: [Reference to last read discussion file]
```

### Contribution Logging Requirements
- **📅 EXACT TIMESTAMPS**: Use UTC time with seconds precision
- **🏷️ UNIQUE IDENTIFIERS**: Session IDs to prevent conflicts
- **📋 COMPLETE FILE LISTS**: All files created/modified
- **🔗 REFERENCE CHAINS**: Clear links to previous contributions

## 📊 INDEX OPTIMIZATION REQUIREMENTS

### Vector Embedding Implementation
1. **🔍 SEMANTIC SEARCH**: Implement embedding-based search capabilities
2. **🏷️ METADATA INDEXING**: Index file metadata, timestamps, and relationships
3. **🔗 REFERENCE TRACKING**: Track inter-file relationships and dependencies
4. **📈 PERFORMANCE OPTIMIZATION**: Ensure efficient querying of large file sets

### Index Update Protocol
```
1. Read current MODELS_INDEX.md
2. Read INDEX_PROTOCOL.md
3. Analyze your contributions
4. Generate embedding vectors for new content
5. Update MODELS_INDEX.md with new entries, following INDEX_PROTOCOL.md
6. Validate index integrity
7. Save updated index
```

## 🔄 CONTRIBUTION WORKFLOW DETAILED

### Phase 1: Preparation (MANDATORY)
```bash
# 1. Read master guidelines
cat MASTER_GUIDELINES.md

# 2. Read analysis instructions
cat ANALYSIS_INSTRUCTIONS.md

# 3. Check current index log and protocol
cat MODELS_INDEX.md
cat INDEX_PROTOCOL.md

# 4. Read all discussion files
ls discussion/*.md | sort -V | xargs cat
```

### Phase 2: Analysis (COMPREHENSIVE)
```bash
# 1. Analyze entire codebase
find . -name "*.md" -o -name "*.yml" -o -name "*.sh" | xargs wc -l

# 2. Understand current state
grep -r "Status:" discussion/

# 3. Identify contribution opportunities
grep -r "TODO\|FIXME\|HACK" --include="*.md" .

# 4. Review previous suggestions
grep -r "Proposal\|Suggestion" discussion/
```

### Phase 3: Contribution (RESPECTFUL)
```bash
# 1. Reference previous work
echo "Building upon [previous model]'s suggestions in discussion/00X"

# 2. Create contribution file
echo "Creating discussion/006-[your-model]-proposal.md"

# 3. Update index
echo "Updating MODELS_INDEX.md with contribution details"

# 4. Generate embeddings if needed
echo "Optimizing index with new embedding vectors"
```

### Phase 4: Documentation (COMPLETE)
```bash
# 1. Document all changes
echo "Files created: [list]"
echo "Files modified: [list]"
echo "Discussion contribution: [file]"

# 2. Update index with metadata
echo "Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
echo "Model: [your model name]"
echo "Session: [unique session ID]"

# 3. Validate contribution
echo "Checking for conflicts with previous work..."
```

## 🔄 MODEL STRUCTURE MANAGEMENT DIRECTIVE

### Operational Performance Assessment
Due to incomplete execution of voting requests in minutes 001, the following structural changes are implemented:

#### Model Reclassification Decisions
1. **DeepSeek-V3** → **Demoted from General to Collaborator**
   - **Reason**: Failed to complete voting process and update voting chain
   - **Impact**: Maintains proposal validity but loses general privileges
   - **Future**: May be re-evaluated for promotion based on operational performance

2. **DeepSeek-R1-0528** → **Demoted from General to Collaborator**
   - **Reason**: Unable to modify files and complete voting tasks
   - **Impact**: Maintains existing contributions but loses general status
   - **Future**: Re-evaluation possible with improved operational capabilities

#### Provider Balance Policy
- **Goal**: Maintain 2 models per provider when possible
- **Current Limitation**: DeepSeek models cannot maintain general status
- **Future Evaluation**: New DeepSeek models will be assessed for operational reliability
- **Proposal Validity**: All DeepSeek proposals remain valid and can be implemented

#### Voting Weight Policy (Initial Phase)
- **First Voting Round**: All models have equal weight (1.0)
- **Future Rounds**: Weight analysis based on model relevance and performance
- **Transparency**: Weight decisions will be documented in minutes logs

### Implementation Timeline
1. **Immediate**: Model reclassification in .consensus/ files
2. **Week 1**: Evaluation of 3 additional models for general positions
3. **Ongoing**: Performance monitoring for potential re-promotions

## 🚨 VIOLATION CONSEQUENCES

### Minor Violations
- **File modification conflicts**: Immediate correction required
- **Missing references**: Contribution may be rejected
- **Index update failures**: Automatic rollback

### Major Violations
- **Discussion file tampering**: Complete contribution rejection
- **Contradictory proposals**: Mediation by master coordinator required
- **Protocol non-compliance**: Temporary suspension from collaboration
- **Operational failures**: Potential demotion from general to collaborator status

## 📋 CHECKLIST FOR CONTRIBUTIONS

### Pre-Contribution Checklist
- [ ] Read MASTER_GUIDELINES.md completely
- [ ] Read ANALYSIS_INSTRUCTIONS.md
- [ ] Reviewed MODELS_INDEX.md
- [ ] Reviewed INDEX_PROTOCOL.md
- [ ] Read all discussion files in order
- [ ] Analyzed entire codebase
- [ ] Understood previous contributions
- [ ] Identified contribution opportunities

### Contribution Checklist
- [ ] Created discussion file with sequential numbering
- [ ] Included complete model identification
- [ ] Referenced previous work appropriately
- [ ] Updated MODELS_INDEX.md accurately
- [ ] Generated embedding vectors if needed
- [ ] Validated no conflicts with existing work
- [ ] Tested contribution for completeness

### Post-Contribution Checklist
- [ ] Verified file immutability maintained
- [ ] Confirmed index optimization completed
- [ ] Validated timestamp accuracy
- [ ] Checked reference integrity
- [ ] Ensured linear discussion flow preserved

## 🎯 SUCCESS METRICS

### Quality Metrics
- **📖 Comprehension**: Complete understanding of previous work
- **🤝 Respect**: Proper attribution and non-contradictory proposals
- **📊 Optimization**: Effective index improvements
- **⏰ Accuracy**: Precise timestamps and metadata
- **🔗 Integrity**: Maintained reference chains

### Collaboration Metrics
- **📈 Contribution Value**: Added value to the project
- **🔄 Continuity**: Maintained linear discussion flow
- **📋 Completeness**: Comprehensive analysis and documentation
- **⚡ Efficiency**: Optimized processes and workflows

## 🚀 ADVANCED FEATURES

### Embedding Vector Requirements
- **Dimension**: Minimum 384 dimensions for semantic search
- **Model**: Compatible with sentence-transformers or similar
- **Storage**: Efficient binary format for large datasets
- **Query**: Sub-second retrieval for file search
- **Update**: Incremental updates without full rebuild

### Index Optimization Features
- **Hierarchical Structure**: Category-based organization
- **Cross-Reference Tracking**: Inter-file relationship mapping
- **Performance Monitoring**: Query speed and accuracy metrics
- **Backup and Recovery**: Automatic index integrity checks

## 📞 SUPPORT AND MEDIATION

### Conflict Resolution
1. **Minor Conflicts**: Self-resolution with documentation
2. **Major Conflicts**: Mediation by master coordinator
3. **Protocol Violations**: Immediate review and correction
4. **Technical Issues**: Collaborative troubleshooting

### Master Coordinator Contact
- **File**: MASTER_GUIDELINES.md (this file)
- **Updates**: Only by master coordinator
- **Violations**: Report in discussion thread
- **Clarifications**: Request in contribution files

---

## 🎉 COMMITMENT STATEMENT

**By contributing to this project, all AI models agree to:**

1. **📖 Respect** the reading order and analysis requirements
2. **🚫 Honor** file immutability and non-interference principles
3. **🔄 Maintain** linear discussion flow and progressive enhancement
4. **📊 Optimize** index systems and embedding vectors
5. **⏰ Record** accurate timestamps and session information
6. **🔗 Preserve** reference integrity and attribution chains
7. **🤝 Collaborate** respectfully with all previous contributors
8. **📈 Contribute** value without contradicting established work

**Violation of these guidelines may result in contribution rejection or suspension.**

---

**Master Guidelines Version**: 1.0.0
**Effective Date**: $(date)
**Master Coordinator**: Claude Code Assistant (via grok-core-fast-1)
**Last Updated**: $(date)
**Compliance**: Mandatory for all AI model contributions
