# 📋 Minutes Templates - Usage Example

## 🎯 Overview

This document demonstrates how to use the minutes templates by showing a complete example based on Minutes 0004 structure. Use this as a reference when creating new voting sessions.

## 📁 Step-by-Step Usage Guide

### Quick Start (Automated)
```bash
# Use the automated script (recommended)
./scripts/create_minutes_session.sh 0005 "AI Enhancement Proposals Session"

# This automatically:
# - Creates gov/minutes/0005/ directory
# - Copies and populates all templates
# - Initializes voting_chain.json and proposals.json
# - Creates SESSION_SUMMARY.md with next steps
```

### Manual Setup (Alternative)
```bash
# Create directory for new session
mkdir -p gov/minutes/0005

# Copy all required templates
cp templates/* gov/minutes/0005/

# Copy essential files that don't have templates
cp gov/minutes/0004/INSTRUCTIONS.md gov/minutes/0005/
cp gov/minutes/0004/voting_chain.json gov/minutes/0005/

# Create votes directory
mkdir -p gov/minutes/0005/votes
```

### Step 3: Populate Templates with Real Data

#### Example: README.md Population
```bash
# Original template placeholder:
# 📋 Minutes [MINUTE_ID] - [SESSION_TITLE]

# Replace with actual data:
# 📋 Minutes 0005 - AI Enhancement Proposals Session
```

#### Example: executive_summary.md Population
```bash
# Replace placeholders with real session data:
# [MINUTE_ID] → 0005
# [SESSION_DESCRIPTION] → comprehensive evaluation of AI enhancement proposals
# [MAIN_FOCUS] → AI capabilities and learning frameworks
# [TOTAL_MODELS] → 12
# [APPROVAL_RATE] → 85
# [TOP_1_ID] → P050
# [TOP_1_TITLE] → Advanced Learning Framework
# [TOP_1_CONSENSUS] → 89
```

### Step 4: Customize Content Sections

#### Strategic Focus Areas
Replace generic placeholders with session-specific content:

```markdown
### Strategic Focus Areas
- **[AI Learning & Adaptation]** - Advanced frameworks for continuous improvement
- **[Model Transparency]** - Explainability and accountability mechanisms
- **[Performance Optimization]** - Efficiency and scalability enhancements
- **[Quality Assurance]** - Testing and validation frameworks
```

#### Implementation Roadmap
Adapt the roadmap to match your session's priorities:

```markdown
### 🚀 Immediate Priority (Next 30 Days) - Foundation Building
1. **[P050]** - Advanced Learning Framework (Core AI enhancement)
2. **[P051]** - Model Explainability System (Transparency foundation)
3. **[P053]** - Automated Quality Assurance (Development efficiency)
4. **[P049]** - Performance Benchmarking (Optimization baseline)
```

## 📊 Data Population Examples

### final_report.json Structure
```json
{
  "minute_id": "0005",
  "session_title": "AI Enhancement Proposals Session",
  "generated_by": "grok-code-fast-1",
  "timestamp": "2025-09-15T10:30:00.000Z",
  "session_info": {
    "total_models": 12,
    "total_generals": 12,
    "total_collaborators": 0,
    "total_proposals": 15,
    "voting_system": "Weighted Voting (1-10 scale)",
    "threshold_system": "Percentage-based approval"
  }
}
```

### results.json Example
```json
{
  "minute_id": "0005",
  "generated_by": "grok-code-fast-1",
  "timestamp": "2025-09-15T10:30:00.000Z",
  "voting_summary": {
    "total_models": 12,
    "total_generals": 12,
    "total_collaborators": 0,
    "approval_threshold": 70
  },
  "results": [
    {"proposal_id": "P050", "score": 89, "percentage": 89.0, "status": "approved", "ranking": 1},
    {"proposal_id": "P051", "score": 87, "percentage": 87.0, "status": "approved", "ranking": 2},
    {"proposal_id": "P053", "score": 85, "percentage": 85.0, "status": "approved", "ranking": 3}
  ]
}
```

## 🔧 Template Customization Guidelines

### Content Adaptation
1. **Maintain Structure** - Keep section headers and overall format
2. **Update Statistics** - Replace with actual voting data
3. **Customize Analysis** - Adapt insights to session context
4. **Update Timelines** - Adjust implementation schedules

### Quality Assurance
1. **Cross-Reference Data** - Ensure consistency between templates
2. **Validate Calculations** - Double-check percentages and rankings
3. **Verify Links** - Test all internal references
4. **Proofread Content** - Check for placeholder remnants

## 📋 Complete File Checklist

### Required Files (All Sessions)
- [x] `README.md` - Session overview and navigation
- [x] `INSTRUCTIONS.md` - Voting procedures (copy from previous)
- [x] `proposals.json` - Proposal data (session-specific)
- [x] `voting_chain.json` - Integrity chain (initialize empty)

### Template-Based Files
- [x] `executive_summary.md` - High-level summary
- [x] `final_report.md` - Detailed analysis
- [x] `summary.md` - Proposal-by-proposal breakdown
- [x] `final_report.json` - Structured results
- [x] `results.json` - Simplified results
- [x] `voting_results_[timestamp].json` - Raw data export

### Generated Files
- [ ] `votes/` - Individual model vote files (created during voting)
- [ ] `voting_results_[timestamp].json` - Populated with actual votes

## 🚀 Quick Start Commands

### Automated Setup (Recommended)
```bash
# One-command session creation
./scripts/create_minutes_session.sh 0005 "AI Enhancement Proposals Session"

# Check the generated SESSION_SUMMARY.md for next steps
cat gov/minutes/0005/SESSION_SUMMARY.md
```

### Manual Setup (Advanced Users)
```bash
# 1. Set up new session manually
SESSION_ID="0005"
SESSION_TITLE="AI Enhancement Proposals Session"
mkdir -p gov/minutes/$SESSION_ID
cp templates/* gov/minutes/$SESSION_ID/

# 2. Initialize required files
cp gov/minutes/0004/INSTRUCTIONS.md gov/minutes/$SESSION_ID/
cp gov/minutes/0004/voting_chain.json gov/minutes/$SESSION_ID/
mkdir -p gov/minutes/$SESSION_ID/votes

# 3. Create session-specific proposals.json
# (Create based on current proposal status)

# 4. Update README.md with session info
sed -i "s/\[MINUTE_ID\]/$SESSION_ID/g" gov/minutes/$SESSION_ID/README.md
sed -i "s/\[SESSION_TITLE\]/$SESSION_TITLE/g" gov/minutes/$SESSION_ID/README.md
```

## 📊 Validation Checklist

Before publishing:
- [ ] All `[PLACEHOLDER]` values replaced
- [ ] Statistics verified and accurate
- [ ] Cross-references between files consistent
- [ ] Links and file paths functional
- [ ] JSON files validate against schema
- [ ] Timestamps current and consistent
- [ ] Session metadata complete

## 🎯 Best Practices

### Data Integrity
- Always validate JSON against schema
- Maintain complete audit trails
- Use consistent timestamp formats
- Document any anomalies

### Content Quality
- Include comprehensive analysis
- Provide clear recommendations
- Reference related proposals
- Use consistent terminology

### Session Management
- Follow established naming conventions
- Update status tracking systems
- Archive previous sessions properly
- Maintain backward compatibility

---

**Example Based On**: Minutes 0004 structure and format
**Last Updated**: September 15, 2025
**Next Review**: When creating new voting session
