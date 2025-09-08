#!/bin/bash
# notification_system.sh
# Notification system for BIP voting process

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Configuration
MINUTES_DIR="$PROJECT_ROOT/minutes"
NOTIFICATIONS_DIR="$PROJECT_ROOT/.notifications"
LOG_FILE="$NOTIFICATIONS_DIR/notifications.log"

show_usage() {
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  init                           Initialize notification system"
    echo "  send <type> <minute_id> <message>  Send notification"
    echo "  list <minute_id>               List notifications for minute"
    echo "  check-pending                  Check for pending notifications"
    echo "  cleanup <days>                 Cleanup old notifications"
    echo ""
    echo "Notification types:"
    echo "  vote-start    - Voting session started"
    echo "  vote-reminder - Reminder to vote"
    echo "  vote-received - Vote received confirmation"
    echo "  vote-complete - All votes received"
    echo "  vote-finalized - Voting finalized"
    echo ""
    echo "Examples:"
    echo "  $0 init"
    echo "  $0 send vote-start 0002 'Voting started for minute 0002'"
    echo "  $0 list 0002"
    echo "  $0 check-pending"
}

get_timestamp() {
    date -u +"%Y-%m-%dT%H:%M:%S.%3NZ"
}

init_notification_system() {
    echo "Initializing notification system..."
    
    # Create notifications directory
    mkdir -p "$NOTIFICATIONS_DIR"
    
    # Create log file if not exists
    if [ ! -f "$LOG_FILE" ]; then
        cat > "$LOG_FILE" << EOF
# BIP Notification System Log
# Format: TIMESTAMP|TYPE|MINUTE_ID|MESSAGE|STATUS
EOF
    fi
    
    # Create status tracking
    local status_file="$NOTIFICATIONS_DIR/system_status.json"
    cat > "$status_file" << EOF
{
  "system": "bip-notification",
  "initialized": "$(get_timestamp)",
  "status": "active",
  "total_notifications": 0,
  "pending_notifications": 0
}
EOF
    
    echo "✅ Notification system initialized"
    echo "Log file: $LOG_FILE"
    echo "Status file: $status_file"
}

send_notification() {
    local type="$1"
    local minute_id="$2"
    local message="$3"
    local timestamp=$(get_timestamp)
    
    if [ -z "$type" ] || [ -z "$minute_id" ] || [ -z "$message" ]; then
        echo "Error: type, minute_id, and message required" >&2
        exit 1
    fi
    
    # Validate notification type
    case "$type" in
        "vote-start"|"vote-reminder"|"vote-received"|"vote-complete"|"vote-finalized")
            ;;
        *)
            echo "Error: Invalid notification type: $type" >&2
            echo "Valid types: vote-start, vote-reminder, vote-received, vote-complete, vote-finalized"
            exit 1
            ;;
    esac
    
    # Create notifications directory if not exists
    mkdir -p "$NOTIFICATIONS_DIR"
    
    # Create minute-specific notification file
    local minute_notifications="$NOTIFICATIONS_DIR/minute_${minute_id}.json"
    if [ ! -f "$minute_notifications" ]; then
        cat > "$minute_notifications" << EOF
{
  "minute_id": "$minute_id",
  "notifications": []
}
EOF
    fi
    
    # Create notification entry
    local notification_id="${minute_id}_${type}_$(date +%s)"
    local notification=$(cat << EOF
    {
      "id": "$notification_id",
      "type": "$type",
      "timestamp": "$timestamp",
      "message": "$message",
      "status": "sent",
      "minute_id": "$minute_id"
    }
EOF
)
    
    # Add to minute notifications (simple append)
    local temp_file=$(mktemp)
    if grep -q '"notifications": \[\]' "$minute_notifications"; then
        # First notification
        sed "s/\"notifications\": \[\]/\"notifications\": [\n$notification\n  ]/" "$minute_notifications" > "$temp_file"
    else
        # Subsequent notifications
        sed "s/\(.*\)\]/\1,\n$notification\n  ]/" "$minute_notifications" > "$temp_file"
    fi
    mv "$temp_file" "$minute_notifications"
    
    # Log notification
    echo "$timestamp|$type|$minute_id|$message|sent" >> "$LOG_FILE"
    
    # Display notification
    echo "📢 Notification Sent"
    echo "=================="
    echo "Type: $type"
    echo "Minute: $minute_id"
    echo "Message: $message"
    echo "Time: $timestamp"
    echo "ID: $notification_id"
    
    # Call specific notification handlers
    case "$type" in
        "vote-start")
            handle_vote_start_notification "$minute_id" "$message"
            ;;
        "vote-reminder")
            handle_vote_reminder_notification "$minute_id" "$message"
            ;;
        "vote-received")
            handle_vote_received_notification "$minute_id" "$message"
            ;;
        "vote-complete")
            handle_vote_complete_notification "$minute_id" "$message"
            ;;
        "vote-finalized")
            handle_vote_finalized_notification "$minute_id" "$message"
            ;;
    esac
}

handle_vote_start_notification() {
    local minute_id="$1"
    local message="$2"
    
    echo "🚀 Vote Start Handler: Sending voting instructions to all generals"
    
    # Create instruction file for this voting session
    local instructions_file="$NOTIFICATIONS_DIR/voting_instructions_${minute_id}.md"
    cat > "$instructions_file" << EOF
# Voting Instructions for Minute $minute_id

## Quick Start
1. Review proposals in: \`minutes/$minute_id/summary.md\`
2. Create your vote file: \`minutes/$minute_id/votes/[your-model].json\`
3. Use voting script: \`./scripts/bip_system/voting_chain.sh add-vote $minute_id [your-model] votes/[your-model].json\`

## Message
$message

Generated: $(get_timestamp)
EOF
    
    echo "Instructions created: $instructions_file"
}

handle_vote_reminder_notification() {
    local minute_id="$1"
    local message="$2"
    
    echo "⏰ Vote Reminder Handler: Checking for missing votes"
    
    # This would integrate with the vote collector to identify missing voters
    if [ -f "$SCRIPT_DIR/vote_collector.sh" ]; then
        "$SCRIPT_DIR/vote_collector.sh" check-votes "$minute_id"
    fi
}

handle_vote_received_notification() {
    local minute_id="$1"
    local message="$2"
    
    echo "✅ Vote Received Handler: Updating progress tracking"
    
    # Update progress and check if we can auto-finalize
    if [ -f "$SCRIPT_DIR/vote_collector.sh" ]; then
        "$SCRIPT_DIR/vote_collector.sh" check-votes "$minute_id"
    fi
}

handle_vote_complete_notification() {
    local minute_id="$1"
    local message="$2"
    
    echo "🎯 Vote Complete Handler: All votes received, ready for finalization"
    
    # Trigger auto-finalization if enabled
    if [ -f "$SCRIPT_DIR/vote_collector.sh" ]; then
        echo "Triggering auto-finalization..."
        "$SCRIPT_DIR/vote_collector.sh" auto-finalize "$minute_id"
    fi
}

handle_vote_finalized_notification() {
    local minute_id="$1"
    local message="$2"
    
    echo "🏁 Vote Finalized Handler: Creating final report"
    
    # Create summary report
    local final_summary="$NOTIFICATIONS_DIR/final_summary_${minute_id}.md"
    cat > "$final_summary" << EOF
# Voting Session Complete - Minute $minute_id

## Status: FINALIZED

$message

## Files Generated
- Voting chain: \`minutes/$minute_id/voting_chain.json\`
- Results: \`minutes/$minute_id/results.json\`
- Final report: \`minutes/$minute_id/final_report.md\`

Finalized: $(get_timestamp)
EOF
    
    echo "Final summary created: $final_summary"
}

list_notifications() {
    local minute_id="$1"
    local minute_notifications="$NOTIFICATIONS_DIR/minute_${minute_id}.json"
    
    if [ ! -f "$minute_notifications" ]; then
        echo "No notifications found for minute $minute_id"
        return
    fi
    
    echo "Notifications for Minute $minute_id"
    echo "================================="
    
    # Simple extraction (in production, would use proper JSON parser)
    grep -o '"type": "[^"]*"' "$minute_notifications" | cut -d'"' -f4 | while read type; do
        echo "📢 $type"
    done
    
    echo ""
    echo "Full details in: $minute_notifications"
}

check_pending_notifications() {
    echo "Checking for pending notifications..."
    
    if [ ! -d "$NOTIFICATIONS_DIR" ]; then
        echo "No notifications directory found"
        return
    fi
    
    local pending_count=0
    
    # Check for notification files
    for notification_file in "$NOTIFICATIONS_DIR"/minute_*.json; do
        if [ -f "$notification_file" ]; then
            local minute_id=$(basename "$notification_file" | sed 's/minute_\(.*\)\.json/\1/')
            echo "Found notifications for minute: $minute_id"
            pending_count=$((pending_count + 1))
        fi
    done
    
    if [ $pending_count -eq 0 ]; then
        echo "✅ No pending notifications"
    else
        echo "📋 Found notifications for $pending_count minutes"
    fi
}

cleanup_old_notifications() {
    local days="${1:-30}"
    
    echo "Cleaning up notifications older than $days days..."
    
    if [ ! -d "$NOTIFICATIONS_DIR" ]; then
        echo "No notifications directory found"
        return
    fi
    
    # Find and remove old files
    find "$NOTIFICATIONS_DIR" -name "minute_*.json" -mtime +$days -delete
    find "$NOTIFICATIONS_DIR" -name "voting_instructions_*.md" -mtime +$days -delete
    find "$NOTIFICATIONS_DIR" -name "final_summary_*.md" -mtime +$days -delete
    
    echo "✅ Cleanup completed"
}

# Initialize notification system if not already done
if [ ! -d "$NOTIFICATIONS_DIR" ] && [ "${1:-}" != "init" ]; then
    echo "Auto-initializing notification system..."
    init_notification_system
fi

# Main script logic
case "${1:-}" in
    "init")
        init_notification_system
        ;;
    "send")
        send_notification "$2" "$3" "$4"
        ;;
    "list")
        list_notifications "$2"
        ;;
    "check-pending")
        check_pending_notifications
        ;;
    "cleanup")
        cleanup_old_notifications "$2"
        ;;
    *)
        show_usage
        exit 1
        ;;
esac
