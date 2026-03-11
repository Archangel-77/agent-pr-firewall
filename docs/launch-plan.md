# Launch Plan (30 Days)

## Goal

Create repeatable community attention and first production users for `agent-pr-firewall`.

Success targets for first 30 days:

- 100+ GitHub stars
- 10+ external issues/discussions
- 3+ teams running in production
- 1 public case study with before/after metrics

## Positioning Statement

`agent-pr-firewall` is a policy enforcement layer for pull requests.
It blocks risky PRs before merge and gives teams one required governance check.

## Audience

- Engineering managers adopting AI coding assistants
- Platform / DevEx teams enforcing repo standards
- Security engineers concerned with secret leaks and risky infra changes

## Week 1: Product Readiness

- Finalize README, deployment docs, and quick-start flow.
- Ship one-click setup sequence:
  - Deploy service
  - Configure GitHub App
  - Enable required check (`agent-pr-firewall`)
- Ensure demo repository exists with example blocked/passed PRs.
- Add project badges and screenshots/GIFs of:
  - check run output
  - managed PR comment
  - metrics endpoint sample

## Week 2: Public Launch

- Publish `v0.1.0` release with clear “Why now?” framing.
- Announce in:
  - GitHub release notes
  - X/Twitter
  - Reddit (`r/devops`, `r/github`, `r/programming`)
  - Hacker News (“Show HN” style)
  - Dev.to post
- Open GitHub Discussions with seed threads:
  - “What policies do you need?”
  - “Share your blocked PR examples”

## Week 3: Trust Building

- Publish “Detection quality” post:
  - false positives
  - policy tuning examples
  - fail-open vs fail-closed rationale
- Add roadmap issues labeled:
  - `good-first-issue`
  - `policy-request`
  - `integration-request`
- Respond fast to all feedback (target: <24h).

## Week 4: Proof + Expansion

- Publish one mini case study:
  - baseline merge risk
  - incidents prevented / risky PRs blocked
  - developer friction feedback
- Add integrations users ask for most (for example Slack alert webhook or policy packs).
- Repost with evidence:
  - “First 30 days: numbers, failures, lessons.”

## Content Cadence

- Week 1-2: 3 short posts/week
- Week 3-4: 2 posts/week + 1 deeper article
- Every post includes:
  - specific pain point
  - concrete blocked PR example
  - link to quick-start

## Conversion Funnel

- Impression -> repo visit:
  - Lead with one sentence outcome (“Block risky PRs before merge”)
- Repo visit -> setup attempt:
  - 5-minute quick start section at top
- Setup attempt -> retention:
  - clear policy customization examples
  - metrics and alerting for operational confidence

## Risks And Mitigations

- Risk: “Too noisy / false positives”
  - Mitigation: documented policy tuning and warn-vs-block defaults.
- Risk: “Looks like another CI linter”
  - Mitigation: emphasize GitHub App governance check + merge enforcement.
- Risk: “Hard to adopt”
  - Mitigation: script-based hardening + Docker deployment path.

## Weekly Checklist

- Publish 1 artifact (release note/blog/case study).
- Engage in 3 relevant community threads with practical answers.
- Merge 1 external contribution or policy request.
- Track metrics:
  - stars / clones
  - quick-start completions
  - production installs
