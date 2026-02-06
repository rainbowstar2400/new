# Ensure directory and remote are correct before any write operation.
param(
  [string]$ExpectedRoot = "C:\Users\cs24035\Documents\develop\new",
  [string]$ExpectedRemote = "https://github.com/rainbowstar2400/new.git"
)

$ErrorActionPreference = "Stop"

if ($env:SKIP_PREFLIGHT_STRICT -eq "1") {
  Write-Host "[OK] preflight skipped by SKIP_PREFLIGHT_STRICT=1"
  git status --short --branch
  exit 0
}

try {
  $root = (git rev-parse --show-toplevel).Trim()
} catch {
  Write-Error "Git repository not found."
  exit 1
}

$rootFull = [System.IO.Path]::GetFullPath($root)
$expectedFull = [System.IO.Path]::GetFullPath($ExpectedRoot)

if ($rootFull -ne $expectedFull) {
  Write-Error "Repository root mismatch. actual=$rootFull expected=$expectedFull"
  exit 1
}

try {
  $remote = (git remote get-url origin).Trim()
} catch {
  Write-Error "origin remote not found."
  exit 1
}

if ($remote -ne $ExpectedRemote) {
  Write-Error "Remote mismatch. actual=$remote expected=$ExpectedRemote"
  exit 1
}

$status = git status --short --branch
Write-Host "[OK] preflight passed"
Write-Host "root   : $rootFull"
Write-Host "remote : $remote"
Write-Host "status :"
Write-Host $status
