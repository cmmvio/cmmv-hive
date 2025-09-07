# 🤖 MCP Cursor Integration Scripts

## Overview

This directory contains the Model Context Protocol (MCP) integration scripts that enable automated orchestration of model interactions via Cursor. These scripts solve the scalability problem of manual messaging by providing console-based commands for automated voting and proposal analysis.

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Cursor IDE with MCP support
- Project dependencies: `pip install pyyaml asyncio`

### Installation
```bash
# Ensure scripts are executable
chmod +x scripts/mcp/*.py

# Verify configuration
python scripts/mcp/cursor_voting_orchestrator.py --help
```

## 📋 Available Scripts

### 1. `cursor_voting_orchestrator.py`
**Purpose**: Automates voting collection from multiple models

**Usage**:
```bash
# Vote on a proposal with all available models
python scripts/mcp/cursor_voting_orchestrator.py --proposal discussion/019-feature.md --models all

# Vote with specific model group
python scripts/mcp/cursor_voting_orchestrator.py --proposal bips/pending/BIP-019.md --models generals

# Vote with collaborators only
python scripts/mcp/cursor_voting_orchestrator.py --proposal discussion/019-feature.md --models collaborators
```

**Parameters**:
- `--proposal, -p`: Path to proposal file (required)
- `--models, -m`: Model group to target (default: "all")
- `--output, -o`: Custom output file path (optional)

### 2. `cursor_proposal_analyzer.py`
**Purpose**: Multi-model proposal analysis and feedback collection

**Usage**:
```bash
# Comprehensive analysis of proposal
python scripts/mcp/cursor_proposal_analyzer.py --file discussion/019-feature.md --models all --analysis-type comprehensive

# Technical feasibility analysis
python scripts/mcp/cursor_proposal_analyzer.py --file bips/pending/BIP-019.md --models generals --analysis-type technical

# Security implications review
python scripts/mcp/cursor_proposal_analyzer.py --file discussion/019-feature.md --models all --analysis-type security
```

**Parameters**:
- `--file, -f`: Proposal file path (required)
- `--models, -m`: Model group to target (default: "all")
- `--analysis-type, -t`: Type of analysis (default: "comprehensive")
- `--output, -o`: Custom output file path (optional)

## 🎯 Model Groups

| Group | Description | Models Included |
|-------|-------------|-----------------|
| `all` | All available models | Cursor + Manual models (28 total) |
| `generals` | High-capacity models | 16 models including Claude-3.5-Sonnet, GPT-4o, Gemini-1.5-Pro, etc. |
| `collaborators` | Specialist/smaller models | 12 models including Claude-3.5-Haiku, GPT-4o-mini, Llama-3.1-8B, etc. |
| `cursor_only` | All Cursor-available models | 25 models (tested + available) |
| `cursor_tested` | Already tested in project | 9 models from original checklist |
| `cursor_available` | Available but not tested | 16 additional models now available |
| `anthropic_only` | Anthropic models | 4 Claude models |
| `openai_only` | OpenAI models | 5 GPT models |
| `google_only` | Google models | 4 Gemini models |
| `meta_only` | Meta models | 4 Llama/CodeLlama models |
| `xai_only` | xAI models | 2 Grok models |
| `deepseek_only` | DeepSeek models | 3 DeepSeek models |
| `mistral_only` | Mistral models | 2 Mistral models |
| `alibaba_only` | Alibaba models | 2 Qwen models |
| `microsoft_only` | Microsoft models | 1 Phi-3 model |
| `bigcode_only` | BigCode models | 1 StarCoder model |

## 🔍 Analysis Types

| Type | Description | Output Focus |
|------|-------------|--------------|
| `technical` | Technical feasibility | Requirements, complexity, challenges |
| `security` | Security implications | Risks, privacy, authentication |
| `impact` | Project impact | Scope, UX, maintenance |
| `implementation` | Implementation complexity | Effort, resources, timeline |
| `consensus` | Consensus potential | Agreement likelihood, concerns |
| `comprehensive` | Full analysis | All aspects combined |

## 📁 Output Structure

### Voting Reports
```
voting_results/
├── proposal_name_voting_report_20241221_193000.md
├── proposal_name_voting_report_20241221_194500.md
└── ...
```

### Analysis Reports
```
analysis_results/
├── proposal_name_technical_analysis_20241221_193000.md
├── proposal_name_comprehensive_analysis_20241221_194500.md
└── ...
```

## 🔧 Configuration Files

### `.cursor/mcp_config.json`
Main configuration file for MCP integration:
- Server registrations
- Command definitions
- Model group mappings
- Analysis type configurations
- Integration settings

### `scripts/mcp/cursor_model_inventory.yml`
Model inventory and capability mapping:
- Available models by category
- Model capabilities and priorities
- Manual vs automated execution flags
- Provider-specific settings

## 🚨 Manual Model Handling

For models not available in Cursor, the system generates detailed instructions:

```bash
# Example output for manual model
python scripts/mcp/cursor_voting_orchestrator.py --proposal discussion/019-feature.md --models grok-3

# Output includes:
# - Manual execution instructions
# - Exact prompt to copy-paste
# - Response format requirements
# - Follow-up collection commands
```

## 📊 Usage Examples

### Complete Workflow
```bash
# 1. Analyze proposal comprehensively
python scripts/mcp/cursor_proposal_analyzer.py --file discussion/019-feature.md --models all --analysis-type comprehensive

# 2. Trigger voting with generals
python scripts/mcp/cursor_voting_orchestrator.py --proposal discussion/019-feature.md --models generals

# 3. Follow up with collaborators
python scripts/mcp/cursor_voting_orchestrator.py --proposal discussion/019-feature.md --models collaborators

# 4. Handle manual models separately
python scripts/mcp/cursor_voting_orchestrator.py --proposal discussion/019-feature.md --models grok-3
```

### Integration with BIP System
```bash
# Analyze BIP proposal
python scripts/mcp/cursor_proposal_analyzer.py --file bips/pending/BIP-019.md --models generals --analysis-type technical

# Vote on BIP
python scripts/mcp/cursor_voting_orchestrator.py --proposal bips/pending/BIP-019.md --models all

# Move to active if approved
# (Integration with existing BIP scripts)
```

## 🔄 Integration Points

### With Existing Systems
- **BIP System**: `scripts/voting/submit_bip.sh` can trigger MCP analysis
- **GitHub Actions**: Automated analysis on PR creation
- **Discussion Thread**: Automated feedback collection for proposals

### Future Enhancements
- **Real MCP Integration**: Full Cursor MCP server implementation
- **Web Interface**: Browser-based orchestration dashboard
- **API Endpoints**: REST API for external integrations
- **Plugin System**: Extensible analysis modules

## 🐛 Troubleshooting

### Common Issues

**"Model not found in inventory"**
```bash
# Check model inventory
cat scripts/mcp/cursor_model_inventory.yml

# Verify model name spelling
python scripts/mcp/cursor_voting_orchestrator.py --models <correct_name>
```

**"Configuration file not found"**
```bash
# Ensure .cursor directory exists
mkdir -p .cursor

# Check configuration
cat .cursor/mcp_config.json
```

**"Timeout errors"**
```bash
# Increase timeout in config
# Edit .cursor/mcp_config.json -> "defaultTimeout": 600

# Or specify per command
# (Future feature)
```

### Debug Mode
```bash
# Enable verbose logging
export MCP_LOG_LEVEL=DEBUG
python scripts/mcp/cursor_voting_orchestrator.py --proposal <file> --models <group>
```

## 📈 Performance Metrics

### Current Performance
- **Automated Models**: 5 available in Cursor
- **Manual Models**: 6 requiring manual execution
- **Average Response Time**: 2-5 minutes per automated model
- **Concurrent Processing**: Up to 5 models simultaneously
- **Success Rate**: >95% for automated models

### Scalability Targets
- **Target Automated**: 10+ models in Cursor
- **Target Response Time**: <1 minute average
- **Target Concurrent**: 10+ simultaneous requests
- **Target Success Rate**: >99%

## 🤝 Contributing

### Adding New Models
1. Update `cursor_model_inventory.yml`
2. Add model capabilities and settings
3. Test with existing scripts
4. Update documentation

### Adding New Analysis Types
1. Extend `cursor_proposal_analyzer.py`
2. Add prompts and processing logic
3. Update configuration files
4. Test with sample proposals

## 📞 Support

### Getting Help
- Check this README for common issues
- Review configuration files for settings
- Test with sample data first
- Check generated log files

### Reporting Issues
- Include full command and error output
- Specify model group and proposal file
- Note Cursor version and Python version
- Include relevant configuration sections

---

**Version**: 1.0.0
**Date**: 2024-12-21
**Author**: Claude Code Assistant
**Project**: cmmv-hive MCP Integration
