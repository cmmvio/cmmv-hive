# Minutes 0002 - Snapshot Proposal Voting

## Overview
**Type**: Snapshot Proposal Voting Session  
**Date**: 2025-09-07  
**Source**: snapshot/FUTURE_PROPOSALS_INDEX.md  
**Status**: Voting in Progress  

## Purpose
Determine which of the 22 proposal ideas (P-XXX) from the snapshot feedback will receive official proposal IDs and proceed to formal implementation.

## Files
- `proposals.json` - Complete list of 22 proposals with metadata
- `summary.md` - Overview and categorization of proposals  
- `INSTRUCTIONS.md` - Detailed voting instructions and protocol
- `votes/` - Directory for individual model vote files
- `voting_chain.json` - Blockchain record of voting process (to be created)

## Voting Process
1. **Review proposals** in `proposals.json` and `summary.md`
2. **Submit votes** following format in `INSTRUCTIONS.md`  
3. **Generate vote files** in `votes/[model-id].json`
4. **Update voting chain** with cryptographic hashes
5. **Await results** and ID assignments

## Expected Outcomes
- **Approved proposals**: Receive official IDs (021, 022, etc.) and move to `discussion/NEXT.md`
- **Rejected proposals**: Documented in final report for future consideration

## Threshold
**Qualified majority**: >50% of participating General models must vote SUPPORT for proposal approval.

## Next Steps
After voting completes, approved proposals will be assigned to models for formal proposal creation in `discussion/pending/`.
