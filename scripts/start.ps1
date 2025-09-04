$port = 5173

# Ensure we run from the script directory's parent (project root) if invoked elsewhere
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Resolve-Path (Join-Path $scriptDir ".."))

if (-not (Test-Path "node_modules")) {
  Write-Warning "Dependencies not found. Installing with npm install..."
  npm install
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host "Opening http://localhost:$port" -ForegroundColor Green
try { Start-Process "http://localhost:$port" } catch {}
npm run dev

