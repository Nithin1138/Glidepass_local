# ============================================================
#   LANpad Installer for Windows (PowerShell)
#   https://github.com/Nithin1138/Glidepass_local
# ============================================================
#   Run with:
#   powershell -c "irm https://raw.githubusercontent.com/Nithin1138/Glidepass_local/main/install.ps1 | iex"
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

# ── System Check ─────────────────────────────────────────────
Write-Step 1 3 "Checking system..."
$os = [System.Environment]::OSVersion.VersionString
Write-Ok "Windows detected ($os)"
Start-Sleep -Milliseconds 300

# ── Fetch Release ─────────────────────────────────────────────
Write-Host ""
Write-Step 2 3 "Downloading LANpad Windows Executable..."

$TagUrl = "https://github.com/Nithin1138/Glidepass_local/releases/download/v1.3.3/LANpad.exe"
$LatestUrl = "https://github.com/Nithin1138/Glidepass_local/releases/latest/download/LANpad.exe"

$Downloaded = $false

foreach ($url in @($TagUrl, $LatestUrl)) {
    try {
        Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing -UserAgent "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        if (Test-Path $dest) {
            $header = Get-Content -Path $dest -Raw -TotalCount 10 -ErrorAction SilentlyContinue
            if ($header -match "<!DOCTYPE" -or $header -match "<html") {
                Remove-Item -Path $dest -Force -ErrorAction SilentlyContinue
                continue
            }
            $Downloaded = $true
            break
        }
    } catch {}
}

if (-not $Downloaded -or -not (Test-Path $dest)) {
    Write-Fail "Could not download LANpad.exe from GitHub Releases"
    Write-Host "  Download manually: https://github.com/$repo/releases/tag/v1.3.3" -ForegroundColor Yellow
    exit 1
}

$actualMB = [math]::Round((Get-Item $dest).Length / 1MB, 1)
Write-Ok "Downloaded LANpad.exe ($actualMB MB)"
Start-Sleep -Milliseconds 300

# ── Launch ───────────────────────────────────────────────────
Write-Host ""
Write-Step 3 3 "Launching LANpad..."
Start-Process $dest
Start-Sleep -Milliseconds 800

Write-Host ""
Write-Host "  ────────────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  " -NoNewline
Write-Host ([char]10003) -ForegroundColor Green -NoNewline
Write-Host " LANpad installed and running!" -ForegroundColor White
Write-Host ""
Write-Host "  Next steps:" -ForegroundColor DarkGray
Write-Host "    1. Let LANpad launch — it appears in your system tray" -ForegroundColor DarkGray
Write-Host "    2. Open the LANpad mobile app on your phone" -ForegroundColor DarkGray
Write-Host "    3. Scan the QR code shown in LANpad" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Need help? https://github.com/$repo/issues" -ForegroundColor DarkGray
Write-Host ""
