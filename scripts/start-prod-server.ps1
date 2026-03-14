$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$logPath = Join-Path $repoRoot ".tmp-e2e-start.log"
$errPath = Join-Path $repoRoot ".tmp-e2e-start.err.log"

Set-Location $repoRoot

if (Test-Path $logPath) {
  Remove-Item $logPath -Force
}

if (Test-Path $errPath) {
  Remove-Item $errPath -Force
}

& "C:\Program Files\nodejs\npm.cmd" run start -- -p 3001 1>> $logPath 2>> $errPath
