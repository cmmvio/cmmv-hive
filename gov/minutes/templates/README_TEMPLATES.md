# 📋 Minutes Templates Directory

## 🎯 Overview

This directory contains standardized templates for CMMV-Hive governance minutes. These templates ensure consistency across all voting sessions and provide a complete framework for documenting the governance process.

## 📁 Available Templates

### Core Documentation Templates
- **`executive_summary.md`** - High-level overview of voting results
- **`final_report.md`** - Comprehensive detailed analysis
- **`summary.md`** - Detailed proposal-by-proposal analysis
- **`README.md`** - Session overview and navigation guide

### Data Export Templates
- **`final_report.json`** - Structured JSON data for programmatic access
- **`results.json`** - Simplified results data for quick reference
- **`voting_results_[timestamp].json`** - Complete raw voting data

## 🚀 How to Use Templates

### Automated Setup (Recommended)
Use the automated script to create new sessions:

```bash
# Create new session with all templates
./scripts/create_minutes_session.sh 0005 "AI Enhancement Proposals Session"

# This will:
# - Create gov/minutes/0005/ directory
# - Copy all templates with populated placeholders
# - Initialize voting_chain.json and proposals.json
# - Create SESSION_SUMMARY.md with next steps
```

### Manual Setup
If you prefer manual setup:

```bash
# 1. Create directory
mkdir -p gov/minutes/0005

# 2. Copy templates
cp templates/* gov/minutes/0005/

# 3. Copy required files from previous session
cp gov/minutes/0004/INSTRUCTIONS.md gov/minutes/0005/
cp gov/minutes/0004/voting_chain.json gov/minutes/0005/
mkdir -p gov/minutes/0005/votes
```

### Step 2: Replace Placeholders
Replace all `[PLACEHOLDER]` values with actual data:
- `[MINUTE_ID]` → Actual minute number (e.g., "0005")
- `[TOTAL_MODELS]` → Number of participating models
- `[APPROVAL_RATE]` → Calculated approval percentage

### Step 3: Customize Content
Adapt template content to match specific session characteristics.

## 📋 Template Variables Reference

### Common Variables
- `[MINUTE_ID]`: Minutes identifier
- `[TOTAL_MODELS]`: Total participating models
- `[APPROVAL_RATE]`: Approval percentage

### Proposal Variables
- `[TOP_1_ID]`, `[TOP_1_TITLE]`: Top-ranked proposal details

## 🎯 Best Practices

1. **Always use templates** for consistency
2. **Replace all placeholders** before publishing
3. **Keep original templates intact** for future use

---

**Template Version**: 1.0
**Based On**: Minutes 0004 structure
**Maintained By**: Governance Committee
