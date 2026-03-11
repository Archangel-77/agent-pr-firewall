# Deployment And Hardening

## 1) Deploy The Service

Build and run with Docker:

```bash
docker build -t agent-pr-firewall:latest .
docker run --rm -p 3000:3000 --env-file .env agent-pr-firewall:latest
```

Or use compose:

```bash
docker compose -f deploy/docker-compose.prod.yml up -d
```

Required endpoints:

- `GET /health`
- `GET /metrics`
- `POST /webhooks/github`

## 2) GitHub App Configuration

Set these in GitHub App settings:

- Webhook event: `pull_request`
- Permissions:
  - Pull requests: `Read`
  - Issues: `Write`
  - Checks: `Write`

Set webhook URL to:

`https://<your-domain>/webhooks/github`

## 3) Branch Protection

Use the automation script:

```powershell
$env:GITHUB_TOKEN="<token-with-repo-admin>"
pwsh ./scripts/setup-github-hardening.ps1 -Owner <org-or-user> -Repo <repo> -Branch main -WebhookUrl https://<your-domain>
```

The script configures required status checks for:

- `agent-pr-firewall`

## 4) Observability

Provided by default:

- Structured JSON logs via `pino`
- Optional file sink: `LOG_FILE_PATH=/var/log/agent-pr-firewall.log`
- Prometheus-style metrics on `GET /metrics`
- Alerting signal: repeated file-inspection failures trigger an error log once per alert window
