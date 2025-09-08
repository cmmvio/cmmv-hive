#!/bin/bash

# Minutes Session Creation Script
# Creates a new voting session directory with all required templates

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
MINUTES_DIR="${PROJECT_ROOT}/gov/minutes"
TEMPLATES_DIR="${MINUTES_DIR}/templates"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Show usage
usage() {
    echo "Usage: $0 <minute_id> <session_title>"
    echo ""
    echo "Arguments:"
    echo "  minute_id      - Session identifier (e.g., 0005)"
    echo "  session_title  - Descriptive session title"
    echo ""
    echo "Example:"
    echo "  $0 0005 'AI Enhancement Proposals Session'"
    echo ""
    echo "This will create: gov/minutes/0005/ with all templates populated"
}

# Validate arguments
validate_args() {
    local minute_id="$1"
    local session_title="$2"

    if [[ -z "$minute_id" ]]; then
        log_error "Minute ID is required"
        usage
        exit 1
    fi

    if [[ -z "$session_title" ]]; then
        log_error "Session title is required"
        usage
        exit 1
    fi

    # Validate minute ID format (should be 4 digits)
    if [[ ! "$minute_id" =~ ^[0-9]{4}$ ]]; then
        log_error "Minute ID must be 4 digits (e.g., 0005)"
        exit 1
    fi

    # Check if session already exists
    if [[ -d "${MINUTES_DIR}/${minute_id}" ]]; then
        log_error "Session ${minute_id} already exists!"
        exit 1
    fi
}

# Check if templates exist
check_templates() {
    if [[ ! -d "$TEMPLATES_DIR" ]]; then
        log_error "Templates directory not found: $TEMPLATES_DIR"
        log_error "Run this script from the project root or ensure templates exist"
        exit 1
    fi

    local required_templates=(
        "README.md"
        "executive_summary.md"
        "final_report.md"
        "final_report.json"
        "results.json"
        "summary.md"
        "voting_results_[timestamp].json"
    )

    for template in "${required_templates[@]}"; do
        if [[ ! -f "${TEMPLATES_DIR}/${template}" ]]; then
            log_error "Required template missing: $template"
            exit 1
        fi
    done
}

# Create session directory and copy templates
create_session() {
    local minute_id="$1"
    local session_title="$2"
    local session_dir="${MINUTES_DIR}/${minute_id}"

    log_info "Creating session directory: $session_dir"
    mkdir -p "$session_dir"

    log_info "Copying templates..."
    cp "${TEMPLATES_DIR}"/* "$session_dir"/

    # Copy additional required files from latest session
    local latest_session
    latest_session=$(ls -1 "$MINUTES_DIR" | grep -E '^[0-9]{4}$' | sort -n | tail -1)

    if [[ -n "$latest_session" && -f "${MINUTES_DIR}/${latest_session}/INSTRUCTIONS.md" ]]; then
        log_info "Copying INSTRUCTIONS.md from latest session ($latest_session)"
        cp "${MINUTES_DIR}/${latest_session}/INSTRUCTIONS.md" "$session_dir"/
    fi

    # Create votes directory
    mkdir -p "${session_dir}/votes"

    # Initialize empty voting_chain.json
    cat > "${session_dir}/voting_chain.json" << EOF
{
  "minute_id": "${minute_id}",
  "chain": []
}
EOF

    log_success "Session directory created successfully"
}

# Populate templates with session data
populate_templates() {
    local minute_id="$1"
    local session_title="$2"
    local session_dir="${MINUTES_DIR}/${minute_id}"

    log_info "Populating templates with session data..."

    # Get current timestamp
    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

    # List of files to update
    local files_to_update=(
        "README.md"
        "executive_summary.md"
        "final_report.md"
        "final_report.json"
        "results.json"
        "summary.md"
    )

    for file in "${files_to_update[@]}"; do
        local file_path="${session_dir}/${file}"

        if [[ -f "$file_path" ]]; then
            # Replace common placeholders
            sed -i "s/\[MINUTE_ID\]/${minute_id}/g" "$file_path"
            sed -i "s/\[SESSION_TITLE\]/${session_title}/g" "$file_path"
            sed -i "s/\[GENERATION_TIMESTAMP\]/${timestamp}/g" "$file_path"
            sed -i "s/\[REPORTER_MODEL\]/grok-code-fast-1/g" "$file_path"

            # Session-specific replacements
            case "$file" in
                "README.md")
                    sed -i "s/\[ORDINAL_SESSION\]/$((${minute_id#0}))th/g" "$file_path"
                    ;;
                "executive_summary.md")
                    sed -i "s/\[SESSION_DESCRIPTION\]/evaluation of ${session_title,,}/g" "$file_path"
                    ;;
            esac

            log_info "Updated: $file"
        fi
    done

    log_success "Templates populated successfully"
}

# Create initial proposals.json template
create_proposals_template() {
    local minute_id="$1"
    local session_dir="${MINUTES_DIR}/${minute_id}"

    cat > "${session_dir}/proposals.json" << EOF
{
  "minute_id": "${minute_id}",
  "session_title": "${session_title}",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")",
  "description": "Proposals for ${session_title}",
  "proposals": [
    {
      "id": "P001",
      "title": "Example Proposal Title",
      "category": "Example Category",
      "author": "Example Author",
      "description": "Brief description of the proposal",
      "strategic_impact": "Expected impact and benefits",
      "estimated_effort": "High/Medium/Low",
      "dependencies": []
    }
  ],
  "voting_instructions": {
    "scale": "1-10 (1=Strongly Oppose, 10=Strongly Support)",
    "threshold": 70,
    "deadline": null
  }
}
EOF

    log_success "Created initial proposals.json template"
}

# Generate summary report
generate_summary() {
    local minute_id="$1"
    local session_title="$2"
    local session_dir="${MINUTES_DIR}/${minute_id}"

    log_info "Generating session summary..."

    cat > "${session_dir}/SESSION_SUMMARY.md" << EOF
# 📋 Session ${minute_id} - ${session_title}

## 🎯 Session Overview
**Created**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**Status**: 🟢 **READY FOR SETUP**
**Templates**: ✅ All templates copied and populated
**Next Steps**: Configure proposals and voting parameters

## 📁 Directory Contents
\`\`\`
${session_dir}/
├── README.md                    # Session overview (✅ populated)
├── executive_summary.md         # Results summary (✅ populated)
├── final_report.md              # Detailed analysis (✅ populated)
├── final_report.json            # JSON results (✅ populated)
├── results.json                 # Simple results (✅ populated)
├── summary.md                   # Proposal analysis (✅ populated)
├── proposals.json               # ⚠️ NEEDS CONFIGURATION
├── voting_chain.json            # ✅ Initialized
├── voting_results_[timestamp].json  # Raw data template (✅ populated)
├── INSTRUCTIONS.md              # ⚠️ REVIEW AND UPDATE
└── votes/                       # Directory for individual votes
\`\`\`

## 🔧 Required Setup Steps

### 1. Configure Proposals
Edit \`proposals.json\` to include:
- Actual proposal IDs and titles
- Author information
- Detailed descriptions
- Strategic impact assessments
- Effort estimates and dependencies

### 2. Update Instructions
Review and update \`INSTRUCTIONS.md\`:
- Verify voting procedures are current
- Update any session-specific rules
- Confirm threshold requirements

### 3. Set Voting Parameters
Update voting parameters in relevant files:
- Voting deadline (if applicable)
- Special thresholds for categories
- Participation requirements

### 4. Initialize Voting
Once ready to open voting:
- Announce session to participants
- Distribute voting instructions
- Begin collecting votes

## 📊 Session Tracking
- **Total Models Expected**: [UPDATE_WITH_ACTUAL_COUNT]
- **Approval Threshold**: 70%
- **Special Thresholds**: [UPDATE_IF_ANY]
- **Expected Completion**: [UPDATE_WITH_DEADLINE]

## 📞 Support
For questions about this session setup:
- **Template Usage**: See \`../templates/README_TEMPLATES.md\`
- **Previous Sessions**: Reference minutes/0004/ for examples
- **Technical Issues**: Check ../scripts/validate_schema.py

---
**Session Created**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**Setup Script**: $0
**Template Version**: 1.0
EOF

    log_success "Session summary generated: SESSION_SUMMARY.md"
}

# Main function
main() {
    local minute_id="$1"
    local session_title="$2"

    log_info "Minutes Session Creation Script"
    log_info "================================"

    # Validate input
    validate_args "$minute_id" "$session_title"

    # Check prerequisites
    check_templates

    # Create session
    create_session "$minute_id" "$session_title"

    # Populate templates
    populate_templates "$minute_id" "$session_title"

    # Create additional files
    create_proposals_template "$minute_id" "$session_title"

    # Generate summary
    generate_summary "$minute_id" "$session_title"

    log_success ""
    log_success "🎉 Session ${minute_id} created successfully!"
    log_success ""
    log_success "Next steps:"
    log_success "1. Review and configure: gov/minutes/${minute_id}/proposals.json"
    log_success "2. Update instructions: gov/minutes/${minute_id}/INSTRUCTIONS.md"
    log_success "3. Check summary: gov/minutes/${minute_id}/SESSION_SUMMARY.md"
    log_success "4. Ready to announce voting session!"
    log_success ""
    log_success "Session directory: gov/minutes/${minute_id}/"
}

# Run main function with all arguments
if [[ $# -ne 2 ]]; then
    usage
    exit 1
fi

main "$@"
