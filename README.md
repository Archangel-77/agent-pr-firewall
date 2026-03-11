# agent-pr-firewall

GitHub App webhook service that evaluates pull requests against firewall policies and publishes results back to GitHub.

## Current MVP

- Receives GitHub webhooks on `POST /webhooks/github`
- Verifies `x-hub-signature-256` using your webhook secret
- Processes `pull_request` events for:
  - `opened`
  - `edited`
  - `reopened`
  - `synchronize`
  - `ready_for_review`
- Evaluates built-in policies:
  - `draft-pr` (block)
  - `issue-reference` (block if PR body has no issue/ticket reference)
  - `protected-paths` (block if protected directories are changed)
  - `secret-patterns` (block if secret-like additions appear in diffs)
  - `pr-size` (warn/block when changed files or lines exceed thresholds)
  - `pr-description` (warn if description is too short)
- Publishes results to GitHub:
  - Upserts a managed PR comment
  - Creates a Check Run named `agent-pr-firewall`

## Tech Stack

- TypeScript (NodeNext)
- `@octokit/auth-app`
- `@octokit/webhooks`
- `zod`
- `pino`
- `vitest`
- `eslint`

## Project Structure

```text
src/
  config/      env schema and loading
  github/      GitHub API client and reporting
  policies/    policy interfaces, rules, and engine
  server/      HTTP server
  types/       GitHub payload types
  utils/       logger
  webhooks/    webhook validation and routing
tests/
  unit/
```

## Requirements

- Node.js 20+ (22.x recommended)
- A GitHub App with:
  - Webhook configured
  - Pull request read access
  - Issues write access (for PR comment upsert)
  - Checks write access (for check runs)

## Configuration

Copy values from `.env.example` into your shell environment:

- `PORT` (default `3000`)
- `LOG_LEVEL` (default `info`)
- `LOG_FILE_PATH` (optional file sink for JSON logs)
- `GITHUB_API_BASE_URL` (default `https://api.github.com`)
- `FIREWALL_PROTECTED_PATH_PREFIXES` (comma-separated path prefixes)
- `FIREWALL_MAX_CHANGED_FILES_WARN`
- `FIREWALL_MAX_CHANGED_FILES_BLOCK`
- `FIREWALL_MAX_CHANGED_LINES_WARN`
- `FIREWALL_MAX_CHANGED_LINES_BLOCK`
- `ALERT_FILE_INSPECTION_FAILURE_THRESHOLD`
- `ALERT_FILE_INSPECTION_FAILURE_WINDOW_SECONDS`
- `GITHUB_APP_ID`
- `GITHUB_WEBHOOK_SECRET`
- `GITHUB_PRIVATE_KEY` (supports `\n`-escaped format)

Note: this project currently reads from `process.env` only (no dotenv loader yet).

## Local Run

```bash
npm install
npm run dev
```

Health check:

```bash
curl http://localhost:3000/health
```

Metrics:

```bash
curl http://localhost:3000/metrics
```

Build and run:

```bash
npm run build
npm run start
```

## Scripts

- `npm run dev` - run with `tsx` watch mode
- `npm run typecheck` - TypeScript type checking
- `npm run lint` - ESLint
- `npm run test` - Vitest
- `npm run build` - compile to `dist/`
- `npm run start` - run compiled app

## Webhook Endpoint

- `POST /webhooks/github`
- Requires headers:
  - `x-github-event`
  - `x-github-delivery`
  - `x-hub-signature-256`

Response behavior:

- `401` invalid signature
- `400` bad headers/payload
- `202` accepted (processed or ignored unsupported event)

## Deployment

Container build:

```bash
docker build -t agent-pr-firewall:latest .
docker run --rm -p 3000:3000 --env-file .env agent-pr-firewall:latest
```

For production compose and hardening steps, see [deploy/README.md](C:/Users/gamin/agent-pr-firewall/deploy/README.md).

## GitHub Hardening

Apply branch protection and required check:

```powershell
$env:GITHUB_TOKEN="<token-with-repo-admin>"
pwsh ./scripts/setup-github-hardening.ps1 -Owner <org-or-user> -Repo <repo> -Branch main -WebhookUrl https://<your-domain>
```

GitHub App settings that must be enabled:

- Webhook event: `pull_request`
- Permissions:
  - Pull requests: `Read`
  - Issues: `Write`
  - Checks: `Write`

## Decision Mapping

Policy decision to Check Run conclusion:

- `pass` -> `success`
- `warn` -> `neutral`
- `block` -> `action_required`

## Notes

- If a webhook payload has no `installation.id`, policy evaluation still runs but GitHub report publishing is skipped.
- If pull request file inspection fails, the firewall returns a `block` decision (`file-inspection`) to fail closed.
- The managed PR comment is updated in place using an internal marker to avoid comment spam.
