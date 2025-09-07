#!/usr/bin/env bash
set -euo pipefail

# =================================================================================
# 🤖 LLM HIVE - SETUP SCRIPT
# =================================================================================
# This script sets up the LLM Consensus Gate in your repository
#
# Usage:
#   ./scripts/setup.sh [OPTIONS]
#
# Examples:
#   ./scripts/setup.sh --repo "myorg/myrepo"
#   ./scripts/setup.sh --dry-run
#   ./scripts/setup.sh --help
#
# =================================================================================

# ============================================================================
# CONFIGURATION
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Default values
REPO="${REPO:-}"
DRY_RUN="${DRY_RUN:-false}"
VERBOSE="${VERBOSE:-false}"
FORCE="${FORCE:-false}"
SKIP_VALIDATION="${SKIP_VALIDATION:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_header() {
    echo -e "${PURPLE}================================================================================${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}================================================================================${NC}"
}

log_step() {
    echo -e "${CYAN}🔸 $1${NC}"
}

show_help() {
    cat << EOF
🤖 LLM Hive Setup Script

USAGE:
    $0 [OPTIONS]

OPTIONS:
    -r, --repo REPO       Target repository (owner/repo)
    -d, --dry-run         Show what would be done without executing
    -v, --verbose         Enable verbose output
    -f, --force           Skip confirmation prompts
    -s, --skip-validation Skip validation checks
    -h, --help           Show this help message

ENVIRONMENT VARIABLES:
    REPO                  Target repository
    DRY_RUN              Set to 'true' for dry run
    VERBOSE              Set to 'true' for verbose output
    FORCE                Set to 'true' to skip prompts
    SKIP_VALIDATION      Set to 'true' to skip validation

EXAMPLES:
    # Interactive setup
    $0

    # Setup specific repository
    $0 --repo "myorg/myrepo"

    # Dry run to see what would happen
    $0 --dry-run --repo "myorg/myrepo"

    # Force setup without prompts
    $0 --force --repo "myorg/myrepo"

FILES CREATED:
    .consensus/config.json          # Main configuration
    .consensus/generals.txt         # List of LLM bots
    .github/workflows/consensus.yml # Consensus workflow
    .github/pull_request_template.md # PR template
    CODEOWNERS                      # Ownership rules
    scripts/create_pr.sh            # PR creation script

EOF
}

# ============================================================================
# VALIDATION FUNCTIONS
# ============================================================================

validate_requirements() {
    log_step "Validating requirements..."

    local missing_tools=()

    # Check if gh CLI is installed
    if ! command -v gh &> /dev/null; then
        missing_tools+=("GitHub CLI (gh)")
    fi

    # Check if git is installed
    if ! command -v git &> /dev/null; then
        missing_tools+=("Git")
    fi

    # Check if we're in a git repository
    if ! git rev-parse --git-dir &> /dev/null 2>&1; then
        log_error "Not in a git repository"
        log_info "Please run this script from inside a git repository"
        exit 1
    fi

    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        log_error "Missing required tools:"
        for tool in "${missing_tools[@]}"; do
            echo "  - $tool"
        done
        log_info "Please install the missing tools and try again"
        exit 1
    fi

    log_success "Requirements validation passed"
}

validate_repository() {
    if [[ -z "$REPO" ]]; then
        return 0
    fi

    log_step "Validating repository access..."

    if ! gh repo view "$REPO" &> /dev/null; then
        log_error "Cannot access repository: $REPO"
        log_info "Make sure the repository exists and you have access"
        exit 1
    fi

    log_success "Repository access validated"
}

# ============================================================================
# FILE OPERATIONS
# ============================================================================

create_directory_structure() {
    log_step "Creating directory structure..."

    local directories=(
        ".consensus"
        ".github/workflows"
        "scripts"
    )

    for dir in "${directories[@]}"; do
        if [[ ! -d "$dir" ]]; then
            if [[ "$DRY_RUN" == "true" ]]; then
                log_info "Would create directory: $dir"
            else
                mkdir -p "$dir"
                log_success "Created directory: $dir"
            fi
        else
            log_info "Directory already exists: $dir"
        fi
    done
}

copy_configuration_files() {
    log_step "Copying configuration files..."

    local files_to_copy=(
        ".consensus/config.json"
        ".consensus/generals.txt"
        ".consensus/README.md"
        ".github/workflows/consensus.yml"
        ".github/workflows/tests.yml"
        ".github/pull_request_template.md"
        "CODEOWNERS"
        "scripts/create_pr.sh"
        "README.md"
    )

    for file in "${files_to_copy[@]}"; do
        local source_file="$PROJECT_ROOT/$file"
        local target_file="$file"

        if [[ ! -f "$source_file" ]]; then
            log_warning "Source file not found: $source_file"
            continue
        fi

        if [[ -f "$target_file" && "$FORCE" != "true" ]]; then
            if [[ "$DRY_RUN" == "true" ]]; then
                log_info "Would backup and replace: $target_file"
            else
                read -p "File '$target_file' already exists. Replace? (y/N): " -r
                if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                    log_info "Skipping: $target_file"
                    continue
                fi
            fi
        fi

        if [[ "$DRY_RUN" == "true" ]]; then
            log_info "Would copy: $source_file -> $target_file"
        else
            cp "$source_file" "$target_file"
            log_success "Copied: $target_file"
        fi
    done
}

# ============================================================================
# CONFIGURATION CUSTOMIZATION
# ============================================================================

customize_configuration() {
    log_step "Customizing configuration..."

    # Customize generals.txt with repository-specific info
    if [[ -f ".consensus/generals.txt" && -n "$REPO" ]]; then
        local repo_name
        repo_name=$(basename "$REPO")

        if [[ "$DRY_RUN" == "true" ]]; then
            log_info "Would customize generals.txt for repository: $repo_name"
        else
            # Add repository-specific comment to generals.txt
            sed -i "1i# Generals configuration for: $REPO" .consensus/generals.txt
            log_success "Customized generals.txt for: $repo_name"
        fi
    fi

    # Update workflow file with repository info if available
    if [[ -f ".github/workflows/consensus.yml" && -n "$REPO" ]]; then
        if [[ "$DRY_RUN" == "true" ]]; then
            log_info "Would update workflow with repository info: $REPO"
        else
            # The workflow file is generic enough to work without customization
            log_success "Workflow ready for repository: $REPO"
        fi
    fi
}

# ============================================================================
# VERIFICATION
# ============================================================================

verify_setup() {
    log_step "Verifying setup..."

    local required_files=(
        ".consensus/config.json"
        ".consensus/generals.txt"
        ".github/workflows/consensus.yml"
        ".github/pull_request_template.md"
        "CODEOWNERS"
    )

    local missing_files=()

    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            missing_files+=("$file")
        fi
    done

    if [[ ${#missing_files[@]} -gt 0 ]]; then
        log_error "Setup verification failed. Missing files:"
        for file in "${missing_files[@]}"; do
            echo "  - $file"
        done
        return 1
    fi

    # Validate JSON syntax
    if command -v jq &> /dev/null; then
        if ! jq empty .consensus/config.json 2>/dev/null; then
            log_error "Invalid JSON in config.json"
            return 1
        fi
    fi

    log_success "Setup verification passed"
    return 0
}

# ============================================================================
# POST-SETUP INSTRUCTIONS
# ============================================================================

show_next_steps() {
    log_header "🎉 SETUP COMPLETE!"
    echo
    log_info "Next steps to complete the LLM Consensus Gate setup:"
    echo

    if [[ -n "$REPO" ]]; then
        echo "1. 📝 Review and update the configuration files:"
        echo "   - .consensus/generals.txt (add your LLM bot accounts)"
        echo "   - .consensus/config.json (adjust thresholds if needed)"
        echo
        echo "2. 🤖 Configure bot accounts:"
        echo "   - Create or configure LLM bot accounts on GitHub"
        echo "   - Add them as collaborators to: $REPO"
        echo "   - Update .consensus/generals.txt with their usernames"
        echo
        echo "3. 🛡️ Set up branch protection:"
        echo "   - Go to repository Settings → Branches"
        echo "   - Add rule for 'main' branch"
        echo "   - Enable 'Require status checks to pass'"
        echo "   - Add 'Consensus Gate' as required check"
        echo
        echo "4. 🧪 Test the setup:"
        echo "   ./scripts/create_pr.sh --repo \"$REPO\" --dry-run"
        echo
        echo "5. 🚀 Create your first PR:"
        echo "   ./scripts/create_pr.sh --repo \"$REPO\""
        echo
    else
        echo "1. 📝 Review and update the configuration files"
        echo "2. 🤖 Configure your LLM bot accounts"
        echo "3. 🛡️ Set up branch protection rules"
        echo "4. 🧪 Test with a sample PR"
        echo "5. 🚀 Start using the consensus gate!"
        echo
    fi

    echo "📚 For detailed instructions, see:"
    echo "   - README.md (main documentation)"
    echo "   - .consensus/README.md (configuration guide)"
    echo
    echo "🆘 Need help? Check the troubleshooting section in README.md"
    echo
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
            -d|--dry-run)
                DRY_RUN=true
                shift
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -f|--force)
                FORCE=true
                shift
                ;;
            -s|--skip-validation)
                SKIP_VALIDATION=true
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

    # Show banner
    log_header "🤖 LLM HIVE - CONSENSUS GATE SETUP"

    # Show configuration
    if [[ "$VERBOSE" == "true" ]]; then
        log_info "Configuration:"
        echo "  Repository: ${REPO:-Not specified}"
        echo "  Dry run: $DRY_RUN"
        echo "  Verbose: $VERBOSE"
        echo "  Force: $FORCE"
        echo "  Skip validation: $SKIP_VALIDATION"
        echo
    fi

    # Validate requirements
    if [[ "$SKIP_VALIDATION" != "true" ]]; then
        validate_requirements
        validate_repository
    else
        log_warning "Skipping validation checks"
    fi

    # Confirm setup
    if [[ "$FORCE" != "true" && "$DRY_RUN" != "true" ]]; then
        echo
        log_warning "This will set up the LLM Consensus Gate in the current repository."
        read -p "Continue? (y/N): " -r
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Setup cancelled"
            exit 0
        fi
    fi

    # Execute setup steps
    create_directory_structure
    copy_configuration_files
    customize_configuration

    # Verify setup
    if [[ "$SKIP_VALIDATION" != "true" ]]; then
        if verify_setup; then
            show_next_steps
        else
            log_error "Setup completed with errors. Please check the output above."
            exit 1
        fi
    else
        show_next_steps
    fi

    # Final message
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "Dry run completed. No files were modified."
    else
        log_success "🎉 LLM Consensus Gate setup completed successfully!"
    fi
}

# ============================================================================
# SCRIPT ENTRY POINT
# ============================================================================

# Run main function
main "$@"
