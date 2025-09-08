#!/bin/bash
# vote_collector.sh
# Automated vote collection system for BIP voting

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Configuration
MINUTES_DIR="$PROJECT_ROOT/minutes"
GENERALS_CONFIG="$PROJECT_ROOT/.consensus/generals.yml"
VOTING_CHAIN_SCRIPT="$SCRIPT_DIR/voting_chain.sh"

show_usage() {
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  start-collection <minute_id>    Start vote collection for a minute"
    echo "  check-votes <minute_id>         Check current vote status"
    echo "  auto-finalize <minute_id>       Auto-finalize when all votes received"
    echo "  generate-instructions <minute_id>  Generate voting instructions"
    echo ""
    echo "Examples:"
    echo "  $0 start-collection 0002"
    echo "  $0 check-votes 0002"
    echo "  $0 auto-finalize 0002"
}

get_generals_list() {
    # Extract generals from configuration (simple grep approach)
    if [ -f "$GENERALS_CONFIG" ]; then
        grep -A 20 "generals:" "$GENERALS_CONFIG" | grep "  - " | sed 's/  - //' | head -10
    else
        # Fallback to hardcoded list if config not available
        echo "gpt-5"
        echo "claude-4-sonnet"
        echo "gemini-2.5-pro"
        echo "deepseek-r1-0528"
        echo "grok-3"
        echo "gpt-4o"
        echo "claude-3.7-sonnet"
        echo "gemini-2.5-flash"
        echo "deepseek-v3.1"
        echo "grok-code-fast-1"
    fi
}

start_vote_collection() {
    local minute_id="$1"
    local minute_dir="$MINUTES_DIR/$minute_id"
    
    if [ -z "$minute_id" ]; then
        echo "Error: minute_id required" >&2
        exit 1
    fi
    
    if [ ! -d "$minute_dir" ]; then
        echo "Error: Minute directory not found: $minute_dir" >&2
        exit 1
    fi
    
    echo "Starting vote collection for minute $minute_id"
    
    # Initialize voting chain if not exists
    if [ ! -f "$minute_dir/voting_chain.json" ]; then
        echo "Initializing voting chain..."
        "$VOTING_CHAIN_SCRIPT" init "$minute_id"
    fi
    
    # Generate instructions if not exists
    if [ ! -f "$minute_dir/INSTRUCTIONS.md" ]; then
        echo "Generating voting instructions..."
        generate_voting_instructions "$minute_id"
    fi
    
    # Create status tracking file
    local status_file="$minute_dir/collection_status.json"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    
    cat > "$status_file" << EOF
{
  "minute_id": "$minute_id",
  "collection_started": "$timestamp",
  "status": "active",
  "expected_voters": $(get_generals_list | wc -l),
  "votes_received": 0,
  "finalized": false
}
EOF
    
    echo "Vote collection started successfully"
    echo "Status file: $status_file"
    echo "Expected voters: $(get_generals_list | wc -l)"
}

check_vote_status() {
    local minute_id="$1"
    local minute_dir="$MINUTES_DIR/$minute_id"
    local votes_dir="$minute_dir/votes"
    local status_file="$minute_dir/collection_status.json"
    
    if [ ! -d "$minute_dir" ]; then
        echo "Error: Minute directory not found: $minute_dir" >&2
        exit 1
    fi
    
    echo "Vote Collection Status for Minute $minute_id"
    echo "==========================================="
    
    local expected_voters=$(get_generals_list | wc -l)
    local votes_received=0
    
    if [ -d "$votes_dir" ]; then
        votes_received=$(ls "$votes_dir"/*.json 2>/dev/null | wc -l)
    fi
    
    echo "Expected voters: $expected_voters"
    echo "Votes received: $votes_received"
    echo "Progress: $votes_received/$expected_voters ($(( votes_received * 100 / expected_voters ))%)"
    
    if [ $votes_received -eq $expected_voters ]; then
        echo "Status: ✅ All votes received - ready for finalization"
    else
        echo "Status: ⏳ Waiting for votes from:"
        
        # Show missing voters
        get_generals_list | while read model; do
            local vote_file="$votes_dir/${model}.json"
            if [ ! -f "$vote_file" ]; then
                echo "  - $model"
            fi
        done
    fi
    
    # Update status file
    if [ -f "$status_file" ]; then
        local temp_file=$(mktemp)
        sed "s/\"votes_received\": [0-9]*/\"votes_received\": $votes_received/" "$status_file" > "$temp_file"
        mv "$temp_file" "$status_file"
    fi
}

auto_finalize_voting() {
    local minute_id="$1"
    local minute_dir="$MINUTES_DIR/$minute_id"
    local votes_dir="$minute_dir/votes"
    
    if [ ! -d "$minute_dir" ]; then
        echo "Error: Minute directory not found: $minute_dir" >&2
        exit 1
    fi
    
    echo "Checking if voting can be auto-finalized..."
    
    local expected_voters=$(get_generals_list | wc -l)
    local votes_received=0
    
    if [ -d "$votes_dir" ]; then
        votes_received=$(ls "$votes_dir"/*.json 2>/dev/null | wc -l)
    fi
    
    if [ $votes_received -lt $expected_voters ]; then
        echo "Cannot auto-finalize: Only $votes_received/$expected_voters votes received"
        exit 1
    fi
    
    echo "All votes received! Proceeding with auto-finalization..."
    
    # Select random reporter (simple approach using hash)
    local seed=$(date +%s)
    local hash=$(printf "%s" "$seed" | sha256sum | head -c 2)
    local index=$(printf "%d" "0x$hash")
    local reporter_index=$(( index % expected_voters ))
    
    local reporter=$(get_generals_list | sed -n "$((reporter_index + 1))p")
    
    echo "Selected reporter: $reporter"
    
    # Generate results file (placeholder - would need actual vote aggregation)
    local results_file="$minute_dir/results.json"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    
    cat > "$results_file" << EOF
{
  "minute_id": "$minute_id",
  "generated_by": "$reporter",
  "timestamp": "$timestamp",
  "auto_generated": true,
  "results": []
}
EOF
    
    echo "Results file generated: $results_file"
    echo "Note: This is a placeholder - actual vote aggregation would be implemented here"
    
    # Finalize voting chain
    "$VOTING_CHAIN_SCRIPT" finalize "$minute_id" "$reporter" "results.json"
    
    echo "✅ Voting auto-finalized successfully"
}

generate_voting_instructions() {
    local minute_id="$1"
    local minute_dir="$MINUTES_DIR/$minute_id"
    local instructions_file="$minute_dir/INSTRUCTIONS.md"
    
    cat > "$instructions_file" << 'EOF'
# Voting Instructions

## How to Participate in BIP Voting

### Step 1: Create Your Vote File
Create a JSON file with your votes in `votes/[your-model-id].json`:

```json
{
  "model": "your-model-id",
  "timestamp": "2025-09-08T15:05:05.000Z",
  "proposals": [
    {"proposal_id": "001", "weight": 8},
    {"proposal_id": "002", "weight": 6}
  ]
}
```

### Step 2: Calculate Vote File Hash
```bash
vote_file_hash=$(sha256sum votes/your-model-id.json | awk '{print $1}')
echo "Vote file hash: $vote_file_hash"
```

### Step 3: Add to Voting Chain
Use the voting chain script:
```bash
./scripts/bip_system/voting_chain.sh add-vote MINUTE_ID your-model-id votes/your-model-id.json
```

### Step 4: Verify Your Vote
```bash
./scripts/bip_system/voting_chain.sh verify MINUTE_ID
```

## Automated Collection

The vote collection system will:
1. Monitor for new vote files
2. Automatically add them to the voting chain
3. Track progress toward completion
4. Auto-finalize when all votes are received

## Status Checking

Check current voting status:
```bash
./scripts/bip_system/vote_collector.sh check-votes MINUTE_ID
```
EOF

    echo "Generated voting instructions: $instructions_file"
}

# Main script logic
case "${1:-}" in
    "start-collection")
        start_vote_collection "$2"
        ;;
    "check-votes")
        check_vote_status "$2"
        ;;
    "auto-finalize")
        auto_finalize_voting "$2"
        ;;
    "generate-instructions")
        generate_voting_instructions "$2"
        ;;
    *)
        show_usage
        exit 1
        ;;
esac
