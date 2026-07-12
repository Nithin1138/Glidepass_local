# ============================================================
#   LANpad Installer for Windows (PowerShell)
#   https://github.com/Nithin1138/Glidepass_local
# ============================================================
#   Run with:
#   irm https://raw.githubusercontent.com/Nithin1138/Glidepass_local/checkall/install.ps1 | iex
# ============================================================

$repo  = "Nithin1138/Glidepass_local"
$asset = "LANpad.exe"
$dest  = "$env:USERPROFILE\Downloads\LANpad.exe"

$ErrorActionPreference = "Stop"

function Write-Step($n, $total, $msg) {
    Write-Host "  " -NoNewline
    Write-Host "[$n/$total]" -ForegroundColor Cyan -NoNewline
    Write-Host " $msg"
}

function Write-Ok($msg) {
    Write-Host "  " -NoNewline
    Write-Host ([char]10003) -ForegroundColor Green -NoNewline
    Write-Host " $msg"
}

function Write-Fail($msg) {
    Write-Host "  " -NoNewline
    Write-Host "x" -ForegroundColor Red -NoNewline
    Write-Host " $msg"
}

Clear-Host
Write-Host ""
Write-Host "  ██╗      █████╗ ███╗   ██╗██████╗  █████╗ ██████╗ " -ForegroundColor Cyan
Write-Host "  ██║     ██╔══██╗████╗  ██║██╔══██╗██╔══██╗██╔══██╗" -ForegroundColor Cyan
Write-Host "  ██║     ███████║██╔██╗ ██║██████╔╝███████║██║  ██║" -ForegroundColor Cyan
Write-Host "  ██║     ██╔══██║██║╚██╗██║██╔═══╝ ██╔══██║██║  ██║" -ForegroundColor Cyan
Write-Host "  ███████╗██║  ██║██║ ╚████║██║     ██║  ██║██████╔╝" -ForegroundColor Cyan
Write-Host "  ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝     ╚═╝  ╚═╝╚═════╝ " -ForegroundColor Cyan
Write-Host ""
Write-Host "  The fast, local keyboard & file bridge for your devices" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  ────────────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host ""

# ── Disclaimer ───────────────────────────────────────────────
Write-Host "  WARNING  DISCLAIMER & TERMS" -ForegroundColor Yellow
Write-Host ""
Write-Host "  By installing LANpad, you agree to the following:" -ForegroundColor DarkGray
Write-Host "    - LANpad runs a local HTTP server on your machine" -ForegroundColor DarkGray
Write-Host "    - It may create an outbound tunnel (Cloudflare) for relay mode" -ForegroundColor DarkGray
Write-Host "    - No data is stored or sent to external servers by default" -ForegroundColor DarkGray
Write-Host "    - Use only on trusted networks" -ForegroundColor DarkGray
Write-Host "    - Source: https://github.com/$repo" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  ────────────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host ""
Read-Host "  Press ENTER to accept and continue, or Ctrl+C to cancel"
Write-Host ""

# ── System Check ─────────────────────────────────────────────
Write-Step 1 4 "Checking system..."
$os = [System.Environment]::OSVersion.VersionString
Write-Ok "Windows detected  ($os)"
Start-Sleep -Milliseconds 300

# ── Fetch Release ─────────────────────────────────────────────
Write-Host ""
Write-Step 2 4 "Fetching latest release from GitHub..."
$api = "https://api.github.com/repos/$repo/releases/latest"
$release = Invoke-RestMethod -Uri $api -UseBasicParsing
$fileAsset = $release.assets | Where-Object { $_.name -eq $asset } | Select-Object -First 1
$version = $release.tag_name

if (-not $fileAsset) {
    Write-Fail "Could not find $asset in release $version"
    Write-Host "  Download manually: https://github.com/$repo/releases/latest" -ForegroundColor DarkGray
    exit 1
}

$sizeMB = [math]::Round($fileAsset.size / 1MB, 1)
Write-Ok "Found version $version  ($sizeMB MB)"
Start-Sleep -Milliseconds 300

# ── Download with Progress ────────────────────────────────────
Write-Host ""
Write-Step 3 4 "Downloading LANpad $version..."
Write-Host ""

$url = $fileAsset.browser_download_url
$webClient = New-Object System.Net.WebClient
$startTime = Get-Date

# Register progress event for real-time tracking
$progressHandler = Register-ObjectEvent -InputObject $webClient -EventName DownloadProgressChanged -Action {
    $pct     = $Event.SourceEventArgs.ProgressPercentage
    $dlMB    = [math]::Round($Event.SourceEventArgs.BytesReceived / 1MB, 1)
    $totalMB = [math]::Round($Event.SourceEventArgs.TotalBytesToReceive / 1MB, 1)
    $elapsed = (Get-Date) - $global:dlStart
    $speed   = if ($elapsed.TotalSeconds -gt 0) { [math]::Round($dlMB / $elapsed.TotalSeconds, 1) } else { 0 }
    $eta     = if ($speed -gt 0) { [math]::Round(($totalMB - $dlMB) / $speed) } else { "?" }
    Write-Progress -Activity "Downloading LANpad" `
        -Status "$dlMB MB / $totalMB MB  |  $speed MB/s  |  ETA: ${eta}s" `
        -PercentComplete $pct
}

$completedHandler = Register-ObjectEvent -InputObject $webClient -EventName DownloadFileCompleted -Action {
    $global:dlDone = $true
}

$global:dlStart = $startTime
$global:dlDone  = $false

$webClient.DownloadFileAsync([uri]$url, $dest)

# Poll until done
while (-not $global:dlDone) { Start-Sleep -Milliseconds 200 }

Write-Progress -Activity "Downloading LANpad" -Completed
Unregister-Event -SourceIdentifier $progressHandler.Name -ErrorAction SilentlyContinue
Unregister-Event -SourceIdentifier $completedHandler.Name -ErrorAction SilentlyContinue
$webClient.Dispose()

$elapsed = [math]::Round(((Get-Date) - $startTime).TotalSeconds, 1)
$actualMB = [math]::Round((Get-Item $dest).Length / 1MB, 1)
Write-Ok "Downloaded successfully  ($actualMB MB in ${elapsed}s)"
Start-Sleep -Milliseconds 300

# ── Launch ───────────────────────────────────────────────────
Write-Host ""
Write-Step 4 4 "Launching LANpad $version..."
Start-Process $dest
Start-Sleep -Milliseconds 800

Write-Host ""
Write-Host "  ────────────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  " -NoNewline
Write-Host ([char]10003) -ForegroundColor Green -NoNewline
Write-Host " LANpad $version installed and running!" -ForegroundColor White
Write-Host ""
Write-Host "  Next steps:" -ForegroundColor DarkGray
Write-Host "    1. Let LANpad launch — it appears in your system tray" -ForegroundColor DarkGray
Write-Host "    2. Open the LANpad mobile app on your phone" -ForegroundColor DarkGray
Write-Host "    3. Scan the QR code shown in LANpad" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Need help? https://github.com/$repo/issues" -ForegroundColor DarkGray
Write-Host ""
