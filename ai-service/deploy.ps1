# Deploys the ProspectIQ AI service as a detached background process on this machine.
#   powershell -ExecutionPolicy Bypass -File ai-service/deploy.ps1          # (re)deploy
#   powershell -ExecutionPolicy Bypass -File ai-service/deploy.ps1 -Stop    # stop
param([switch]$Stop, [int]$Port = 8787)

$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$pidFile = Join-Path $here '.service.pid'

if (Test-Path $pidFile) {
    $old = Get-Content $pidFile
    try { Stop-Process -Id $old -Force -ErrorAction Stop; Write-Host "Stopped AI service (pid $old)" } catch {}
    Remove-Item $pidFile
}
if ($Stop) { return }

# Make sure the custom model exists in Ollama.
$models = & ollama list 2>$null | Out-String
if ($models -notmatch 'prospectiq-copilot') {
    Write-Host 'Creating prospectiq-copilot model in Ollama...'
    & ollama create prospectiq-copilot -f (Join-Path $here 'Modelfile')
}

$env:PORT = "$Port"
$proc = Start-Process -FilePath 'node' -ArgumentList 'server.mjs' -WorkingDirectory $here -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput (Join-Path $here 'service.log') -RedirectStandardError (Join-Path $here 'service.err.log')
$proc.Id | Set-Content $pidFile

for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Milliseconds 250
    try {
        $h = Invoke-RestMethod "http://127.0.0.1:$Port/health" -TimeoutSec 3
        Write-Host "AI service up on http://127.0.0.1:$Port (pid $($proc.Id)) - model $($h.model): $($h.status)"
        return
    } catch {}
}
throw "AI service did not become healthy; see $here\service.err.log"
