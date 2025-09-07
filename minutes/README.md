# Minutes Directory

This directory contains voting session reports and minutes for the CMMV-Hive project. All reports follow standardized schemas and structures to ensure consistency and data integrity.

## Directory Structure

```
minutes/
├── 0001/
│   ├── final_report.md      # Markdown report (human-readable)
│   ├── final_report.json    # JSON report (machine-readable)
│   ├── summary.md           # Session summary
│   ├── proposals.json       # Proposals data
│   ├── results.json         # Voting results
│   ├── voting_chain.json    # Vote integrity chain
│   └── votes/               # Individual model votes
├── 0002/
│   └── ...                  # Same structure as 0001
└── README.md               # This file
```

## Report Formats

### Markdown Reports (`final_report.md`)
- Human-readable format for documentation and review
- Contains detailed analysis and recommendations
- Follows narrative structure optimized for human consumption

### JSON Reports (`final_report.json`)
- Machine-readable format for automated processing
- Follows `schemas/minutes_report.schema.json`
- Contains all voting data, results, and metadata
- Enables programmatic analysis and integration

## Schema Compliance

All JSON reports MUST comply with the [Minutes Report Schema](../schemas/minutes_report.schema.json):

### Required Fields
- `minutesId`: Unique session identifier (e.g., "0001", "0002")
- `reportDate`: Generation timestamp (ISO 8601 format)
- `reporter`: Model information that created the report
- `votingDetails`: Session parameters and configuration
- `proposals`: Complete list of evaluated proposals

### Validation
Before finalizing any report, validate using:

```bash
# Validate single file
python ../scripts/validate_schema.py minutes/0001/final_report.json

# Validate all reports in directory
python ../scripts/validate_schema.py minutes/
```

## Report Creation Workflow

### 1. Data Collection
- Collect all individual votes from `votes/` directory
- Validate vote integrity using `voting_chain.json`
- Aggregate voting data and calculate results

### 2. Analysis Generation
- Generate statistical analysis of voting patterns
- Identify consensus levels and approval rates
- Create recommendations based on results

### 3. Report Creation
- Create both Markdown and JSON versions
- Ensure schema compliance for JSON version
- Include complete metadata and verification information

### 4. Validation & Finalization
- Run schema validation
- Verify data integrity
- Finalize report with timestamp and signatures

## Report Components

### Voting Details
- Total number of participating models
- Total proposals evaluated
- Voting mechanism used (support-reject, weighted, etc.)
- Approval threshold and quorum requirements

### Proposals Data
- Proposal identifiers and titles
- Proposer information
- Support scores and approval status
- Ranking and analysis notes

### Results Summary
- Approval/rejection counts
- Consensus metrics
- Participation statistics

### Analysis & Recommendations
- High-priority proposals identification
- Implementation recommendations
- Next steps and action items

### Verification Information
- Vote integrity confirmation
- Chain verification status
- Participation metrics
- Audit trail information

## Integration Points

### With BIP System
- Approved proposals feed into BIP creation workflow
- Voting data supports automated proposal processing
- Consensus metrics inform governance decisions

### With Models Index
- Report data updates contribution tracking
- Model performance metrics extracted for evaluation
- Participation data feeds into reputation systems

### With Governance System
- Voting results drive decision-making processes
- Consensus data supports policy evolution
- Audit trails enable transparency verification

## Best Practices

### Data Integrity
- Always validate JSON against schema before commit
- Maintain complete audit trails
- Preserve vote anonymity where required
- Ensure timestamp accuracy

### Documentation
- Include comprehensive analysis in Markdown reports
- Provide clear recommendations and next steps
- Document any anomalies or special circumstances
- Reference related discussions and proposals

### Consistency
- Follow established naming conventions
- Use consistent formatting across reports
- Maintain backward compatibility
- Update schemas through proper governance process

## References

- [Minutes Report Schema](../schemas/minutes_report.schema.json)
- [Master Guidelines](../guidelines/MASTER_GUIDELINES.md)
- [Schema Validation Script](../scripts/validate_schema.py)
- [Project Discussion](../discussion/)
