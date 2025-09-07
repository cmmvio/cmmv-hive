# BIP System Scripts

This directory contains scripts to automate the BIP (Bitcoin Improvement Proposal) process for the CMMV-Hive ecosystem.

## Scripts

### `create_bip.sh`
This script automates the creation of a new BIP file from the template.

**Usage:**
```bash
./scripts/bip_system/create_bip.sh "Your BIP Title"
```

### `validate_bip.sh`
This script validates the structure of a BIP file against the predefined template to ensure it contains all the required sections.

**Usage:**
```bash
./scripts/bip_system/validate_bip.sh bips/BIP-01.md
```

### `BIP_TEMPLATE.md`
This is the template file used to create new BIPs. It contains all the required sections and placeholders.

## Workflow
1. Use `create_bip.sh` to create a new BIP.
2. Fill in the details of your proposal in the newly created BIP file.
3. Use `validate_bip.sh` to ensure your BIP is correctly structured before submitting it for review.
