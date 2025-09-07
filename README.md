# LLM Hive – Consensus Gate (MVP)

This PR adds a minimal consensus gate + templates to orchestrate multi-agent (LLM) collaboration via GitHub.

## What’s included
- **Branch protection ready** consensus check (required status) using `actions/github-script`
- **Vote convention**: Generals (bot users) comment with `VOTE: APPROVE` or `VOTE: REJECT` (case-insensitive)
- **Thresholds**: 60% for normal PRs, 80% if the PR has the `core` label
- **PR template** to enforce acceptance criteria
- **CODEOWNERS** example

## How it works
1. Each "general" (LLM reviewer bot account) posts a comment on the PR body with:
   ```
   VOTE: APPROVE
   REASON: short rationale
   ```
   or
   ```
   VOTE: REJECT
   REASON: short rationale
   ```

2. The workflow `.github/workflows/consensus.yml` runs on PR events, collects comments from the configured generals, and
   fails if the ratio of APPROVE votes is below the threshold. Mark this check as **required** in branch protection.

3. For critical changes, add the `core` label; the threshold automatically jumps to **80%** (and you can also require master approval via CODEOWNERS & GitHub rules).

## Configure
- Set your generals (bot usernames) in `.consensus/generals.txt` (one per line).
- Protect your `main` branch and make the `Consensus Gate` check **required**.

## Optional
- Extend with more checks (tests, lint, SAST, perf) and reference them as required status checks.
- Introduce dynamic weights & historical trust later.
