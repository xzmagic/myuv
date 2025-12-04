param(
  [ValidateSet('dev','build')]
  [string]$Cmd = 'dev'
)

$ErrorActionPreference = 'Stop'

function Write-Info($msg) { Write-Host "[tauri.ps1] $msg" -ForegroundColor Cyan }
function Test-Command($name) { Get-Command $name -ErrorAction SilentlyContinue }

# Paths
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir   = Split-Path -Parent $ScriptDir
$SrcTauri  = Join-Path $RootDir 'src-tauri'
$RagAppDir = Join-Path $SrcTauri 'rag_app'

# Bootstrap checks (minimal)
if (-not (Test-Path $RagAppDir)) { throw "Front-end directory not found: $RagAppDir" }
if (-not (Test-Command cargo)) { throw "Rust/Cargo not found. Please install Rust (MSVC) and reopen the terminal." }

# Ensure tauri-cli is available
try {
  $null = cargo tauri --version 2>$null
} catch {
  Write-Info 'Installing tauri-cli (first time only)...'
  cargo install tauri-cli --locked
}

# Optional: start a simple static server for devUrl=http://localhost:5180/index.html
$serverProc = $null
if ($Cmd -eq 'dev') {
  $py = if (Test-Command py) { 'py' } elseif (Test-Command python) { 'python' } else { $null }
  if ($py) {
    Write-Info "Starting dev static server on http://localhost:5180 (dir: $RagAppDir)"
    $serverProc = Start-Process -FilePath $py -ArgumentList @('-m','http.server','5180','--directory',"$RagAppDir",'--bind','127.0.0.1') -PassThru -WindowStyle Hidden
    Start-Sleep -Milliseconds 600
  } else {
    Write-Info 'Python not found; continuing without dev static server. Ensure tauri.conf.json uses frontendDist.'
  }
}

try {
  Push-Location $SrcTauri
  Write-Info "Running: cargo tauri $Cmd"
  cargo tauri $Cmd
}
finally {
  Pop-Location
  if ($serverProc -and -not $serverProc.HasExited) {
    Write-Info 'Stopping dev static server'
    try { Stop-Process -Id $serverProc.Id -Force -ErrorAction SilentlyContinue } catch {}
  }
}
