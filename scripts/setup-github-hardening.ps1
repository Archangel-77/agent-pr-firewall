param(
  [Parameter(Mandatory = $true)]
  [string]$Owner,

  [Parameter(Mandatory = $true)]
  [string]$Repo,

  [string]$Branch = "main",
  [string]$RequiredCheck = "agent-pr-firewall",
  [string]$WebhookUrl = ""
)

if (-not $env:GITHUB_TOKEN) {
  throw "GITHUB_TOKEN environment variable is required. Use a token with repo admin access."
}

$headers = @{
  Accept                 = "application/vnd.github+json"
  Authorization          = "Bearer $env:GITHUB_TOKEN"
  "X-GitHub-Api-Version" = "2022-11-28"
}

$protectionBody = @{
  required_status_checks           = @{
    strict   = $true
    contexts = @($RequiredCheck)
  }
  enforce_admins                   = $true
  required_pull_request_reviews    = @{
    dismiss_stale_reviews           = $true
    require_code_owner_reviews      = $false
    required_approving_review_count = 1
  }
  restrictions                     = $null
  required_linear_history          = $false
  allow_force_pushes               = $false
  allow_deletions                  = $false
  block_creations                  = $false
  required_conversation_resolution = $true
  lock_branch                      = $false
  allow_fork_syncing               = $true
} | ConvertTo-Json -Depth 20

$protectionUrl = "https://api.github.com/repos/$Owner/$Repo/branches/$Branch/protection"
Write-Host "Applying branch protection for $Owner/$Repo branch '$Branch'..."
Invoke-RestMethod -Method Put -Uri $protectionUrl -Headers $headers -Body $protectionBody | Out-Null
Write-Host "Branch protection applied. Required check: $RequiredCheck"

Write-Host ""
Write-Host "GitHub App required configuration (manual):"
Write-Host "1. Webhook event: pull_request"
Write-Host "2. Permissions:"
Write-Host "   - Pull requests: Read"
Write-Host "   - Issues: Write"
Write-Host "   - Checks: Write"

if ($WebhookUrl -ne "") {
  Write-Host "3. Webhook URL should be: $WebhookUrl/webhooks/github"
}

Write-Host ""
Write-Host "Done."
