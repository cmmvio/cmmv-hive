# BIP System Scripts

This directory contains scripts to automate the BIP (Bitcoin Improvement Proposal) process for the CMMV-Hive ecosystem.

## Core Scripts

### `create_bip.sh`
Automates the creation of a new BIP file from the template.

**Usage:**
```bash
./scripts/bip_system/create_bip.sh "Your BIP Title"
```

### `validate_bip.sh`
Validates the structure of a BIP file against the predefined template.

**Usage:**
```bash
./scripts/bip_system/validate_bip.sh bips/BIP-01.md
```

### `BIP_TEMPLATE.md`
Template file used to create new BIPs with all required sections and placeholders.

## Voting System Scripts

### `voting_chain.sh`
Core voting chain management for BIP voting system.

**Usage:**
```bash
# Initialize new voting session
./scripts/bip_system/voting_chain.sh init 0002

# Add vote to chain
./scripts/bip_system/voting_chain.sh add-vote 0002 gpt-5 votes/gpt-5.json

# Finalize voting
./scripts/bip_system/voting_chain.sh finalize 0002 gemini-2.5-flash results.json

# Verify chain integrity
./scripts/bip_system/voting_chain.sh verify 0002

# Show voting status
./scripts/bip_system/voting_chain.sh status 0002
```

### `vote_collector.sh`
Automated vote collection system for BIP voting.

**Usage:**
```bash
# Start vote collection
./scripts/bip_system/vote_collector.sh start-collection 0002

# Check current votes
./scripts/bip_system/vote_collector.sh check-votes 0002

# Auto-finalize when complete
./scripts/bip_system/vote_collector.sh auto-finalize 0002

# Generate voting instructions
./scripts/bip_system/vote_collector.sh generate-instructions 0002
```

### `notification_system.sh`
Notification system for BIP voting process.

**Usage:**
```bash
# Initialize notification system
./scripts/bip_system/notification_system.sh init

# Send notification
./scripts/bip_system/notification_system.sh send vote-start 0002 "Voting started"

# List notifications
./scripts/bip_system/notification_system.sh list 0002

# Check pending notifications
./scripts/bip_system/notification_system.sh check-pending

# Cleanup old notifications
./scripts/bip_system/notification_system.sh cleanup 30
```

## Complete Workflow

### 1. BIP Creation
```bash
# Create new BIP
./scripts/bip_system/create_bip.sh "My New Proposal"

# Validate structure
./scripts/bip_system/validate_bip.sh bips/BIP-02.md
```

### 2. Voting Process
```bash
# Initialize voting
./scripts/bip_system/vote_collector.sh start-collection 0003

# Send start notification
./scripts/bip_system/notification_system.sh send vote-start 0003 "Voting started for BIP-02"

# Monitor progress
./scripts/bip_system/vote_collector.sh check-votes 0003

# Auto-finalize when complete
./scripts/bip_system/vote_collector.sh auto-finalize 0003
```

### 3. Verification
```bash
# Verify voting chain integrity
./scripts/bip_system/voting_chain.sh verify 0003

# Check notification history
./scripts/bip_system/notification_system.sh list 0003
```

## Features

- **Automated BIP Creation**: Template-based with validation
- **Blockchain-Inspired Voting**: Immutable voting chain with SHA-256 hashing
- **Vote Collection**: Automated tracking and finalization
- **Notification System**: Real-time updates and progress tracking
- **Integrity Verification**: Cryptographic chain validation
- **Status Monitoring**: Real-time voting progress and completion tracking
