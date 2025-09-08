#!/bin/bash

# Initialize vote counts for each proposal
declare -A support_count reject_count

proposals=("P-022" "P-025" "P-026" "P-028" "P-029" "P-030" "P-033" "P-034" "P-035" "P-036" "P-037" "P-038" "P-040" "P-041" "P-045" "P-046" "P-047" "P-049" "P-050")

for proposal in "${proposals[@]}"; do
    support_count[$proposal]=0
    reject_count[$proposal]=0
done

# Process each vote file
for file in votes/*.json; do
    echo "Processing $file"
    # Extract proposal_id and vote pairs
    content=$(cat "$file" | sed 's/.*"proposals": \[//' | sed 's/\].*//' | sed 's/},/}/g' | sed 's/}/}\n/g')
    
    for proposal in "${proposals[@]}"; do
        vote=$(echo "$content" | grep "\"proposal_id\": \"$proposal\"" -A2 | grep '"vote"' | sed 's/.*"vote": "\([^"]*\)".*/\1/')
        if [ "$vote" = "SUPPORT" ]; then
            ((support_count[$proposal]++))
        elif [ "$vote" = "REJECT" ]; then
            ((reject_count[$proposal]++))
        fi
    done
done

# Output results
echo "Proposal,Votes SUPPORT,Votes REJECT,Total Votes"
for proposal in "${proposals[@]}"; do
    total=$((support_count[$proposal] + reject_count[$proposal]))
    echo "$proposal,${support_count[$proposal]},${reject_count[$proposal]},$total"
done
