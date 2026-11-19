# AI Consultant, powered by Enterprise AI: one-line install for Windows (PowerShell).
#   irm https://raw.githubusercontent.com/enterpriseaigroup/ai-consultant/main/install.ps1 | iex
# Installs the plugin into Claude Code, gets the walkthrough recorder ready, and makes an
# "AI Consultant" folder to start in.
$ErrorActionPreference = 'Stop'
$Dir = if ($env:AI_CONSULTANT_DIR) { $env:AI_CONSULTANT_DIR } else { Join-Path $HOME 'AI Consultant' }
function Step($t) { Write-Host ""; Write-Host $t -ForegroundColor White }

Write-Host ""
Write-Host "AI Consultant, powered by Enterprise AI"

Step "1. Checking what you have"
if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
  Write-Host "Claude Code isn't installed yet. Install it from https://claude.com/claude-code, then run this line again."; return
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js isn't installed yet. It shows you the prototype in a browser. Install the LTS version from https://nodejs.org, then run this line again."; return
}
Write-Host "Claude Code and Node.js are ready."

Step "2. Adding AI Consultant to Claude Code"
# Running this again updates an existing install.
claude plugin marketplace update enterprise-ai *> $null; claude plugin update ai-consultant@enterprise-ai *> $null
claude plugin install ai-consultant --marketplace enterpriseaigroup/ai-consultant *> $null
if ($LASTEXITCODE -ne 0) {
  claude plugin marketplace add enterpriseaigroup/ai-consultant *> $null
  claude plugin install ai-consultant@enterprise-ai *> $null
  if ($LASTEXITCODE -ne 0) { Write-Host "Claude Code couldn't install the plugin. Update Claude Code (claude update) and run this line again."; return }
}
claude plugin install ai-consultant-design-kit@enterprise-ai *> $null
# Keep it up to date by itself: Claude Code checks our marketplace for new versions after a session starts.
$km = Join-Path $HOME '.claude/plugins/known_marketplaces.json'
try { $m = Get-Content $km -Raw | ConvertFrom-Json; if ($m.'enterprise-ai') { $m.'enterprise-ai' | Add-Member -NotePropertyName autoUpdate -NotePropertyValue $true -Force; $m | ConvertTo-Json -Depth 10 | Set-Content $km } } catch {}
Write-Host "Installed, and set to update itself. It only switches on in a new, empty folder, so your other projects aren't affected."

Step "3. Getting the walkthrough recorder ready (about a minute, once)"
$Tools = Join-Path $HOME '.eai-tools'
if (-not (Test-Path (Join-Path $Tools 'node_modules/html-recording/tools/reel.mjs'))) {
  New-Item -ItemType Directory -Force -Path $Tools | Out-Null
  Push-Location $Tools
  if (-not (Test-Path 'package.json')) { '{ "name": "eai-tools", "private": true }' | Set-Content package.json }
  npm i -D html-recording@0.2.0 *> $null; npx html-recording setup *> $null
  Pop-Location
  Write-Host "Ready."
} else { Write-Host "Already ready." }

Step "4. Making a folder to start in"
New-Item -ItemType Directory -Force -Path $Dir | Out-Null
Write-Host $Dir

Write-Host ""
Write-Host "Done. Next:"
Write-Host "  In the Claude app: open Code, choose the `"$(Split-Path $Dir -Leaf)`" folder, and say what you'd like to build."
Write-Host "  Or in a terminal:  cd `"$Dir`"; claude"
Write-Host ""
