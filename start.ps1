$ROOT = "c:\Users\chandu s\OneDrive\Desktop\cy-023-iot-monitoring"
$BACKEND = "$ROOT\backend"
$ENV_FILE = "$BACKEND\.env"
$VENV = "$ROOT\.venv\Scripts\Activate.ps1"

Write-Host ""
Write-Host "===== PocketIoT Auto-Start =====" -ForegroundColor Cyan
Write-Host ""

# Activate venv
if (Test-Path $VENV) {
    . $VENV
    Write-Host "venv activated" -ForegroundColor Green
}

# Kill old ngrok
Get-Process -Name "ngrok" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 500

# Start ngrok
Write-Host "Starting ngrok on port 5000..." -ForegroundColor Cyan
Start-Process -FilePath "ngrok" -ArgumentList "http 5000" -WindowStyle Minimized

# Wait for ngrok API to be ready
Write-Host "Waiting for ngrok..." -ForegroundColor Yellow
$ngrokUrl = $null
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Milliseconds 800
    try {
        $r = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -TimeoutSec 2 -ErrorAction Stop
        $t = $r.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1
        if ($t) {
            $ngrokUrl = $t.public_url
            break
        }
    } catch {}
}

if ($ngrokUrl) {
    Write-Host "ngrok HTTPS URL: $ngrokUrl" -ForegroundColor Green

    # Write APP_URL to .env
    $lines = @()
    if (Test-Path $ENV_FILE) {
        $lines = Get-Content $ENV_FILE | Where-Object { $_ -notmatch "^APP_URL=" }
    }
    $lines += "APP_URL=$ngrokUrl"
    Set-Content -Path $ENV_FILE -Value $lines -Encoding UTF8
    Write-Host "Written to .env: APP_URL=$ngrokUrl" -ForegroundColor Green
} else {
    Write-Host "Could not get ngrok URL. Make sure ngrok is installed." -ForegroundColor Red
    Write-Host "Download: https://ngrok.com/download" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Starting Flask backend..." -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor DarkGray
Set-Location $BACKEND
python app.py
