# ============================================================
#   LANpad Installer for Windows (PowerShell)
#   https://github.com/Nithin1138/Glidepass_local
# ============================================================
#   Run with:
#   powershell -c "irm https://raw.githubusercontent.com/Nithin1138/Glidepass_local/main/install.ps1 | iex"
# ============================================================

$repo = "Nithin1138/Glidepass_local"
$InstallDir = "$env:LOCALAPPDATA\LANpad"
$ZipPath = Join-Path $InstallDir "LANpad-Windows.zip"
$ExePath = Join-Path $InstallDir "LANpad.exe"

$ErrorActionPreference = "SilentlyContinue"

function Write-Step($n, $total, $msg) {
    Write-Host "  [$n/$total] $msg" -ForegroundColor Cyan
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

Write-Host "  DISCLAIMER:" -ForegroundColor Yellow
Write-Host "  LANpad is provided AS IS. Use at your own risk." -ForegroundColor DarkGray
Write-Host "  Source: https://github.com/$repo" -ForegroundColor DarkGray
Write-Host ""

# Prepare install dir
Write-Step 1 4 "Preparing installation directory..."
if (Test-Path $InstallDir) {
    Get-Process -Name "LANpad" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Get-Process -Name "lanpad" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
} else {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

# Download from mirrors
Write-Step 2 4 "Downloading LANpad..."

$Mirrors = @(
    "https://github.com/Nithin1138/Glidepass_local/releases/latest/download/LANpad-Windows.zip",
    "https://github.com/Nithin1138/Glidepass_local/releases/download/v1.3.4/LANpad-Windows.zip",
    "https://github.com/Nithin1138/Glidepass_local/releases/download/v1.3.3/LANpad-Windows.zip"
)

$Downloaded = $false

foreach ($Url in $Mirrors) {
    try {
        if (Test-Path $ZipPath) { Remove-Item -Path $ZipPath -Force -ErrorAction SilentlyContinue }
        Write-Host "  Trying: $Url" -ForegroundColor DarkGray
        Invoke-WebRequest -Uri $Url -OutFile $ZipPath -UseBasicParsing -TimeoutSec 120 `
            -UserAgent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        $FileSize = (Get-Item $ZipPath -ErrorAction SilentlyContinue).Length
        if ($FileSize -gt 500000) {
            Write-Host "  Downloaded ($([math]::Round($FileSize/1MB,1)) MB)" -ForegroundColor Green
            $Downloaded = $true
            break
        } else {
            Write-Host "  File too small, trying next mirror..." -ForegroundColor DarkGray
        }
    } catch {
        Write-Host "  Mirror failed, trying next..." -ForegroundColor DarkGray
    }
}

if (-not $Downloaded) {
    Write-Host ""
    Write-Host "  ERROR: Could not download LANpad." -ForegroundColor Red
    Write-Host "  Please download manually from:" -ForegroundColor Yellow
    Write-Host "  https://github.com/$repo/releases/latest" -ForegroundColor Cyan
    if (Test-Path $ZipPath) { Remove-Item -Path $ZipPath -Force -ErrorAction SilentlyContinue }
    exit 1
}

# Extract
Write-Step 3 4 "Extracting files..."
try {
    Expand-Archive -Path $ZipPath -DestinationPath $InstallDir -Force
    Remove-Item -Path $ZipPath -Force -ErrorAction SilentlyContinue
    Write-Host "  Extracted successfully!" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Extraction failed." -ForegroundColor Red
    exit 1
}

# Find exe
if (-not (Test-Path $ExePath)) {
    $AltExe = Join-Path $InstallDir "lanpad.exe"
    if (Test-Path $AltExe) { $ExePath = $AltExe }
}

if (-not (Test-Path $ExePath)) {
    Write-Host "  ERROR: LANpad.exe not found after extraction." -ForegroundColor Red
    exit 1
}

# Desktop shortcut
try {
    $DesktopPath = [System.Environment]::GetFolderPath("Desktop")
    if (-not (Test-Path $DesktopPath)) { $DesktopPath = "$env:USERPROFILE\Desktop" }
    if (Test-Path $DesktopPath) {
        $WshShell = New-Object -ComObject WScript.Shell
        $Shortcut = $WshShell.CreateShortcut((Join-Path $DesktopPath "LANpad.lnk"))
        $Shortcut.TargetPath = $ExePath
        $Shortcut.WorkingDirectory = $InstallDir
        $Shortcut.IconLocation = "$ExePath,0"
        $Shortcut.Save()
    }
} catch { }

# Launch!
Write-Step 4 4 "Launching LANpad..."
Start-Process $ExePath

Write-Host ""
Write-Host "  ────────────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host "  LANpad is installed and running!" -ForegroundColor Green
Write-Host ""
Write-Host "  Next steps:" -ForegroundColor DarkGray
Write-Host "    1. LANpad will appear in your system tray" -ForegroundColor DarkGray
Write-Host "    2. Open the LANpad mobile app on your phone" -ForegroundColor DarkGray
Write-Host "    3. Scan the QR code shown in LANpad" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Need help? https://github.com/$repo/issues" -ForegroundColor DarkGray
Write-Host ""
