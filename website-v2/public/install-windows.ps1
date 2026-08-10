# LANpad Windows Installer Script
$ErrorActionPreference = 'SilentlyContinue'

Write-Host "Installing LANpad for Windows..." -ForegroundColor Green
Write-Host ""
Write-Host "  LEGAL DISCLAIMER:" -ForegroundColor Yellow
Write-Host "  LANpad is provided AS IS without warranty of any kind." -ForegroundColor Yellow
Write-Host "  The developers, contributors, and founders assume NO liability or responsibility" -ForegroundColor Yellow
Write-Host "  for any misuse of this tool, including academic misconduct, policy violations," -ForegroundColor Yellow
Write-Host "  data security issues, or system disruption." -ForegroundColor Yellow
Write-Host "  By continuing, you agree that you use this software at your own risk." -ForegroundColor Yellow
Write-Host ""

$InstallDir = "$env:LOCALAPPDATA\LANpad"
$ZipPath = Join-Path $InstallDir "LANpad-Windows.zip"
$ExePath = Join-Path $InstallDir "LANpad.exe"

# Stop running processes
if (Test-Path $InstallDir) {
    Get-Process -Name "LANpad" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Get-Process -Name "lanpad" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
} else {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

# Try release mirrors in order (from newest to oldest stable)
$Mirrors = @(
    "https://github.com/Nithin1138/Glidepass_local/releases/latest/download/LANpad-Windows.zip",
    "https://github.com/Nithin1138/Glidepass_local/releases/download/v1.3.4/LANpad-Windows.zip",
    "https://github.com/Nithin1138/Glidepass_local/releases/download/v1.3.3/LANpad-Windows.zip"
)

Write-Host "  Downloading LANpad release bundle..." -ForegroundColor Cyan
$Downloaded = $false

foreach ($Url in $Mirrors) {
    try {
        if (Test-Path $ZipPath) { Remove-Item -Path $ZipPath -Force -ErrorAction SilentlyContinue }
        Write-Host "  Trying: $Url" -ForegroundColor DarkGray
        Invoke-WebRequest -Uri $Url -OutFile $ZipPath -UseBasicParsing -TimeoutSec 60 `
            -UserAgent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        if ((Test-Path $ZipPath) -and ((Get-Item $ZipPath -ErrorAction SilentlyContinue).Length -gt 500000)) {
            $Downloaded = $true
            Write-Host "  Download complete!" -ForegroundColor Green
            break
        }
    } catch {
        Write-Host "  Failed from this mirror, trying next..." -ForegroundColor DarkGray
    }
}

if (-not $Downloaded) {
    Write-Host "" 
    Write-Host "  ERROR: Could not download LANpad from any mirror." -ForegroundColor Red
    Write-Host "  This may be due to your network or firewall blocking GitHub." -ForegroundColor Red
    Write-Host "  Please download manually from:" -ForegroundColor Yellow
    Write-Host "  https://github.com/Nithin1138/Glidepass_local/releases/latest" -ForegroundColor Cyan
    if (Test-Path $ZipPath) { Remove-Item -Path $ZipPath -Force -ErrorAction SilentlyContinue }
    exit 1
}

# Extract
Write-Host "  Extracting files..." -ForegroundColor Cyan
try {
    Expand-Archive -Path $ZipPath -DestinationPath $InstallDir -Force
    Remove-Item -Path $ZipPath -Force -ErrorAction SilentlyContinue
} catch {
    Write-Host "  ERROR: Failed to extract package." -ForegroundColor Red
    exit 1
}

# Find executable
if (-not (Test-Path $ExePath)) {
    $AltExe = Join-Path $InstallDir "lanpad.exe"
    if (Test-Path $AltExe) { $ExePath = $AltExe }
}

if (-not (Test-Path $ExePath)) {
    Write-Host "  ERROR: LANpad.exe not found after extraction." -ForegroundColor Red
    exit 1
}

# Create Desktop Shortcut
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

Write-Host ""
Write-Host "  LANpad installed successfully!" -ForegroundColor Green
Write-Host "  Launching LANpad..." -ForegroundColor Cyan
Start-Process $ExePath
Write-Host ""
Write-Host "  Double-click the LANpad icon on your Desktop anytime to start." -ForegroundColor DarkGray
Write-Host ""
