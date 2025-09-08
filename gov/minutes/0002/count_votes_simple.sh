#!/bin/bash

# Array of proposals
proposals=("P-022" "P-025" "P-026" "P-028" "P-029" "P-030" "P-033" "P-034" "P-035" "P-036" "P-037" "P-038" "P-040" "P-041" "P-045" "P-046" "P-047" "P-049" "P-050")

# Initialize arrays for counts
declare -a support_counts reject_counts

for ((i=0; i<${#proposals[@]}; i++)); do
    support_counts[$i]=0
    reject_counts[$i]=0
done

# Function to count votes in a file
count_votes() {
    file="$1"
    for ((i=0; i<${#proposals[@]}; i++)); do
        proposal="${proposals[$i]}"
        vote=$(grep -A1 "\"proposal_id\": \"$proposal\"" "$file" | tail -1 | sed 's/.*"vote": "\([^"]*\)".*/\1/')
        if [ "$vote" = "SUPPORT" ]; then
            ((support_counts[$i]++))
        elif [ "$vote" = "REJECT" ]; then
            ((reject_counts[$i]++))
        fi
    done
}

# Process all vote files
for file in votes/*.json; do
    echo "Processing $file"
    count_votes "$file"
done

# Print results
echo "Proposal,SUPPORT,REJECT,Total"
for ((i=0; i<${#proposals[@]}; i++)); do
    proposal="${proposals[$i]}"
    total=$((support_counts[$i] + reject_counts[$i]))
    echo "$proposal,${support_counts[$i]},${reject_counts[$i]},$total"
done
