#!/usr/bin/env bash
set -euo pipefail

# Requirements: gh CLI authenticated, git configured with push rights.

REPO="${REPO:-}"
BASE="${BASE:-main}"
BRANCH="${BRANCH:-llm-hive-consensus}"
TITLE="${TITLE:-LLM Hive: add consensus gate + templates}"
BODY="${BODY:-This PR adds the minimal consensus gate, PR template and CODEOWNERS example.}"

if [[ -z "$REPO" ]]; then
  echo "Set REPO=owner/name"; exit 1
fi

git checkout -b "$BRANCH" || git checkout "$BRANCH"
git add -A
git commit -m "feat: LLM Hive consensus gate (MVP)" || echo "Nothing to commit (maybe already committed)."
git push -u origin "$BRANCH" || true
gh pr create --repo "$REPO" --base "$BASE" --head "$BRANCH" --title "$TITLE" --body "$BODY" || true
echo "PR attempted for $REPO from $BRANCH -> $BASE"
