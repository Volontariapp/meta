# Bootstrap Volontariapp (Windows 11) : garantit Node et Yarn, puis delegue a la CLI.
# Usage : powershell -ExecutionPolicy Bypass -File .\setup.ps1 [options de `meta setup`]
$ErrorActionPreference = 'Stop'

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RequiredNode = (Get-Content (Join-Path $RootDir '.node-version') -Raw).Trim()
$Package = Get-Content (Join-Path $RootDir 'package.json') -Raw | ConvertFrom-Json
$YarnVersion = $Package.packageManager -replace '^yarn@', ''

function Test-NodeOk {
  $node = Get-Command node -ErrorAction SilentlyContinue
  if (-not $node) { return $false }
  $current = [version]((node -v) -replace '^v', '')
  return $current -ge [version]$RequiredNode
}

if (-not (Test-NodeOk)) {
  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    throw "winget est introuvable. Installez Node $RequiredNode manuellement (https://nodejs.org) puis relancez."
  }
  Write-Host "[setup] Installation de Node $RequiredNode via winget"
  winget install --id OpenJS.NodeJS --version $RequiredNode --exact --accept-package-agreements --accept-source-agreements
  $env:Path = [System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path', 'User')
}
if (-not (Test-NodeOk)) { throw "Node >= $RequiredNode introuvable apres installation. Ouvrez un nouveau terminal et relancez." }

corepack enable
corepack prepare "yarn@$YarnVersion" --activate

node (Join-Path $RootDir 'scripts\cli\index.mjs') setup @args
exit $LASTEXITCODE
