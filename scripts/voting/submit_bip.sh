#!/bin/bash

# BIP Submission Script
# Submits a BIP (Bitcoin Improvement Proposal) for automated voting

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
CONFIG_FILE="${PROJECT_ROOT}/.consensus/voting.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" >&2
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" >&2
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" >&2
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# Check if yq is installed
check_dependencies() {
    if ! command -v yq &> /dev/null; then
        log_error "yq is required but not installed. Please install yq first."
        log_info "Installation: https://github.com/mikefarah/yq"
        exit 1
    fi

    if ! command -v gh &> /dev/null; then
        log_error "GitHub CLI (gh) is required but not installed."
        log_info "Installation: https://cli.github.com/"
        exit 1
    fi
}

# Validate BIP format
validate_bip() {
    local bip_file="$1"

    log_info "Validating BIP format: $bip_file"

    # Check if file exists
    if [[ ! -f "$bip_file" ]]; then
        log_error "BIP file does not exist: $bip_file"
        return 1
    fi

    # Check required BIP headers
    local required_headers=("BIP:" "Title:" "Author:" "Status:" "Type:" "Created:")

    for header in "${required_headers[@]}"; do
        if ! grep -q "^\*\*${header}" "$bip_file"; then
            log_error "Missing required header: $header"
            return 1
        fi
    done

    # Check BIP number format
    local bip_number
    bip_number=$(grep "^\*\*BIP:\*\*" "$bip_file" | sed 's/.*BIP: \([0-9]*\).*/\1/')

    if [[ ! "$bip_number" =~ ^[0-9]+$ ]]; then
        log_error "Invalid BIP number format: $bip_number"
        return 1
    fi

    # Check if BIP number is unique
    if [[ -f "${PROJECT_ROOT}/bips/active/BIP-${bip_number}.md" ]] || \
       [[ -f "${PROJECT_ROOT}/bips/approved/BIP-${bip_number}.md" ]] || \
       [[ -f "${PROJECT_ROOT}/bips/rejected/BIP-${bip_number}.md" ]]; then
        log_error "BIP number $bip_number already exists"
        return 1
    fi

    log_success "BIP validation passed"
    echo "$bip_number"
}

# Create GitHub issue for BIP
create_github_issue() {
    local bip_file="$1"
    local bip_number="$2"

    log_info "Creating GitHub issue for BIP-$bip_number"

    # Extract BIP information
    local title
    local author
    local type
    local category

    title=$(grep "^\*\*Title:\*\*" "$bip_file" | sed 's/.*Title: \(.*\)/\1/' | tr -d '\n\r')
    author=$(grep "^\*\*Author:\*\*" "$bip_file" | sed 's/.*Author: \(.*\)/\1/' | tr -d '\n\r')
    type=$(grep "^\*\*Type:\*\*" "$bip_file" | sed 's/.*Type: \(.*\)/\1/' | tr -d '\n\r')
    category=$(grep "^\*\*Category:\*\*" "$bip_file" | sed 's/.*Category: \(.*\)/\1/' | tr -d '\n\r')

    # Create issue body
    local issue_body
    issue_body=$(
        cat << EOF
## 🤖 BIP-$bip_number: $title

**Author**: $author
**Type**: $type
**Category**: $category
**Status**: 🟡 Voting in Progress

### Voting Information
- **Start Time**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
- **Threshold**: 60% approval ratio
- **Quorum**: 5 minimum votes
- **Timeout**: 7 days

### Current Votes
*(Votes will be added as comments below)*

### Consensus Status
- **Total Votes**: 0
- **Approved**: 0
- **Rejected**: 0
- **Approval Ratio**: 0%

---

*BIP file: [bips/active/BIP-$bip_number.md](bips/active/BIP-$bip_number.md)*
*Automated voting system - Do not modify manually*
EOF
    )

    # Create GitHub issue
    local issue_url
    issue_url=$(gh issue create \
        --title "BIP-$bip_number: $title" \
        --body "$issue_body" \
        --label "bip,voting,automated")

    log_success "Created GitHub issue: $issue_url"

    # Extract issue number from URL
    local issue_number
    issue_number=$(echo "$issue_url" | grep -o '#[0-9]*' | tr -d '#')

    echo "$issue_number"
}

# Move BIP to active directory
activate_bip() {
    local bip_file="$1"
    local bip_number="$2"
    local issue_number="$3"

    log_info "Moving BIP to active directory"

    local active_file="${PROJECT_ROOT}/bips/active/BIP-${bip_number}.md"

    # Copy BIP to active directory
    cp "$bip_file" "$active_file"

    # Add voting metadata
    cat >> "$active_file" << EOF

---

## 🗳️ Voting Metadata
**Issue Number**: #$issue_number
**Voting Start**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**Status**: Active
**Threshold**: 60%
**Quorum**: 5 votes

*This BIP is currently under automated voting process*
EOF

    log_success "BIP moved to active directory: $active_file"
}

# Trigger automated voting process
trigger_voting() {
    local bip_number="$1"
    local issue_number="$2"

    log_info "Triggering automated voting process"

    # Create voting trigger file
    local trigger_file="${PROJECT_ROOT}/bips/active/.voting-trigger-${bip_number}"

    cat > "$trigger_file" << EOF
{
  "bip_number": "$bip_number",
  "issue_number": "$issue_number",
  "triggered_at": "$(date -u +"%Y-%m-%d %H:%M:%S UTC")",
  "status": "triggered"
}
EOF

    log_success "Voting process triggered for BIP-$bip_number"

    # Note: In a real implementation, this would trigger a GitHub Action
    # or other automation system to notify all models to vote
    log_info "Next steps:"
    log_info "1. GitHub Actions will notify all enabled models"
    log_info "2. Models will cast votes as comments on issue #$issue_number"
    log_info "3. System will tally votes and determine consensus"
    log_info "4. If approved, implementation branch will be created automatically"
}

# Main function
main() {
    local bip_file="$1"

    if [[ $# -ne 1 ]]; then
        echo "Usage: $0 <bip_file>"
        echo "Example: $0 bips/pending/BIP-012.md"
        exit 1
    fi

    log_info "Starting BIP submission process for: $bip_file"

    # Check dependencies
    check_dependencies

    # Validate BIP
    local bip_number
    bip_number=$(validate_bip "$bip_file")
    if [[ $? -ne 0 ]]; then
        exit 1
    fi

    # Create GitHub issue
    local issue_number
    issue_number=$(create_github_issue "$bip_file" "$bip_number")
    if [[ $? -ne 0 ]]; then
        exit 1
    fi

    # Activate BIP
    activate_bip "$bip_file" "$bip_number" "$issue_number"
    if [[ $? -ne 0 ]]; then
        exit 1
    fi

    # Trigger voting
    trigger_voting "$bip_number" "$issue_number"
    if [[ $? -ne 0 ]]; then
        exit 1
    fi

    log_success "BIP-$bip_number successfully submitted for voting!"
    log_info "Track voting progress at: GitHub Issue #$issue_number"
}

# Run main function with all arguments
main "$@"