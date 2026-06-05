# deploy-backend.ps1
# Sync the backend code into the Hugging Face Space clone and push it.
# Pushing triggers an automatic rebuild on Hugging Face.
#
# Usage (from the repo root):
#   .\deploy-backend.ps1                       # default commit message
#   .\deploy-backend.ps1 "fix scan endpoint"   # custom commit message

param([string]$Message = "Update backend")

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$src  = Join-Path $root "qr-code-fishing-backend"
$dst  = Join-Path $root "hf-space"

if (-not (Test-Path $dst)) {
  throw "hf-space/ not found. Clone the Space first: git clone https://huggingface.co/spaces/zonaet/qrcode-fishing hf-space"
}

Write-Host "1/4  Copying backend -> hf-space ..." -ForegroundColor Cyan
Copy-Item -Recurse -Force (Join-Path $src '*') $dst

Push-Location $dst
try {
  Write-Host "2/4  Removing local secrets / junk ..." -ForegroundColor Cyan
  foreach ($p in @('.env', 'qr_phishing.db', '.pytest_cache')) {
    if (Test-Path $p) { Remove-Item -Recurse -Force $p }
  }
  Get-ChildItem -Recurse -Directory -Filter __pycache__ -ErrorAction SilentlyContinue |
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

  Write-Host "3/4  Staging changes ..." -ForegroundColor Cyan
  git add .
  if (-not (git status --porcelain)) {
    Write-Host "No changes to deploy. Done." -ForegroundColor Yellow
    return
  }

  Write-Host "4/4  Commit + push (Hugging Face will rebuild) ..." -ForegroundColor Cyan
  git commit -m $Message
  git push
  Write-Host "`nPushed. Watch the build at: https://huggingface.co/spaces/zonaet/qrcode-fishing" -ForegroundColor Green
}
finally { Pop-Location }
