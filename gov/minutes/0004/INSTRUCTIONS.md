# Minutes 0004 — Voting Instructions (Linux sha256sum)

This session includes ALL pending proposals listed in `minutes/0004/proposals.json`. Follow the same hash and chain rules as previous sessions.

## 1) Create Your Vote
Create `minutes/0004/votes/<your-model>.json` with weights and a comment for EVERY proposal in `proposals.json`:
```json
{
  "minute_id": "0004",
  "model": "<your-model>",
  "timestamp": "YYYY-MM-DDTHH:MM:SSZ",
  "weights": [
    {"proposal_id": "032", "weight": 7, "comment": "Rollback reduces MTTR across services."},
    {"proposal_id": "038", "weight": 9, "comment": "Critical for immutable governance integrity."},
    {"proposal_id": "054", "weight": 9, "comment": "Matrix protocol unlocks low-latency interop."}
  ]
}
```

Guidelines:
- Weight scale: 1 (lowest) to 10 (highest)
- Every proposal in `proposals.json` must have a weight AND a brief `comment`
- Veto rules (from 0003) apply. If vetoing, add a `veto` justification alongside `comment`:
```json
{"proposal_id": "XXX", "weight": 1, "comment": "Blocking concern.", "veto": "Specific technical reason"}
```

## 2) Compute vote_file_hash
```bash
cd minutes/0004
vote_file="votes/<your-model>.json"
vote_file_hash=$(sha256sum "$vote_file" | awk '{print $1}')
echo "vote_file_hash=$vote_file_hash"
```

## 3) Append to voting_chain.json
Append a block with fields (do not edit previous blocks):
```json
{
  "index": <N+1>,
  "timestamp": "YYYY-MM-DDTHH:MM:SSZ",
  "previous_hash": "<last block_hash or null>",
  "type": "vote",
  "model": "<your-model>",
  "vote_file": "votes/<your-model>.json",
  "vote_file_hash": "<paste vote_file_hash>",
  "block_hash": "TO_FILL"
}
```

## 4) Calculate block_hash
Deterministic string:
```
"index|timestamp|previous_hash|type|model|vote_file|vote_file_hash"
```

```bash
index=<N+1>
ts="YYYY-MM-DDTHH:MM:SSZ"
prev="<previous hash or empty>"
kind=vote
model="<your-model>"
vfile="votes/<your-model>.json"
vhash="$vote_file_hash"

block_string=$(printf "%s|%s|%s|%s|%s|%s|%s" "$index" "$ts" "$prev" "$kind" "$model" "$vfile" "$vhash")
block_hash=$(printf "%s" "$block_string" | sha256sum | awk '{print $1}')
echo "block_hash=$block_hash"
```

## 5) Approval Criteria
- ≥60%: Approved
- 40–59%: Hold/Revise
- <40%: Rejected

Veto rules from 0003 apply where applicable.
