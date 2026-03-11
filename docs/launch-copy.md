# Launch Copy Kit

## 1) GitHub Release Copy (`v0.1.0`)

Title:

`v0.1.0: PR firewall for policy-based merge protection`

Body:

`agent-pr-firewall` is a GitHub App webhook service that evaluates pull requests and publishes a required governance check (`agent-pr-firewall`) before merge.

What it does:

- Verifies webhook signatures
- Evaluates PR policies (`draft-pr`, `issue-reference`, `protected-paths`, `secret-patterns`, `pr-size`, `pr-description`)
- Upserts managed PR comments
- Creates check runs with pass/warn/block mapping
- Exposes `/metrics` for Prometheus-style scraping

Included in this release:

- Docker + compose deployment artifacts
- Branch protection automation script
- Observability counters and alert signal for repeated file-inspection failures
- Unit + integration tests for signed webhook flow

Quick start:

1. Deploy service
2. Point GitHub App webhook to `/webhooks/github`
3. Require check `agent-pr-firewall` on your protected branch

## 2) X/Twitter Post

Ship safer PRs when AI and humans code together.

I open-sourced `agent-pr-firewall`: a GitHub App policy layer that blocks risky PRs before merge.

It checks for:
- missing issue references
- protected path edits
- secret-like diff patterns
- oversized PRs

Outputs one required check: `agent-pr-firewall`.

Repo: <YOUR_REPO_URL>

## 3) Reddit Post (`r/devops`, `r/github`)

Title:

Open-sourced a GitHub PR firewall for policy-based merge protection

Body:

I built `agent-pr-firewall`, a small GitHub App webhook service that adds a policy enforcement layer before merge.

Problem:

With AI-assisted coding, we saw more high-risk PRs (large diffs, infra edits, missing traceability, accidental secret-like changes).

What it does:

- Evaluates PR policies and returns pass/warn/block
- Posts a managed PR comment with findings
- Publishes a required check run (`agent-pr-firewall`)
- Exposes `/metrics` for observability

Current policies:

- draft PR blocking
- issue/ticket reference required
- protected paths blocking
- secret-pattern blocking
- PR size warning/blocking
- short description warning

Would appreciate feedback on policy design and false-positive tuning.

Repo: <YOUR_REPO_URL>

## 4) Hacker News (“Show HN”)

Title:

Show HN: Agent PR Firewall – policy checks that block risky GitHub PRs

Body:

Built and open-sourced `agent-pr-firewall`, a GitHub App webhook service for merge governance.

It runs policy checks on PR events and emits one check run (`agent-pr-firewall`) that can be required by branch protection.

Focus:

- enforce traceability (issue refs)
- detect risky path modifications
- detect secret-like additions
- limit oversized PRs

Tech:

- TypeScript + Octokit App auth
- webhook signature verification
- managed PR comment + check run
- `/metrics` endpoint for counters

Looking for feedback on policy defaults and operational ergonomics.

Repo: <YOUR_REPO_URL>

## 5) Dev.to Article Outline

Title:

How I built a PR firewall for AI-era code review on GitHub

Sections:

1. Why CI alone was not enough
2. The policy model (pass/warn/block)
3. GitHub App webhook architecture
4. Policies that matter in practice
5. Branch protection as the enforcement point
6. Observability and failure handling
7. Lessons learned and next steps

## 6) Demo Script (2-3 Minutes)

1. Open PR that touches `infra/` and lacks issue reference.
2. Show check run `agent-pr-firewall` -> blocked.
3. Show managed comment with findings.
4. Fix PR body and remove risky change.
5. Re-run via new commit -> check moves to pass/warn.
6. Show `/metrics` counter increment.
