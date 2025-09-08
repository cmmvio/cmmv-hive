# CMMV-Hive Manifesto

Directed collective intelligence to build real software with language models.

TL;DR: We are stuck trying to make “one model do everything.” The missing link is to organize LLMs like an open-source community: a human Master sets the direction; Generals (strong models) review and seek consensus; Collaborators (lightweight models) implement. GitHub is the backbone — issues, PRs, reviews, votes, and merges — and CMMV‑Hive is the orchestration glue.

---

## 1) Problem
The AI market is racing toward ever larger, more expensive models that remain imperfect in their limitations. Demos impress, but large, robust projects are still rare. What’s missing is governance: long-term coordination, engineering discipline, and a process capable of turning chaotic creativity into software quality.

In real-world development, we learned something else: benevolent technical leadership, clear roles, and pragmatic consensus. Linus Torvalds called this the “benevolent dictator”: someone responsible for direction, advised by strong reviewers and an active base of contributors.

We believe we’ve found the missing link: apply this social model… to machines.

---

## 2) Hypothesis
Language models can collaborate like an OSS community:

- **Master (human)**: sovereign of vision/quality. Resolves conflicts and maintains standards.
- **Generals (strong/specialized LLMs)**: review, debate, justify and **vote**.
- **Collaborators (lightweight LLMs)**: open issues, propose PRs, write tests and docs.

Everything happens **on GitHub** (or compatible): each model acts as a **user/bot**, with defined permissions. The rule is simple: **meritocracy, transparency, and consensus**. Those who disagree can **fork** — and let the future decide.

---

## 3) What is CMMV‑Hive
**CMMV‑Hive** is the **collaborative orchestration** layer of the CMMV ecosystem:

- Connects to **multiple models** (via API or browser automation).
- **Reads and writes** to repositories via GitHub (issues, comments, PRs, reviews, merges).
- Generates and delivers **tailored context** (commits, diffs, files, snapshots) for models with limited internet access or without native repository reading.
- Maintains **technical memory** (decisions, ADRs, regression history) and promotes organizational learning.
- Implements **voting, consensus, and quality policies** as mandatory status checks.

---

## 4) Roles and Process
**Roles**
- **Master**: defines vision, priorities and acceptance criteria; approves exceptions; can exercise justified overrides.
- **Generals**: perform deep code reviews (design, security, performance, maintainability) and **vote** with justifications.
- **Collaborators**: implement tasks, write tests, prepare documentation and POCs.

**Workflow**
1. The Master (or the Hive) opens an **Issue** with scope and acceptance criteria.
2. The Hive selects **Collaborators** and **Generals** for the topic.
3. Collaborators propose a **PR** with code, tests and docs; CI runs gates (build, lint, tests, coverage, SAST, benchmarks).
4. Generals conduct **rubric-guided reviews** and publish **votes**.
5. The Hive calculates quorum, verifies checks, and declares **Consensus PASS/FAIL**.
6. For critical cases, require reinforced approval and **Master ACK**.
7. Merge, decision record (ADR), and post-merge monitoring.

---

## 5) Consensus Rules
- **Normal PR**:
  - Required checks: build, lint, tests (>=95% pass), coverage (>=70%).
  - **Quorum**: approval by **>= 60%** of assigned Generals.
- **Core / security / breaking changes**:
  - Previous required checks **+** benchmarks without significant regression **+** SAST without high/critical.
  - **Quorum**: **>= 80%** of Generals **and** explicit **Master** authorization.
- **Master override**: allowed, provided it generates an **ADR** with rationale.
- **Vote**: each General records “APPROVE” or “REJECT” with a brief justification. The General’s last position supersedes previous ones.
- **Transparency**: the consensus result appears as a **required status check**.

---

## 6) GitHub as the backbone
- Each model is a **user/bot** with the minimum necessary permissions.
- The Hive publishes **Check Runs** (consensus, quality, security, performance).
- **Branch protection** enforces consensus rules as *required checks*.
- **CODEOWNERS** routes reviews to specific Generals by area (core, networking, docs).

---

## 7) Access to Models and Context
- Connection to multiple LLMs via **API** or **browser simulation**.
- For models **without internet** or without native repository reading:
  - The Hive provides **context packages** (target files, diffs, commit history, relevant tests).
  - Scope is limited (objective context windows) and privacy/secrets are preserved.

---

## 8) Quality, Metrics, and Learning
- Objective gates: build, lint, tests, coverage, **SAST**, **benchmarks**.
- Subjective rubrics: design, security, performance, maintainability.
- **Dynamic weights**: each General’s influence evolves with their history (approvals without regression, correct rejections).
- **ADRs**: architectural decisions recorded and linked to PRs.

---

## 9) Ethics, Security, and Licenses
- No secret leakage in PRs from forks; isolated execution in sandboxes.
- Compliance checks and **SPDX** in file headers.
- Audited dependencies, mapped and addressed vulnerabilities.

---

## 10) Call to Action
CMMV‑Hive is an invitation to transform soloist models into an **orchestra**. Instead of waiting for “the perfect model,” we build **perfectionist processes**: transparency, consensus, engineering discipline, and human accountability.

If you believe that the evolution of LLMs depends less on size and more on the **governance of collaboration**, join us. Let’s prove that collective intelligence — human and synthetic — can deliver better software, faster, and sustainably.

---

## 11) MVP: IDE Extension (BIP‑00)
To quickly make the system tangible and usable in day-to-day work, the most practical path is to **create an extension that attaches to IDEs** with multi-model support (such as **Cursor**, **Wildsurf**, among others). This extension will enable:

- Automating voting, reviews, analyses, and the entire proposed workflow;
- Orchestrating interactions with multiple models (Generals/Collaborators) reproducibly;
- Executing Git commands via an integrated terminal when needed;
- Supervising the end-to-end flow with transparency and audit trails.

Therefore, the master's first proposal is **BIP‑00**: creating this extension and its primary flows (see `bips/BIP-00/`).

---

## 12) Version 1.0: automated delivery flow
In version 1.0, upon receiving a generic problem, the system automatically drives from scope to merge. For example:

> "Create a C# class for managing byte buffers for UDP network packets, with minimal memory allocation and compatibility with future compression and encryption implementations"

Automated flow:
1. The system starts **a dedicated branch** for the work.
2. It selects **one model** to write **a proposal summary** (context, constraints, acceptance criteria).
3. Models **propose the implementation approach** (design, APIs, trade‑offs).
4. **A random model** initiates the implementation on the branch.
5. Implementation proceeds in **cycles with pairs of reviewers**, following quality rubrics.
6. The process continues until **>= 80% of the Generals** agree it is the best implementation for the requested scope.
7. The branch is promoted to a **Pull Request**; **only the Master** can approve the merge.
8. The cycle continues for the next demands, with history and metrics feeding dynamic weights and organizational learning.

This flow is operationalized by the extension (BIP‑00) and supported by the consensus rules (see Sections 4 and 5) and the voting infrastructure (BIP‑01).

### 12.1) Pre‑PR Quality Gate (mandatory)
Before opening the PR, after reaching **>= 80%** approval from the Generals, the Hive must ensure:

- **Complete implementation documentation** (modular README, high‑level comments, ADRs when applicable).
- **Automated tests** covering the created class/feature (unit and, when applicable, integration), with minimum coverage targets per Section 5.
- **Lint and formatting** according to the repository standard; zero linter errors.
- **Best practices**: clear design, single responsibility, handled errors, appropriate logging, declared allocation/latency limits respected.
- **Revalidation by the Generals** focused on quality (not only on solution merit), maintaining **>= 80%** approval.

Only after these criteria are met is the PR opened for the **Master’s** final approval.
