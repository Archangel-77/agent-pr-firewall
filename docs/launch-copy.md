# Launch Copy Kit (1-Day Blast, Problem -> Outcome)

## Canonical Links

- Repo: `https://github.com/Archangel-77/agent-pr-firewall`
- Latest release: `https://github.com/Archangel-77/agent-pr-firewall/releases/tag/v0.1.1`
- Quick start (README): `https://github.com/Archangel-77/agent-pr-firewall#local-run`
- Proof PR with 2 passing checks: `https://github.com/Archangel-77/agent-pr-firewall/pull/2`

Use these same links in every post.

## 1) X Post (T+0)

Ship safer PRs when AI and humans code together.

I open-sourced `agent-pr-firewall`: a GitHub App policy layer that blocks risky PRs before merge and emits one required check.

It catches:
- missing issue references
- protected path edits
- secret-like diff patterns
- oversized PRs

Repo: https://github.com/Archangel-77/agent-pr-firewall  
Release: https://github.com/Archangel-77/agent-pr-firewall/releases/tag/v0.1.1

## 2) Reddit Post (`r/devops`) (T+15)

Title:

Open-sourced a GitHub PR firewall for policy-based merge protection

Body:

I built `agent-pr-firewall`, a small GitHub App webhook service that adds a policy enforcement layer before merge.

Problem:

With AI-assisted coding, we saw more high-risk PRs (large diffs, infra edits, missing traceability, accidental secret-like changes).

What it does:

- Evaluates PR policies and returns pass/warn/block
- Publishes a required check run (`agent-pr-firewall`)
- Optionally posts a managed PR comment with findings
- Exposes `/metrics` for observability

Current policies:

- draft PR blocking
- issue/ticket reference required
- protected paths blocking
- secret-pattern blocking
- PR size warning/blocking
- short description warning

Would appreciate feedback on policy defaults and false-positive tuning.

Repo: https://github.com/Archangel-77/agent-pr-firewall  
Release: https://github.com/Archangel-77/agent-pr-firewall/releases/tag/v0.1.1

## 3) Reddit Post (`r/github`) (T+30)

Title:

Built a GitHub App that adds one required PR governance check before merge

Body:

Open-sourced `agent-pr-firewall`, a GitHub App webhook service for pull request governance.

It validates signed webhooks, evaluates PR policies, then publishes one check run (`agent-pr-firewall`) that can be required by branch protection.

Main outcome:

- Block risky PR patterns before merge
- Keep governance in one check status
- Keep decision behavior auditable

Repo: https://github.com/Archangel-77/agent-pr-firewall  
Release: https://github.com/Archangel-77/agent-pr-firewall/releases/tag/v0.1.1

## 4) Hacker News (Show HN) (T+45)

Title:

Show HN: Agent PR Firewall - policy checks that block risky GitHub PRs

Body:

Built and open-sourced `agent-pr-firewall`, a GitHub App webhook service for merge governance.

It evaluates pull request events and emits one check run (`agent-pr-firewall`) that can be required by branch protection.

Focus:

- enforce traceability (issue refs)
- detect risky path modifications
- detect secret-like additions
- limit oversized PRs

Tech:

- TypeScript + Octokit App auth
- webhook signature verification
- check run publishing + managed comment
- `/metrics` endpoint

Looking for feedback on policy defaults and operational ergonomics.

Repo: https://github.com/Archangel-77/agent-pr-firewall  
Release: https://github.com/Archangel-77/agent-pr-firewall/releases/tag/v0.1.1

## 5) Dev.to Short Launch Article (T+60)

Title:

How I built a PR firewall for AI-era code review on GitHub

Structure:

1. Why CI alone was not enough
2. The policy model (pass/warn/block)
3. GitHub App webhook architecture
4. Policies that matter in practice
5. Branch protection as the enforcement point
6. Observability and failure handling
7. Lessons learned and next steps

Mandatory links to include:

- Repo: https://github.com/Archangel-77/agent-pr-firewall
- Release: https://github.com/Archangel-77/agent-pr-firewall/releases/tag/v0.1.1
- Proof PR/checks: https://github.com/Archangel-77/agent-pr-firewall/pull/2

## 6) GitHub Discussions Seed Threads (T+70)

Live threads:

- `https://github.com/Archangel-77/agent-pr-firewall/discussions/3`
- `https://github.com/Archangel-77/agent-pr-firewall/discussions/4`

Reference titles/bodies (for reuse in future launches):

Title 1: `What PR policies do you need?`
Body 1:
`If you use PR guardrails today, which rules are most important in your workflow? Looking for practical policy requests and default threshold feedback.`

Title 2: `Share blocked PR examples / false positives`
Body 2:
`If the firewall blocked or warned on one of your PRs, share the case here. Include what happened and what behavior you expected so we can tune defaults.`

## 7) End-of-Day Proof Update (T+480)

Post this as an update on X or as a top comment in one Reddit thread:

`Launch day update for agent-pr-firewall: live on GitHub with v0.1.1, checks running on real PRs, and first community feedback coming in.`

`Proof: https://github.com/Archangel-77/agent-pr-firewall/pull/2`

`Repo: https://github.com/Archangel-77/agent-pr-firewall`
