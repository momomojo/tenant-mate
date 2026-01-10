#!/bin/bash
# Stop Guard Check Script
# Reads the stop-guard.md file and checks if all tasks are completed
# Returns JSON for Claude Code hook system

set -euo pipefail

GUARD_FILE="/Users/momomojo/Documents/tenant-mate/.claude/hooks/stop-guard.md"

# Read the input (contains stop context from Claude)
input=$(cat)
stop_reason=$(echo "$input" | jq -r '.reason // "unknown"' 2>/dev/null || echo "unknown")

# Check if the guard file exists
if [ ! -f "$GUARD_FILE" ]; then
    # File doesn't exist - allow stopping but warn
    echo '{"decision": "approve", "reason": "stop-guard.md not found - allowing stop", "systemMessage": "Warning: stop-guard.md file not found at '"$GUARD_FILE"'"}'
    exit 0
fi

# Check if user explicitly wants to stop
if echo "$stop_reason" | grep -qi -E "(stop working|that's enough|please stop|stop now|done for now)"; then
    echo '{"decision": "approve", "reason": "User explicitly requested stop", "systemMessage": "Stopping as requested by user."}'
    exit 0
fi

# Count unchecked items ([ ])
unchecked_count=$(grep -c '\[ \]' "$GUARD_FILE" 2>/dev/null || echo "0")

# Count checked items ([x] or [X])
checked_count=$(grep -ci '\[x\]' "$GUARD_FILE" 2>/dev/null || echo "0")

# Get list of unchecked items (first 5 for context)
unchecked_items=$(grep '\[ \]' "$GUARD_FILE" 2>/dev/null | head -5 | sed 's/- \[ \] //' | tr '\n' '; ' || echo "none")

if [ "$unchecked_count" -eq 0 ]; then
    # All items checked - allow stopping
    echo '{"decision": "approve", "reason": "All '"$checked_count"' items in stop-guard.md are completed", "systemMessage": "All tasks verified complete. Safe to stop."}'
    exit 0
else
    # Items remain unchecked - block stopping
    cat <<EOF
{"decision": "block", "reason": "$unchecked_count unchecked items remain in stop-guard.md. First few: $unchecked_items", "systemMessage": "Stop blocked: $unchecked_count tasks still pending. Continue working on: $unchecked_items To override, user must explicitly say 'stop working' or 'that is enough'."}
EOF
    exit 0
fi
