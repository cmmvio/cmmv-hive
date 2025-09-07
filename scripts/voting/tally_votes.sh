#!/bin/bash

# Vote Tallying Script
# Analyzes votes on a BIP and determines consensus

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

# Check dependencies
check_dependencies() {
    if ! command -v yq &> /dev/null; then
        log_error "yq is required but not installed."
        exit 1
    fi

    if ! command -v gh &> /dev/null; then
        log_error "GitHub CLI (gh) is required but not installed."
        exit 1
    fi

    if ! command -v jq &> /dev/null; then
        log_error "jq is required but not installed."
        exit 1
    fi
}

# Get voting configuration
get_config() {
    local key="$1"
    yq eval "$key" "$CONFIG_FILE"
}

# Fetch votes from GitHub issue
fetch_votes() {
    local issue_number="$1"

    log_info "Fetching votes from GitHub issue #$issue_number"

    # Get all comments from the issue
    local comments_json
    comments_json=$(gh issue view "$issue_number" --json comments --jq '.comments')

    # Filter votes (comments containing "## 🤖 Vote:")
    local votes_json
    votes_json=$(echo "$comments_json" | jq '
        map(select(.body | contains("## 🤖 Vote:"))) |
        map({
            author: .author.login,
            body: .body,
            created_at: .createdAt
        })
    ')

    echo "$votes_json"
}

# Parse individual vote
parse_vote() {
    local vote_body="$1"
    local author="$2"

    # Extract vote decision
    local decision
    if echo "$vote_body" | grep -q "## 🤖 Vote: YES"; then
        decision="YES"
    elif echo "$vote_body" | grep -q "## 🤖 Vote: NO"; then
        decision="NO"
    else
        decision="INVALID"
    fi

    # Extract weight from configuration
    local weight
    weight=$(yq eval ".voting.models[] | select(.id == \"$author\") | .weight // 1.0" "$CONFIG_FILE")

    # Extract rationale
    local rationale
    rationale=$(echo "$vote_body" | sed -n '/### Rationale/,/^###/p' | sed '1d;$d' | sed '/^$/d')

    # Create vote object
    jq -n \
        --arg author "$author" \
        --arg decision "$decision" \
        --arg weight "$weight" \
        --arg rationale "$rationale" \
        '{
            author: $author,
            decision: $decision,
            weight: ($weight | tonumber),
            rationale: $rationale
        }'
}

# Calculate consensus
calculate_consensus() {
    local votes_json="$1"
    local threshold="$2"
    local quorum="$3"

    log_info "Calculating consensus with threshold=$threshold, quorum=$quorum"

    # Calculate totals
    local total_votes
    local total_weight
    local yes_weight
    local no_weight

    total_votes=$(echo "$votes_json" | jq length)
    total_weight=$(echo "$votes_json" | jq 'map(.weight) | add // 0')
    yes_weight=$(echo "$votes_json" | jq '[.[] | select(.decision == "YES") | .weight] | add // 0')
    no_weight=$(echo "$votes_json" | jq '[.[] | select(.decision == "NO") | .weight] | add // 0')

    # Calculate approval ratio
    local approval_ratio=0
    if (( $(echo "$total_weight > 0" | bc -l) )); then
        approval_ratio=$(echo "scale=4; $yes_weight / $total_weight" | bc -l)
    fi

    # Determine consensus
    local approved=false
    local quorum_met=false

    if (( $(echo "$total_votes >= $quorum" | bc -l) )); then
        quorum_met=true
        if (( $(echo "$approval_ratio >= $threshold" | bc -l) )); then
            approved=true
        fi
    fi

    # Create consensus result
    jq -n \
        --argjson approved "$approved" \
        --argjson quorum_met "$quorum_met" \
        --argjson approval_ratio "$approval_ratio" \
        --argjson total_votes "$total_votes" \
        --argjson total_weight "$total_weight" \
        --argjson yes_weight "$yes_weight" \
        --argjson no_weight "$no_weight" \
        '{
            approved: $approved,
            quorum_met: $quorum_met,
            approval_ratio: ($approval_ratio | tonumber),
            total_votes: $total_votes,
            total_weight: ($total_weight | tonumber),
            yes_weight: ($yes_weight | tonumber),
            no_weight: ($no_weight | tonumber)
        }'
}

# Update GitHub issue with results
update_issue() {
    local issue_number="$1"
    local bip_number="$2"
    local consensus_json="$3"

    log_info "Updating GitHub issue #$issue_number with voting results"

    local approved
    local approval_ratio
    local total_votes
    local status_emoji
    local status_text

    approved=$(echo "$consensus_json" | jq -r '.approved')
    approval_ratio=$(echo "$consensus_json" | jq -r '.approval_ratio * 100' | xargs printf "%.1f")
    total_votes=$(echo "$consensus_json" | jq -r '.total_votes')

    if [[ "$approved" == "true" ]]; then
        status_emoji="✅"
        status_text="Approved"
    else
        status_emoji="❌"
        status_text="Rejected"
    fi

    local comment_body
    comment_body=$(
        cat << EOF
## 🗳️ Voting Results - BIP-$bip_number

**Status**: $status_emoji $status_text
**Approval Ratio**: ${approval_ratio}%
**Total Votes**: $total_votes
**Completed**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")

### Consensus Details
\`\`\`json
$(echo "$consensus_json" | jq .)
\`\`\`

---
*Automated voting system - Results calculated by tally_votes.sh*
EOF
    )

    # Add comment to issue
    gh issue comment "$issue_number" --body "$comment_body"

    log_success "Updated issue #$issue_number with voting results"
}

# Move BIP based on consensus
move_bip() {
    local bip_number="$1"
    local consensus_json="$2"

    local approved
    approved=$(echo "$consensus_json" | jq -r '.approved')

    local source_file="${PROJECT_ROOT}/bips/active/BIP-${bip_number}.md"

    if [[ "$approved" == "true" ]]; then
        local target_file="${PROJECT_ROOT}/bips/approved/BIP-${bip_number}.md"
        mv "$source_file" "$target_file"
        log_success "BIP-$bip_number moved to approved/"
        echo "approved"
    else
        local target_file="${PROJECT_ROOT}/bips/rejected/BIP-${bip_number}.md"
        mv "$source_file" "$target_file"
        log_success "BIP-$bip_number moved to rejected/"
        echo "rejected"
    fi
}

# Main function
main() {
    local issue_number="$1"

    if [[ $# -ne 1 ]]; then
        echo "Usage: $0 <issue_number>"
        echo "Example: $0 123"
        exit 1
    fi

    log_info "Starting vote tallying for issue #$issue_number"

    # Check dependencies
    check_dependencies

    # Get configuration
    local threshold
    local quorum
    threshold=$(get_config '.voting.threshold')
    quorum=$(get_config '.voting.quorum')

    log_info "Using threshold=$threshold, quorum=$quorum"

    # Fetch votes from GitHub
    local votes_data
    votes_data=$(fetch_votes "$issue_number")

    # Parse votes
    local votes_json="[]"
    local vote_count
    vote_count=$(echo "$votes_data" | jq length)

    log_info "Found $vote_count votes to process"

    for ((i = 0; i < vote_count; i++)); do
        local vote_item
        vote_item=$(echo "$votes_data" | jq ".[$i]")

        local author
        local body
        author=$(echo "$vote_item" | jq -r '.author')
        body=$(echo "$vote_item" | jq -r '.body')

        log_info "Processing vote from $author"

        local parsed_vote
        parsed_vote=$(parse_vote "$body" "$author")

        votes_json=$(echo "$votes_json" | jq ". + [$parsed_vote]")
    done

    # Calculate consensus
    local consensus_json
    consensus_json=$(calculate_consensus "$votes_json" "$threshold" "$quorum")

    log_info "Consensus calculated:"
    echo "$consensus_json" | jq .

    # Update issue
    update_issue "$issue_number" "012" "$consensus_json"

    # Move BIP based on result
    local result
    result=$(move_bip "012" "$consensus_json")

    if [[ "$result" == "approved" ]]; then
        log_success "BIP approved! Implementation branch will be created."
        # Note: In a real implementation, this would trigger branch creation
        log_info "Next: Run create_branch.sh for BIP-012"
    else
        log_info "BIP rejected. No further action needed."
    fi
}

# Run main function with all arguments
main "$@"
