Param(
  [switch]$NoInstall,
  [switch]$NoStart
)

Write-Host "=== Worship and Yapps - Setup ===" -ForegroundColor Cyan

# Ensure we run from the script directory's parent (project root)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Resolve-Path (Join-Path $scriptDir ".."))

# Check Node.js
try {
  $nodeVersion = node -v 2>$null
} catch {
  $nodeVersion = $null
}
if (-not $nodeVersion) {
  Write-Error "Node.js is not installed. Please install Node 18+ from https://nodejs.org and re-run."
  exit 1
}

$m = [regex]::Match($nodeVersion, 'v(\d+)')
if ($m.Success -and [int]$m.Groups[1].Value -lt 18) {
  Write-Warning "Detected $nodeVersion. Node 18+ is recommended."
}

# Check npm
try { $npmVersion = npm -v 2>$null } catch { $npmVersion = $null }
if (-not $npmVersion) {
  Write-Error "npm is not available. Ensure Node.js installed npm correctly."
  exit 1
}

# Ensure .env exists
if (-not (Test-Path ".env") -and (Test-Path ".env.example")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Created .env from .env.example" -ForegroundColor Yellow
}

# Install dependencies
if (-not $NoInstall) {
  if (Test-Path "package-lock.json") {
    Write-Host "Installing dependencies with npm ci..." -ForegroundColor Green
    npm ci
  } else {
    Write-Host "Installing dependencies with npm install..." -ForegroundColor Green
    npm install
  }
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Dependency installation failed."
    exit 1
  }
}

# Start dev server
if (-not $NoStart) {
  $port = 5173
  Write-Host "Starting dev server on http://localhost:$port" -ForegroundColor Green
  try { Start-Process "http://localhost:$port" } catch {}
  npm run dev
}

Write-Host "Setup completed." -ForegroundColor Cyan

