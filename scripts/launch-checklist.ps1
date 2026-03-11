param(
  [string]$Owner = "",
  [string]$Repo = "",
  [string]$Domain = "",
  [string]$EnvFile = ".env",
  [switch]$RunValidation
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Check-Command {
  param([string]$Name)
  return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Check-File {
  param([string]$Path)
  return Test-Path $Path
}

function Parse-EnvFile {
  param([string]$Path)
  $map = @{}

  if (-not (Test-Path $Path)) {
    return $map
  }

  foreach ($line in Get-Content $Path) {
    $trimmed = $line.Trim()
    if ($trimmed -eq "" -or $trimmed.StartsWith("#")) {
      continue
    }

    $idx = $trimmed.IndexOf("=")
    if ($idx -lt 1) {
      continue
    }

    $key = $trimmed.Substring(0, $idx).Trim()
    $value = $trimmed.Substring($idx + 1).Trim()
    $map[$key] = $value
  }

  return $map
}

Write-Step "Launch readiness checks"

$requiredFiles = @(
  "README.md",
  "CHANGELOG.md",
  "deploy/README.md",
  "docs/launch-plan.md",
  "docs/launch-copy.md",
  "scripts/setup-github-hardening.ps1",
  "Dockerfile",
  ".github/workflows/ci.yml",
  ".env.example"
)

$missingFiles = @()
foreach ($file in $requiredFiles) {
  if (-not (Check-File $file)) {
    $missingFiles += $file
  }
}

if ($missingFiles.Count -gt 0) {
  Write-Host "Missing required files:" -ForegroundColor Red
  $missingFiles | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
  exit 1
}

Write-Host "All required launch files are present." -ForegroundColor Green

$requiredCommands = @("git", "pwsh")
$optionalCommands = @("node", "npm", "docker", "gh")

$missingRequiredCommands = @()
foreach ($cmd in $requiredCommands) {
  if (-not (Check-Command $cmd)) {
    $missingRequiredCommands += $cmd
  }
}

if ($missingRequiredCommands.Count -gt 0) {
  Write-Host "Missing required commands:" -ForegroundColor Red
  $missingRequiredCommands | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
  exit 1
}

Write-Host "Required commands available: $($requiredCommands -join ", ")" -ForegroundColor Green

$missingOptionalCommands = @()
foreach ($cmd in $optionalCommands) {
  if (-not (Check-Command $cmd)) {
    $missingOptionalCommands += $cmd
  }
}

if ($missingOptionalCommands.Count -gt 0) {
  Write-Host "Optional commands missing: $($missingOptionalCommands -join ", ")" -ForegroundColor Yellow
} else {
  Write-Host "Optional commands available: $($optionalCommands -join ", ")" -ForegroundColor Green
}

$gitStatus = git status --porcelain
if ($gitStatus) {
  Write-Host "Working tree has uncommitted changes." -ForegroundColor Yellow
} else {
  Write-Host "Working tree is clean." -ForegroundColor Green
}

Write-Step "Environment file checks ($EnvFile)"

$requiredEnvKeys = @(
  "PORT",
  "LOG_LEVEL",
  "GITHUB_API_BASE_URL",
  "GITHUB_APP_ID",
  "GITHUB_WEBHOOK_SECRET",
  "GITHUB_PRIVATE_KEY",
  "FIREWALL_PROTECTED_PATH_PREFIXES",
  "FIREWALL_MAX_CHANGED_FILES_WARN",
  "FIREWALL_MAX_CHANGED_FILES_BLOCK",
  "FIREWALL_MAX_CHANGED_LINES_WARN",
  "FIREWALL_MAX_CHANGED_LINES_BLOCK",
  "ALERT_FILE_INSPECTION_FAILURE_THRESHOLD",
  "ALERT_FILE_INSPECTION_FAILURE_WINDOW_SECONDS"
)

$envMap = Parse-EnvFile -Path $EnvFile
if ($envMap.Count -eq 0) {
  Write-Host "No env entries parsed from $EnvFile. Ensure it exists and is populated." -ForegroundColor Yellow
} else {
  $missingEnvKeys = @()
  foreach ($key in $requiredEnvKeys) {
    if (-not $envMap.ContainsKey($key) -or $envMap[$key] -eq "") {
      $missingEnvKeys += $key
    }
  }

  if ($missingEnvKeys.Count -gt 0) {
    Write-Host "Missing/empty env keys in ${EnvFile}:" -ForegroundColor Yellow
    $missingEnvKeys | ForEach-Object { Write-Host " - $_" -ForegroundColor Yellow }
  } else {
    Write-Host "All required env keys are present in $EnvFile." -ForegroundColor Green
  }
}

if ($RunValidation) {
  Write-Step "Running local validation"
  if (-not (Check-Command "npm")) {
    Write-Host "Skipping npm validation because npm is not available." -ForegroundColor Yellow
  } else {
    npm run typecheck
    npm run lint
    npm run test
    npm run build
  }
}

Write-Step "Launch command sequence"

Write-Host "1) Tag and push release" -ForegroundColor Green
Write-Host "   git tag v0.1.0"
Write-Host "   git push origin main --tags"

Write-Host ""
Write-Host "2) Create GitHub release (if gh CLI is installed)" -ForegroundColor Green
Write-Host "   gh release create v0.1.0 --notes-file docs/launch-copy.md"

Write-Host ""
Write-Host "3) Deploy service" -ForegroundColor Green
Write-Host "   docker build -t agent-pr-firewall:latest ."
Write-Host "   docker run --rm -p 3000:3000 --env-file .env agent-pr-firewall:latest"

Write-Host ""
Write-Host "4) Configure branch protection and required check" -ForegroundColor Green

if ($Owner -ne "" -and $Repo -ne "") {
  if ($Domain -ne "") {
    Write-Host '   $env:GITHUB_TOKEN="<token-with-repo-admin>"'
    Write-Host "   pwsh ./scripts/setup-github-hardening.ps1 -Owner $Owner -Repo $Repo -Branch main -WebhookUrl https://$Domain"
  } else {
    Write-Host '   $env:GITHUB_TOKEN="<token-with-repo-admin>"'
    Write-Host "   pwsh ./scripts/setup-github-hardening.ps1 -Owner $Owner -Repo $Repo -Branch main"
  }
} else {
  Write-Host '   $env:GITHUB_TOKEN="<token-with-repo-admin>"'
  Write-Host "   pwsh ./scripts/setup-github-hardening.ps1 -Owner <org-or-user> -Repo <repo> -Branch main -WebhookUrl https://<your-domain>"
}

Write-Host ""
Write-Host "5) Publish community launch posts" -ForegroundColor Green
Write-Host "   Use templates in docs/launch-copy.md"

Write-Host ""
Write-Host "Launch checklist complete." -ForegroundColor Cyan
