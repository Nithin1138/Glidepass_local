$repo = "Nithin1138/Glidepass_local"
$api  = "https://api.github.com/repos/$repo/releases/latest"

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "       LANpad Installer for Windows   " -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Fetching latest release..." -ForegroundColor Yellow
$release = Invoke-RestMethod -Uri $api -UseBasicParsing
$asset   = $release.assets | Where-Object { $_.name -eq "LANpad.exe" } | Select-Object -First 1

if (-not $asset) {
    Write-Host "Could not find LANpad.exe in the latest release." -ForegroundColor Red
    Write-Host "Please download manually from: https://github.com/$repo/releases/latest" -ForegroundColor Red
    exit 1
}

$dest = "$env:USERPROFILE\Downloads\LANpad.exe"
Write-Host "Downloading LANpad.exe..." -ForegroundColor Yellow
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $dest -UseBasicParsing

Write-Host ""
Write-Host "Download complete: $dest" -ForegroundColor Green
Write-Host "Launching LANpad..." -ForegroundColor Green
Start-Process $dest

Write-Host ""
Write-Host "Enjoy LANpad!" -ForegroundColor Cyan
