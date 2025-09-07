#!/usr/bin/env bash
set -euo pipefail

# =================================================================================
# 🤖 LLM HIVE - PR CREATION SCRIPT
# =================================================================================
# This script automates the creation of pull requests for the LLM Consensus Gate
#
# Requirements:
# - gh CLI installed and authenticated
# - git configured with push rights
# - All necessary files staged/committed
#
# Usage:
#   export REPO="owner/repo"
#   ./scripts/create_pr.sh
#
# Or with custom options:
#   REPO="owner/repo" BRANCH="feature-branch" ./scripts/create_pr.sh
#
# =================================================================================

# ============================================================================
# CONFIGURATION VARIABLES
# ============================================================================

# Repository settings
REPO="${REPO:-}"
BASE="${BASE:-main}"
BRANCH="${BRANCH:-llm-hive-consensus}"

# PR metadata
TITLE="${TITLE:-🤖 LLM Hive: Add Consensus Gate + Templates}"
BODY="${BODY:-}"

# Script behavior
DRY_RUN="${DRY_RUN:-false}"
VERBOSE="${VERBOSE:-false}"
FORCE="${FORCE:-false}"

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

log_info() {
    echo "ℹ️  $1"
}

log_success() {
    echo "✅ $1"
}

log_warning() {
    echo "⚠️  $1"
}

log_error() {
    echo "❌ $1"
}

log_debug() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo "🔍 $1"
    fi
}

show_help() {
    cat << EOF
🤖 LLM Hive PR Creation Script

USAGE:
    $0 [OPTIONS]

OPTIONS:
    -r, --repo REPO       Target repository (owner/repo)
    -b, --branch BRANCH   Feature branch name (default: llm-hive-consensus)
    -t, --title TITLE     PR title
    -d, --body BODY       PR description
    --base BASE          Base branch (default: main)
    --dry-run            Show what would be done without executing
    --force              Skip validation checks
    --verbose            Enable verbose output
    -h, --help           Show this help message

ENVIRONMENT VARIABLES:
    REPO                  Target repository
    BASE                  Base branch
    BRANCH                Feature branch
    TITLE                 PR title
    BODY                  PR description
    DRY_RUN              Set to 'true' for dry run
    VERBOSE              Set to 'true' for verbose output
    FORCE                Set to 'true' to skip validations

EXAMPLES:
    # Basic usage
    export REPO="myorg/myrepo"
    $0

    # With custom branch
    REPO="myorg/myrepo" BRANCH="feature/consensus" $0

    # Dry run
    DRY_RUN=true REPO="myorg/myrepo" $0

EOF
}

# ============================================================================
# VALIDATION FUNCTIONS
# ============================================================================

validate_requirements() {
    log_info "Validating requirements..."

    # Check if gh CLI is installed
    if ! command -v gh &> /dev/null; then
        log_error "GitHub CLI (gh) is not installed or not in PATH"
        log_info "Install from: https://cli.github.com/"
        exit 1
    fi

    # Check if gh is authenticated
    if ! gh auth status &> /dev/null; then
        log_error "GitHub CLI is not authenticated"
        log_info "Run: gh auth login"
        exit 1
    fi

    # Check if we're in a git repository
    if ! git rev-parse --git-dir &> /dev/null; then
        log_error "Not in a git repository"
        exit 1
    fi

    log_success "Requirements validation passed"
}

validate_repository() {
    log_info "Validating repository access..."

    # Check if repository exists and we have access
    if ! gh repo view "$REPO" &> /dev/null; then
        log_error "Cannot access repository: $REPO"
        log_info "Make sure the repository exists and you have access"
        exit 1
    fi

    log_success "Repository access validated"
}

validate_files() {
    log_info "Validating required files..."

    local required_files=(
        ".consensus/generals.txt"
        ".github/workflows/consensus.yml"
        ".github/pull_request_template.md"
        "CODEOWNERS"
        "README.md"
    )

    local missing_files=()

    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            missing_files+=("$file")
        fi
    done

    if [[ ${#missing_files[@]} -gt 0 ]]; then
        log_error "Missing required files:"
        for file in "${missing_files[@]}"; do
            echo "  - $file"
        done
        log_info "Run the setup script or create missing files manually"
        if [[ "$FORCE" != "true" ]]; then
            exit 1
        fi
    else
        log_success "All required files present"
    fi
}

# ============================================================================
# GIT OPERATIONS
# ============================================================================

setup_git_branch() {
    log_info "Setting up git branch: $BRANCH"

    # Check if branch already exists
    if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
        log_warning "Branch '$BRANCH' already exists"
        if [[ "$FORCE" == "true" ]]; then
            log_info "Switching to existing branch"
            git checkout "$BRANCH"
        else
            read -p "Switch to existing branch? (y/N): " -r
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                git checkout "$BRANCH"
            else
                log_error "Branch creation aborted"
                exit 1
            fi
        fi
    else
        log_debug "Creating new branch: $BRANCH"
        git checkout -b "$BRANCH"
    fi

    log_success "Branch setup complete"
}

commit_changes() {
    log_info "Committing changes..."

    # Check if there are changes to commit
    if git diff --cached --quiet && git diff --quiet; then
        log_warning "No changes to commit"
        return 0
    fi

    # Add all changes
    git add -A

    # Create commit message with more details
    local commit_msg="🤖 feat: LLM Hive Consensus Gate (MVP)

- Add consensus gate workflow (.github/workflows/consensus.yml)
- Configure generals list (.consensus/generals.txt)
- Add structured PR template (.github/pull_request_template.md)
- Setup CODEOWNERS rules
- Update documentation (README.md)

This implements a minimal viable consensus gate for multi-agent
LLM collaboration through automated voting on GitHub PRs."

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "Would commit with message:"
        echo "$commit_msg"
        return 0
    fi

    # Commit changes
    if git commit -m "$commit_msg"; then
        log_success "Changes committed successfully"
    else
        log_warning "Nothing to commit (maybe already committed)"
    fi
}

push_branch() {
    log_info "Pushing branch to remote..."

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "Would push branch: $BRANCH"
        return 0
    fi

    if git push -u origin "$BRANCH"; then
        log_success "Branch pushed successfully"
    else
        log_warning "Push failed (branch might already exist on remote)"
        # Try to push without -u flag
        git push origin "$BRANCH" || true
    fi
}

# ============================================================================
# PR CREATION
# ============================================================================

generate_pr_body() {
    if [[ -n "$BODY" ]]; then
        echo "$BODY"
        return
    fi

    cat << EOF
🤖 **LLM Consensus Gate MVP**

This pull request implements a minimal consensus gate system for orchestrating multi-agent LLM collaboration through automated voting on GitHub.

## What's Included

### Core Components
- **Consensus Gate Workflow** (`.github/workflows/consensus.yml`)
  - Automated voting system with threshold validation
  - Support for standard (60%) and core (80%) thresholds
  - Detailed reporting and recommendations

- **Generals Configuration** (`.consensus/generals.txt`)
  - List of bot accounts for consensus voting
  - Organized by capability and specialization

- **Structured PR Template** (`.github/pull_request_template.md`)
  - Comprehensive checklist for AI/LLM projects
  - Consensus voting requirements
  - Security, performance, and quality gates

- **CODEOWNERS Rules** (`CODEOWNERS`)
  - Directory-based ownership for different components
  - Specialized rules for AI, security, and infrastructure

### How It Works

1. **Generals** (LLM bot accounts) vote on PRs using format:
   \`\`\`markdown
   VOTE: APPROVE
   REASON: Detailed technical justification
   CONFIDENCE: HIGH/MEDIUM/LOW
   PRIORITY: HIGH/MEDIUM/LOW
   \`\`\`

2. **Consensus Gate** validates votes against thresholds:
   - Standard PRs: 60% approval rate
   - Core changes: 80% approval rate (when \`core\` label applied)

3. **Automated Reporting** provides:
   - Detailed vote breakdown
   - Consensus strength analysis
   - Recommendations for improvement

## Setup Requirements

- At least 3 bot accounts configured as generals
- Branch protection rules configured
- Consensus gate set as required status check

## Next Steps

After merging this PR:
1. Configure bot accounts and add them to the repository
2. Set up branch protection rules
3. Test the consensus gate with a sample PR
4. Monitor and adjust thresholds as needed

## Labels for Special Handling

- \`core\` - Requires 80% consensus threshold
- \`hotfix\` - Bypasses consensus (use sparingly)
- \`skip-consensus\` - Skips consensus validation

---

*This PR was created using the automated setup script.*
EOF
}

create_pull_request() {
    log_info "Creating pull request..."

    local pr_body
    pr_body=$(generate_pr_body)

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "Would create PR with:"
        echo "  Title: $TITLE"
        echo "  Repository: $REPO"
        echo "  Base: $BASE"
        echo "  Head: $BRANCH"
        return 0
    fi

    # Create the PR
    if gh pr create \
        --repo "$REPO" \
        --base "$BASE" \
        --head "$BRANCH" \
        --title "$TITLE" \
        --body "$pr_body"; then

        log_success "Pull request created successfully!"
        log_info "PR: https://github.com/$REPO/pull/$(gh pr view --repo "$REPO" --json number -q .number)"
    else
        log_warning "PR creation failed (might already exist)"
        # Try to find existing PR
        local existing_pr
        existing_pr=$(gh pr list --repo "$REPO" --head "$BRANCH" --json number,title -q '.[0].number' 2>/dev/null || echo "")
        if [[ -n "$existing_pr" ]]; then
            log_info "Existing PR: https://github.com/$REPO/pull/$existing_pr"
        fi
    fi
}

# ============================================================================
# MAIN SCRIPT
# ============================================================================

main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -r|--repo)
                REPO="$2"
                shift 2
                ;;
            -b|--branch)
                BRANCH="$2"
                shift 2
                ;;
            -t|--title)
                TITLE="$2"
                shift 2
                ;;
            -d|--body)
                BODY="$2"
                shift 2
                ;;
            --base)
                BASE="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --force)
                FORCE=true
                shift
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done

    # Validate required parameters
    if [[ -z "$REPO" ]]; then
        log_error "Repository not specified"
        log_info "Use: export REPO=owner/repo or --repo owner/repo"
        exit 1
    fi

    # Show configuration
    log_info "Configuration:"
    log_debug "  Repository: $REPO"
    log_debug "  Base branch: $BASE"
    log_debug "  Feature branch: $BRANCH"
    log_debug "  Title: $TITLE"
    log_debug "  Dry run: $DRY_RUN"
    log_debug "  Force: $FORCE"
    log_debug "  Verbose: $VERBOSE"

    # Run validations
    if [[ "$FORCE" != "true" ]]; then
        validate_requirements
        validate_repository
        validate_files
    else
        log_warning "Skipping validations (--force enabled)"
    fi

    # Execute git operations
    setup_git_branch
    commit_changes
    push_branch

    # Create PR
    create_pull_request

    # Final success message
    if [[ "$DRY_RUN" != "true" ]]; then
        log_success "🎉 LLM Consensus Gate setup complete!"
        log_info "Next steps:"
        log_info "1. Configure bot accounts as repository collaborators"
        log_info "2. Set up branch protection rules"
        log_info "3. Test with a sample PR"
        log_info "4. Monitor consensus voting"
    fi
}

# ============================================================================
# SCRIPT ENTRY POINT
# ============================================================================

# Run main function
main "$@"
