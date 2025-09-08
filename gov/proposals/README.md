# 📋 Proposals Directory Structure

## Overview
This directory organizes all proposals in the CMMV-Hive project according to their current status and relationship to BIPs (Bitcoin Improvement Proposals).

## 📁 Directory Structure

```
proposals/
├── README.md              # This file
├── pending/               # Proposals awaiting review
├── approved/              # Approved proposals (not yet BIPs)
├── rejected/              # Rejected proposals
├── in-implementation/     # Proposals that became BIPs and are being implemented
├── implemented/           # Proposals that became BIPs and are fully implemented
├── STATUS.md              # Current status summary
└── TEMPLATE.md            # Proposal template
```

## 🔄 Proposal Lifecycle

### Flow from Proposal to Implementation

```
Proposal Creation → Review → Decision
     ↓              ↓         ↓
   pending/    → approved/ → BIP Creation
                    ↓             ↓
                rejected/    in-implementation/
                                 ↓
                            implemented/
```

### Status Categories

#### 📝 **pending/**
- New proposals awaiting review
- Under evaluation by the governance process

#### ✅ **approved/** 
- Proposals approved by voting but not yet converted to BIPs
- Waiting for implementation assignment

#### ❌ **rejected/**
- Proposals that did not pass the voting threshold
- Archived for reference

#### 🔄 **in-implementation/**
- Proposals that became BIPs and are currently being implemented
- **File Format**: `BIP-{ID}-{PROPOSAL_ID}-{TITLE}.md`
- Example: `BIP-00-001-cursor-ide-extension.md`

#### 🟢 **implemented/**
- Proposals that became BIPs and are fully implemented
- **File Format**: `BIP-{ID}-{PROPOSAL_ID}-{TITLE}.md`
- Example: `BIP-01-012-bip-automated-voting-system-proposal.md`

## 📋 Current BIP Mapping

### Implemented BIPs
- **BIP-01**: From Proposal 012 - `BIP-01-012-bip-automated-voting-system-proposal.md`
- **BIP-02**: From Proposal 037 - `BIP-02-037-typescript-standardization-proposal.md`

### In Implementation
- **BIP-00**: Cursor IDE Extension (pending implementation)

## 🔧 File Naming Convention

When a proposal becomes a BIP and moves to implementation directories:

**Format**: `BIP-{BIP_ID}-{PROPOSAL_ID}-{TITLE}.md`

**Components**:
- `BIP_ID`: The BIP number (00, 01, 02, etc.)
- `PROPOSAL_ID`: Original proposal ID (001, 012, 037, etc.)
- `TITLE`: Descriptive title in kebab-case

**Examples**:
- `BIP-01-012-bip-automated-voting-system-proposal.md`
- `BIP-02-037-typescript-standardization-proposal.md`
- `BIP-00-001-cursor-ide-extension.md`

## 🎯 Governance Integration

### BIP Creation Process
1. Proposal approved in voting
2. Proposal moved to `in-implementation/` with BIP format
3. BIP development begins following BIP-01 process
4. Upon completion, moved to `implemented/`

### Status Tracking
- All movements tracked in `STATUS.md`
- Integration with BIP system for progress monitoring
- Cross-references maintained between proposals and BIPs

## 📊 Statistics

### Current Distribution
- **Pending**: 2 proposals
- **Approved**: 29 proposals (awaiting BIP conversion)
- **Rejected**: 6 proposals
- **In Implementation**: 1 BIP (BIP-00)
- **Implemented**: 2 BIPs (BIP-01, BIP-02)

### Success Rate
- **Approval Rate**: 82% (29/35 total reviewed)
- **Implementation Rate**: 3/32 approved proposals became BIPs
- **Completion Rate**: 2/3 BIPs fully implemented

## 🔍 Search and Reference

### Finding Proposals
- Use `git log` to track proposal history
- Cross-reference with BIP directories
- Check `STATUS.md` for current states

### Documentation Standards
- All files must be in English [[memory:8373468]]
- Follow project naming conventions
- Maintain audit trail through file movements

---

*This structure ensures clear tracking from proposal creation through BIP implementation and completion.*
