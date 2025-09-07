#!/bin/bash

# Branch Creation Script
# Creates implementation branch for approved BIPs

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
    if ! command -v gh &> /dev/null; then
        log_error "GitHub CLI (gh) is required but not installed."
        exit 1
    fi
}

# Validate BIP exists and is approved
validate_bip() {
    local bip_number="$1"

    local bip_file="${PROJECT_ROOT}/bips/approved/BIP-${bip_number}.md"

    if [[ ! -f "$bip_file" ]]; then
        log_error "Approved BIP file not found: $bip_file"
        log_info "Make sure BIP-$bip_number has been approved and moved to bips/approved/"
        return 1
    fi

    log_success "Found approved BIP-$bip_number"
    echo "$bip_file"
}

# Extract BIP information
extract_bip_info() {
    local bip_file="$1"

    local title
    local author
    local type
    local category

    title=$(grep "^\*\*Title:\*\*" "$bip_file" | sed 's/.*Title: \(.*\)/\1/' | tr -d '\n\r')
    author=$(grep "^\*\*Author:\*\*" "$bip_file" | sed 's/.*Author: \(.*\)/\1/' | tr -d '\n\r')
    type=$(grep "^\*\*Type:\*\*" "$bip_file" | sed 's/.*Type: \(.*\)/\1/' | tr -d '\n\r')
    category=$(grep "^\*\*Category:\*\*" "$bip_file" | sed 's/.*Category: \(.*\)/\1/' | tr -d '\n\r')

    # Create info JSON
    jq -n \
        --arg title "$title" \
        --arg author "$author" \
        --arg type "$type" \
        --arg category "$category" \
        '{
            title: $title,
            author: $author,
            type: $type,
            category: $category
        }'
}

# Create branch name
create_branch_name() {
    local bip_number="$1"
    local bip_info="$2"

    local title
    title=$(echo "$bip_info" | jq -r '.title')

    # Clean title for branch name
    local clean_title
    clean_title=$(echo "$title" | \
        tr '[:upper:]' '[:lower:]' | \
        sed 's/[^a-z0-9]/-/g' | \
        sed 's/--*/-/g' | \
        sed 's/^-//' | \
        sed 's/-$//' | \
        cut -c1-50)

    local branch_name="feature/bip-${bip_number}-${clean_title}"

    # Ensure branch name is not too long
    if [[ ${#branch_name} -gt 100 ]]; then
        branch_name="${branch_name:0:100}"
    fi

    echo "$branch_name"
}

# Create implementation directory structure
create_implementation_structure() {
    local bip_number="$1"
    local branch_name="$2"
    local bip_info="$3"

    log_info "Creating implementation structure for BIP-$bip_number"

    local impl_dir="${PROJECT_ROOT}/bips/implementations/BIP-${bip_number}"
    mkdir -p "$impl_dir"

    # Create implementation plan
    local impl_plan="${impl_dir}/IMPLEMENTATION_PLAN.md"
    local title
    local author
    local type
    local category

    title=$(echo "$bip_info" | jq -r '.title')
    author=$(echo "$bip_info" | jq -r '.author')
    type=$(echo "$bip_info" | jq -r '.type')
    category=$(echo "$bip_info" | jq -r '.category')

    cat > "$impl_plan" << EOF
# BIP-$bip_number Implementation Plan

## Overview
**Title**: $title
**Author**: $author
**Type**: $type
**Category**: $category
**Branch**: $branch_name
**Created**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")

## Implementation Status
- [ ] Phase 1: Setup and Planning
- [ ] Phase 2: Core Implementation
- [ ] Phase 3: Testing and Validation
- [ ] Phase 4: Documentation and Deployment

## Tasks
- [ ] Task 1: [Description]
- [ ] Task 2: [Description]
- [ ] Task 3: [Description]

## Timeline
- **Week 1**: [Milestones]
- **Week 2**: [Milestones]
- **Week 3**: [Milestones]

## Success Criteria
- [ ] All tests pass
- [ ] Documentation updated
- [ ] Performance benchmarks met
- [ ] Security review completed

## Related Files
- Original BIP: \`bips/approved/BIP-$bip_number.md\`
- Implementation Branch: \`$branch_name\`
- GitHub Issue: [Link to be added]

---
*Auto-generated implementation plan for BIP-$bip_number*
EOF

    # Create basic implementation files based on category
    case "$category" in
        "Core")
            create_core_implementation "$impl_dir" "$bip_number"
            ;;
        "Process")
            create_process_implementation "$impl_dir" "$bip_number"
            ;;
        "Interface")
            create_interface_implementation "$impl_dir" "$bip_number"
            ;;
        *)
            create_generic_implementation "$impl_dir" "$bip_number"
            ;;
    esac

    log_success "Implementation structure created: $impl_dir"
}

# Create core implementation template
create_core_implementation() {
    local impl_dir="$1"
    local bip_number="$2"

    cat > "${impl_dir}/core_implementation.py" << 'EOF'
"""
BIP-{bip_number} Core Implementation

This module implements the core functionality described in BIP-{bip_number}.
"""

class BIP{bip_number}Implementation:
    """Main implementation class for BIP-{bip_number}"""

    def __init__(self):
        self.version = "1.0.0"
        self.bip_number = "{bip_number}"

    def initialize(self):
        """Initialize the implementation"""
        pass

    def execute(self):
        """Execute the main functionality"""
        pass

    def cleanup(self):
        """Clean up resources"""
        pass

# TODO: Implement core functionality as described in BIP-{bip_number}
EOF

    sed -i "s/{bip_number}/$bip_number/g" "${impl_dir}/core_implementation.py"
}

# Create process implementation template
create_process_implementation() {
    local impl_dir="$1"
    local bip_number="$2"

    cat > "${impl_dir}/process_implementation.sh" << 'EOF'
#!/bin/bash

# BIP-{bip_number} Process Implementation
# Implements the process changes described in BIP-{bip_number}

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

main() {
    echo "BIP-{bip_number} Process Implementation"
    echo "=================================="

    # TODO: Implement process changes as described in BIP-{bip_number}

    echo "Process implementation completed successfully"
}

# Run main function
main "$@"
EOF

    sed -i "s/{bip_number}/$bip_number/g" "${impl_dir}/process_implementation.sh"
    chmod +x "${impl_dir}/process_implementation.sh"
}

# Create interface implementation template
create_interface_implementation() {
    local impl_dir="$1"
    local bip_number="$2"

    cat > "${impl_dir}/interface_implementation.md" << 'EOF'
# BIP-{bip_number} Interface Implementation

## Overview
This document outlines the interface changes implemented for BIP-{bip_number}.

## API Changes

### New Endpoints
- `GET /api/v1/bip/{bip_number}` - Retrieve BIP information
- `POST /api/v1/bip/{bip_number}/vote` - Submit vote for BIP

### Modified Endpoints
- `GET /api/v1/bips` - Now includes voting status

## Data Structures

### Vote Structure
```json
{
  "bip_number": "012",
  "voter": "model_name",
  "decision": "YES|NO",
  "weight": 1.0,
  "rationale": "Brief justification"
}
```

### Consensus Result
```json
{
  "bip_number": "012",
  "approved": true,
  "approval_ratio": 0.75,
  "total_votes": 8,
  "quorum_met": true
}
```

## Frontend Changes
- Added voting interface components
- Updated BIP display with voting status
- Added real-time vote updates

---
*Auto-generated interface documentation for BIP-{bip_number}*
EOF

    sed -i "s/{bip_number}/$bip_number/g" "${impl_dir}/interface_implementation.md"
}

# Create generic implementation template
create_generic_implementation() {
    local impl_dir="$1"
    local bip_number="$2"

    cat > "${impl_dir}/implementation_notes.md" << 'EOF'
# BIP-{bip_number} Implementation Notes

## Overview
This document contains notes and guidelines for implementing BIP-{bip_number}.

## Implementation Checklist
- [ ] Understand BIP requirements
- [ ] Design implementation approach
- [ ] Create necessary files
- [ ] Implement core functionality
- [ ] Add tests
- [ ] Update documentation
- [ ] Create pull request

## Key Considerations
1. **Backward Compatibility**: Ensure all changes maintain backward compatibility
2. **Performance**: Monitor and optimize performance impact
3. **Security**: Implement security best practices
4. **Testing**: Comprehensive test coverage required

## Files to Create/Modify
- [ ] Core implementation files
- [ ] Test files
- [ ] Documentation updates
- [ ] Configuration changes

## Testing Strategy
- Unit tests for new functionality
- Integration tests for system interaction
- Performance tests for scalability
- Security tests for vulnerability assessment

---
*Auto-generated implementation notes for BIP-{bip_number}*
EOF

    sed -i "s/{bip_number}/$bip_number/g" "${impl_dir}/implementation_notes.md"
}

# Create and push Git branch
create_git_branch() {
    local branch_name="$1"
    local bip_number="$2"
    local bip_info="$3"

    log_info "Creating Git branch: $branch_name"

    # Check if branch already exists
    if git show-ref --verify --quiet "refs/heads/$branch_name"; then
        log_warning "Branch $branch_name already exists"
        return 0
    fi

    # Create and switch to new branch
    git checkout -b "$branch_name"

    # Copy BIP to branch
    local bip_file="${PROJECT_ROOT}/bips/approved/BIP-${bip_number}.md"
    local branch_bip_file="${PROJECT_ROOT}/docs/proposals/BIP-${bip_number}.md"
    mkdir -p "${PROJECT_ROOT}/docs/proposals"
    cp "$bip_file" "$branch_bip_file"

    # Create implementation plan in branch
    local impl_plan="${PROJECT_ROOT}/bips/implementations/BIP-${bip_number}/IMPLEMENTATION_PLAN.md"
    local branch_impl_plan="${PROJECT_ROOT}/docs/proposals/BIP-${bip_number}-implementation.md"
    cp "$impl_plan" "$branch_impl_plan"

    # Add and commit files
    git add .
    git commit -m "feat: Initialize BIP-$bip_number implementation branch

BIP-$bip_number: $(echo "$bip_info" | jq -r '.title')
Author: $(echo "$bip_info" | jq -r '.author')
Type: $(echo "$bip_info" | jq -r '.type')

This branch contains the initial implementation framework for the
BIP-$bip_number proposal as approved by the automated voting system.

Implementation files and documentation have been initialized.
Next steps:
1. Review implementation plan in docs/proposals/
2. Begin core implementation development
3. Add comprehensive tests
4. Update documentation

Auto-generated by create_branch.sh"

    # Push branch to remote
    if git remote get-url origin &>/dev/null; then
        git push -u origin "$branch_name"
        log_success "Branch pushed to remote: $branch_name"
    else
        log_warning "No remote repository configured"
    fi

    log_success "Branch created successfully: $branch_name"
}

# Create GitHub pull request template
create_pr_template() {
    local branch_name="$1"
    local bip_number="$2"
    local bip_info="$3"

    log_info "Creating pull request template for BIP-$bip_number"

    local pr_template="${PROJECT_ROOT}/.github/PULL_REQUEST_TEMPLATE/BIP-${bip_number}.md"

    mkdir -p "${PROJECT_ROOT}/.github/PULL_REQUEST_TEMPLATE"

    cat > "$pr_template" << EOF
## 🤖 BIP-$bip_number Implementation

**Title**: $(echo "$bip_info" | jq -r '.title')
**Author**: $(echo "$bip_info" | jq -r '.author')
**Type**: $(echo "$bip_info" | jq -r '.type')
**Category**: $(echo "$bip_info" | jq -r '.category')

### 📋 Implementation Summary
[Brief description of what was implemented]

### ✅ Completed Tasks
- [x] Core functionality implemented
- [x] Tests added
- [x] Documentation updated
- [x] Backward compatibility maintained

### 🧪 Testing
- [x] Unit tests passing
- [x] Integration tests passing
- [x] Performance tests completed
- [x] Security review completed

### 📚 Documentation
- [x] Implementation documentation added
- [x] API documentation updated
- [x] User guide updated

### 🔗 Related Issues
- Closes #[GitHub Issue Number]
- Implements [BIP-$bip_number](docs/proposals/BIP-$bip_number.md)

### 🚀 Deployment Notes
[Any special deployment considerations]

---
*This PR implements BIP-$bip_number as approved by the automated voting system*
EOF

    log_success "PR template created: $pr_template"
}

# Main function
main() {
    local bip_number="$1"

    if [[ $# -ne 1 ]]; then
        echo "Usage: $0 <bip_number>"
        echo "Example: $0 012"
        exit 1
    fi

    log_info "Starting branch creation for BIP-$bip_number"

    # Check dependencies
    check_dependencies

    # Validate BIP
    local bip_file
    bip_file=$(validate_bip "$bip_number")
    if [[ $? -ne 0 ]]; then
        exit 1
    fi

    # Extract BIP information
    local bip_info
    bip_info=$(extract_bip_info "$bip_file")

    log_info "BIP Info: $(echo "$bip_info" | jq -c .)"

    # Create branch name
    local branch_name
    branch_name=$(create_branch_name "$bip_number" "$bip_info")

    log_info "Branch name: $branch_name"

    # Create implementation structure
    create_implementation_structure "$bip_number" "$branch_name" "$bip_info"
    if [[ $? -ne 0 ]]; then
        exit 1
    fi

    # Create Git branch
    create_git_branch "$branch_name" "$bip_number" "$bip_info"
    if [[ $? -ne 0 ]]; then
        exit 1
    fi

    # Create PR template
    create_pr_template "$branch_name" "$bip_number" "$bip_info"
    if [[ $? -ne 0 ]]; then
        exit 1
    fi

    log_success "BIP-$bip_number implementation branch created successfully!"
    log_info "Branch: $branch_name"
    log_info "Implementation directory: bips/implementations/BIP-$bip_number/"
    log_info "Next: Start implementing the core functionality"
    log_info "When ready, create a PR using the generated template"
}

# Run main function with all arguments
main "$@"
