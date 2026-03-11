# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project follows Semantic Versioning.

## [0.1.1] - 2026-03-11

### Added

- Unit tests for reporter behavior when PR comment upsert fails but check run publication should continue.
- Git ignore pattern for GitHub App key files (`*.private-key.pem`).

### Fixed

- Reporter now continues to publish the `agent-pr-firewall` check run even if managed PR comment creation/update fails with GitHub API `403`.
- Branch hardening script now fails fast and surfaces clear API error details on authentication/authorization failures instead of printing a false success message.

## [0.1.0] - 2026-03-11

### Added

- TypeScript GitHub App webhook service skeleton with strict config and runtime scripts.
- Webhook signature verification for GitHub events.
- Pull request event handling for:
  - `opened`
  - `edited`
  - `reopened`
  - `synchronize`
  - `ready_for_review`
- Policy engine with pass/warn/block decision model.
- Built-in policy rules:
  - `draft-pr`
  - `issue-reference`
  - `protected-paths`
  - `secret-patterns`
  - `pr-size`
  - `pr-description`
  - `file-inspection` fail-closed behavior when file listing fails
- GitHub reporting:
  - managed PR comment upsert
  - check run publishing (`agent-pr-firewall`)
- Observability:
  - Prometheus-style `/metrics` endpoint
  - HTTP, webhook, policy, and GitHub API counters
  - file inspection failure alert monitor
- Deployment artifacts:
  - `Dockerfile`
  - `.dockerignore`
  - production compose file
- Automation:
  - branch protection and required check setup script
  - CI workflow for typecheck/lint/test/build
- Tests:
  - unit tests for policies and webhook logic
  - integration tests for signed webhook handling and metrics endpoint
- Documentation:
  - main README with deploy/hardening instructions
  - deployment guide
  - community launch plan and launch copy kit

### Changed

- Environment schema expanded for policy thresholds, observability options, and alert windows.
- Logging supports optional file sink via `LOG_FILE_PATH`.
