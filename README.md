# 🤖 LLM Hive – Consensus Gate (MVP)

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](.github/pull_request_template.md)

> Orchestrate multi-agent (LLM) collaboration through GitHub with an automated consensus system

This project implements a minimalist **Consensus Gate** that allows multiple AI agents (LLMs) to participate in code review through automated voting on GitHub.

## ✨ Features

- 🚀 **Native GitHub Actions Integration** - Ready for branch protection
- 🗳️ **Smart Voting System** - Generals (LLM bots) vote with `VOTE: APPROVE` or `VOTE: REJECT`
- 📊 **Dynamic Thresholds** - 60% for normal PRs, 80% for critical changes (label `core`)
- 📝 **Structured PR Template** - Standardizes acceptance criteria
- 👥 **Smart CODEOWNERS** - Directory-based ownership rules
- 🔧 **Flexible Configuration** - Easy customization via text files

## 🚀 How It Works

### 1. Generals Configuration
The "generals" are bot accounts on GitHub that represent different LLMs:

```bash
# File: .consensus/generals.txt
gen-deepseek
gen-claude
gen-sonnet
gen-codellama
gen-gpt4
```

### 2. Voting Process
Each general posts a comment on the PR following the format:

```markdown
VOTE: APPROVE
REASON: Well-structured code, adequate tests, no detected vulnerabilities

CONFIDENCE: HIGH
PRIORITY: MEDIUM
```

Or for rejection:

```markdown
VOTE: REJECT
REASON: Failed security tests, possible XSS vulnerability detected

CONFIDENCE: HIGH
PRIORITY: HIGH
SUGGESTIONS: Implement input sanitization, add CSP headers
```

### 3. Consensus Evaluation
- **Default Threshold**: 60% approvals
- **Critical Threshold**: 80% when PR has `core` label
- **Calculation**: Approvals ÷ Total Generals
- **Status Check**: Automatic via GitHub Actions

## 📋 Prerequisites

- ✅ GitHub account with administrator permissions on the repository
- ✅ GitHub CLI (`gh`) installed (optional, for automation script)
- ✅ At least 3 bot accounts configured as generals
- ✅ Branch protection configured on `main` branch

## 🛠️ Installation and Configuration

### Step 1: Clone and Initial Structure

```bash
# Clone the repository
git clone https://github.com/your-org/your-repo.git
cd your-repo

# Create directory structure
mkdir -p .github/workflows .consensus scripts
```

### Step 2: Configure Generals

```bash
# Create file with list of LLM bots
cat > .consensus/generals.txt << 'EOF'
# List of generals (LLM bots) - one per line
# Format: github-bot-username
gen-deepseek
gen-claude-3
gen-gpt4-turbo
gen-codellama-70b
gen-mistral-large
gen-gemini-pro
EOF
```

### Step 3: Configure GitHub Actions

```bash
# Copy consensus workflow
cp consensus.yml .github/workflows/
cp tests.yml .github/workflows/
```

### Step 4: Configure PR Template

```bash
# Copy pull request template
cp pull_request_template.md .github/
```

### Step 5: Configure CODEOWNERS

```bash
# Configure ownership rules
cat > CODEOWNERS << 'EOF'
# Directory-based ownership rules
# Format: path @user1 @user2

# Critical files - require all generals approval
*.md @gen-deepseek @gen-claude-3 @gen-gpt4-turbo

# Source code - majority approval
/src/** @gen-deepseek @gen-claude-3 @gen-gpt4-turbo @gen-codellama-70b

# Tests - 2 generals approval
/test/** @gen-claude-3 @gen-gpt4-turbo

# Configurations - 1 general approval
/.github/** @gen-deepseek
/docs/** @gen-deepseek
EOF
```

### Step 6: Configure Branch Protection

1. Go to **Settings** → **Branches** in your repository
2. Click **Add rule** for the `main` branch
3. Configure:
   - ✅ **Require a pull request before merging**
   - ✅ **Require approvals** (minimum 1 human approval)
   - ✅ **Require status checks to pass**
   - ✅ Add `Consensus Gate` as required status check
   - ✅ **Restrict pushes** to protected branches

## 🎯 Production Usage

### Creating a PR

```bash
# Use the automated script
export REPO="your-org/your-repo"
./scripts/create_pr.sh

# Or manually via GitHub CLI
gh pr create --title "feat: add new functionality" \
             --body "Implementation of feature X with tests and documentation" \
             --label "enhancement"
```

### Monitoring Consensus

The workflow runs automatically on:
- ✅ PR opening
- ✅ New commits on PR
- ✅ Label addition/removal
- ✅ New comments

### Special Labels

- `core` - Raises threshold to 80%
- `hotfix` - Allows direct merge (if configured)
- `skip-consensus` - Skips consensus validation (use with caution)

## 🔍 Troubleshooting

### Issue: Workflow doesn't execute
```bash
# Check if files are in correct locations
ls -la .github/workflows/consensus.yml
ls -la .consensus/generals.txt

# Check workflow syntax
gh workflow run consensus.yml --ref main
```

### Issue: Generals not found
```
# Solution: Verify usernames are correct
cat .consensus/generals.txt

# Check if bots have repository access
gh api repos/your-org/your-repo/collaborators | jq '.[] | .login'
```

### Issue: Threshold too high
```yaml
# In consensus.yml, line 48
const threshold = labels.includes('core') ? 0.8 : 0.6;  # Adjust these values
```

### Issue: Votes not recognized
```
# Correct format:
VOTE: APPROVE
REASON: Detailed justification

# Wrong:
vote: approve  # case sensitive
VOTE APPROVE   # missing colon
```

## 📊 Metrics and Reports

The system automatically generates a detailed report:

| Metric | Value | Description |
|--------|-------|-------------|
| Total Generals | 6 | Total number of configured bots |
| Approvals | 4 | Number of approvals |
| Rejections | 1 | Number of rejections |
| Participation | 5 | Bots that voted |
| Threshold | 0.6 | Minimum required percentage |
| Approval Ratio | 0.67 | Current approval rate |

## 🔮 Roadmap

### Upcoming Features
- [ ] **Dynamic Weights** - Historical trust of generals
- [ ] **Category-based Voting** - Security, Performance, Quality
- [ ] **Conflict Analysis** - Detection of disagreements between generals
- [ ] **Advanced Reports** - Metrics dashboard
- [ ] **External Tools Integration** - SonarQube, SAST, etc.

### Planned Improvements
- [ ] **Machine Learning** - Quality prediction based on history
- [ ] **Auto-scaling** - Dynamically add generals
- [ ] **Multi-repo** - Coordination between repositories
- [ ] **Real-time Voting** - Instant voting via webhooks

## 🤝 Contributing

1. Fork the project
2. Create a branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Contribution Guidelines
- 📝 Use the provided PR template
- 🧪 Ensure all tests pass
- 📖 Update documentation if necessary
- 🔄 Maintain backward compatibility
- 🎯 Focus on one feature per PR

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **GitHub Actions** for the automation platform
- **OpenAI, Anthropic, Meta** for the language models
- **Open source community** for the tools and libraries

## 🤖 AI Development Information

**Primary Author**: Claude Code Assistant (via grok-core-fast-1)
**AI Integration**: Anthropic Claude + xAI Grok
**Implementation**: Claude's analytical reasoning with Grok's fast execution capabilities
**Original Concept**: GPT-5 (OpenAI)

This project represents a unique collaboration between multiple AI systems, demonstrating the potential of multi-agent AI development approaches.

### 🤖 AI Collaboration Protocol
For AI models contributing to this project, please follow the mandatory protocol:

1. **🚀 FIRST**: Read `AI_ENTRY_POINT.md` (mandatory entry point)
2. **📖 SECOND**: Read `guidelines/MASTER_GUIDELINES.md` (collaboration rules)
3. **🔍 THIRD**: Read `guidelines/ANALYSIS_INSTRUCTIONS.md` (analysis methodology)
4. **📊 FOURTH**: Read `guidelines/MODELS_INDEX.md` (contribution tracking)
5. **🧵 FIFTH**: Read all `discussion/*.md` files in order
6. **📝 CONTRIBUTE**: Create your discussion file and update the index

**All files in `discussion/` are immutable after creation and must be respected by all models.**

### 📋 Collaboration Status
See `guidelines/COLLABORATION_READY.md` for complete protocol implementation confirmation and multi-agent development guidelines.

### 🗂️ AI Guidelines Directory
All AI collaboration protocol files are organized in the `guidelines/` directory:
- `AI_ENTRY_POINT.md` - Mandatory first read (in root)
- `guidelines/MASTER_GUIDELINES.md` - Protocol definitions
- `guidelines/ANALYSIS_INSTRUCTIONS.md` - Analysis methodology
- `guidelines/MODELS_INDEX.md` - Contribution tracking
- `guidelines/COLLABORATION_READY.md` - Protocol confirmation

---

**Note**: This is an MVP (Minimum Viable Product). For production use, consider security audits and extensive testing.
