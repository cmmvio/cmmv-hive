# 🤖 LLM Consensus Configuration

This directory contains the configuration files for the LLM Consensus Gate system.

## 📁 Directory Structure

```
.consensus/
├── config.json          # Main configuration file
├── generals.txt         # List of LLM bot accounts
├── README.md           # This documentation
└── [future files]
```

## 🔧 Configuration Files

### `config.json`
The main configuration file that controls all aspects of the consensus system. It uses JSON format with the following structure:

#### Key Configuration Sections

**Consensus Settings**
```json
{
  "consensus": {
    "enabled": true,
    "thresholds": {
      "default": 0.6,    // 60% approval for normal PRs
      "core": 0.8,      // 80% approval for core changes
      "hotfix": 0.0     // 0% for hotfixes (always pass)
    },
    "requiredGenerals": 3  // Minimum generals needed
  }
}
```

**Voting Configuration**
```json
{
  "voting": {
    "requiredFields": ["VOTE", "REASON"],
    "optionalFields": ["CONFIDENCE", "PRIORITY", "SUGGESTIONS"],
    "allowMultipleVotes": false,  // Latest vote only
    "voteTimeoutHours": 168      // 7 days
  }
}
```

**Label Configuration**
```json
{
  "consensus": {
    "labels": {
      "core": "core",              // Elevates threshold to 80%
      "hotfix": "hotfix",          // Bypasses consensus
      "skipConsensus": "skip-consensus"  // Skips validation
    }
  }
}
```

### `generals.txt`
Contains the list of bot accounts that participate in consensus voting. Each line represents one general (bot account).

#### Format
```
# Comments start with #
#username-per-line
gen-deepseek
gen-claude-3
gen-gpt4-turbo
```

#### Organization
Generals are organized by capability and specialization for better consensus quality.

## 🎯 Usage Examples

### Basic Setup
```json
{
  "consensus": {
    "enabled": true,
    "thresholds": {
      "default": 0.6,
      "core": 0.8
    }
  }
}
```

### Advanced Configuration
```json
{
  "consensus": {
    "enabled": true,
    "thresholds": {
      "default": 0.7,
      "core": 0.9
    }
  },
  "voting": {
    "allowMultipleVotes": false,
    "voteTimeoutHours": 72
  },
  "notifications": {
    "onLowParticipation": {
      "enabled": true,
      "threshold": 0.6
    }
  }
}
```

## ⚙️ Configuration Options

### Consensus Thresholds
- **default**: Standard approval threshold (0.0-1.0)
- **core**: Threshold for critical changes (0.0-1.0)
- **hotfix**: Threshold for emergency fixes (usually 0.0)

### Voting Rules
- **requiredFields**: Mandatory fields in vote comments
- **optionalFields**: Optional fields for enhanced voting
- **allowMultipleVotes**: Whether generals can vote multiple times
- **voteTimeoutHours**: Hours before vote collection stops

### Special Labels
- **core**: Elevates threshold to core level
- **hotfix**: Bypasses consensus entirely
- **skipConsensus**: Skips consensus validation

### Notifications
Configure when and how the system sends notifications:
- **onConsensusFailure**: When consensus is not reached
- **onConsensusSuccess**: When consensus passes
- **onLowParticipation**: When participation is below threshold

## 🔄 Updating Configuration

### Method 1: Direct Edit
1. Edit `config.json` with your preferred settings
2. Commit and push the changes
3. The workflow will use the new configuration on next PR

### Method 2: Environment Variables
Some settings can be overridden via GitHub repository secrets:
- `CONSENSUS_THRESHOLD_DEFAULT`
- `CONSENSUS_THRESHOLD_CORE`
- `CONSENSUS_REQUIRED_GENERALS`

## 🧪 Testing Configuration

### Validation
The system validates configuration on each workflow run:
- JSON syntax correctness
- Required fields presence
- Threshold values within bounds (0.0-1.0)
- General count meets minimum requirements

### Dry Run
Test configuration without affecting real PRs:
```bash
# Set dry run mode in workflow
echo "DRY_RUN=true" >> $GITHUB_ENV
```

## 🚨 Troubleshooting

### Common Issues

**Configuration Not Loading**
```
Error: Missing .consensus/config.json
Solution: Ensure config.json exists and has valid JSON syntax
```

**Invalid Threshold Values**
```
Error: Threshold must be between 0.0 and 1.0
Solution: Check threshold values in config.json
```

**Missing Required Generals**
```
Error: Need at least 3 generals, found 2
Solution: Add more generals to generals.txt or reduce requiredGenerals
```

### Debug Mode
Enable debug logging:
```json
{
  "logging": {
    "level": "DEBUG",
    "includeDebugInfo": true
  }
}
```

## 📊 Monitoring

### Metrics Available
- Consensus pass/fail rates
- Average participation percentage
- Vote distribution by confidence level
- Response times by general
- Configuration validation status

### Health Checks
The system performs automatic health checks:
- Configuration file integrity
- General account accessibility
- Workflow execution status
- Consensus calculation accuracy

## 🔐 Security Considerations

- Configuration files contain no sensitive data
- All settings are public in the repository
- Bot accounts should have minimal permissions
- Regular audit of general account access
- Monitor for configuration tampering

## 📚 Related Documentation

- [Main README](../README.md) - Complete system overview
- [Workflow Documentation](../.github/workflows/consensus.yml) - Technical implementation
- [Troubleshooting Guide](../README.md#troubleshooting) - Common issues and solutions
- [Contributing Guide](../README.md#contributing) - How to contribute

## 🤝 Support

For configuration questions:
1. Check this documentation first
2. Review the troubleshooting section
3. Open an issue with the `configuration` label
4. Include your `config.json` (sanitize sensitive data)

---

**Last Updated**: $(date)
**Version**: 1.0.0
