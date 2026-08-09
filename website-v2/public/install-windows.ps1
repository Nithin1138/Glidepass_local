# LANpad Windows Installer Script
$ErrorActionPreference = 'Stop'

Write-Host "🚀 Installing LANpad for Windows..." -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  SECURITY NOTICE & TRUST DISCLOSURE:" -ForegroundColor Yellow
Write-Host "This installer executes a remote script to download and install LANpad." -ForegroundColor Yellow
Write-Host "While this script is provided by the LANpad project for convenience," -ForegroundColor Yellow
Write-Host "running scripts directly from the internet is a potential security risk." -ForegroundColor Yellow
Write-Host "You should always review the source code of this script at:" -ForegroundColor Yellow
Write-Host "https://github.com/Nithin1138/Glidepass_local/blob/main/website-v2/public/install-windows.ps1" -ForegroundColor Yellow
Write-Host "before executing it." -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  LEGAL DISCLAIMER:" -ForegroundColor Yellow
Write-Host "LANpad is provided AS IS without warranty of any kind." -ForegroundColor Yellow
Write-Host "The developers, contributors, and founders assume NO liability or responsibility" -ForegroundColor Yellow
Write-Host "for any misuse of this tool, including academic misconduct, policy violations," -ForegroundColor Yellow
Write-Host "data security issues, or system disruption." -ForegroundColor Yellow
Write-Host "By continuing, you agree that you use this software at your own risk." -ForegroundColor Yellow
Write-Host ""

# Define paths
$PrimaryUrl = "https://github.com/Nithin1138/Glidepass_local/releases/latest/download/LANpad.exe"
$FallbackUrl = "https://lanpad.app/api/download?platform=windows"
$InstallDir = "$env:LOCALAPPDATA\LANpad"
$ExePath = Join-Path $InstallDir "LANpad.exe"

# 1. Prepare installation directory & process management
Write-Host "📥 Downloading LANpad executable..." -ForegroundColor Cyan
if (Test-Path $InstallDir) {
    # Force stop any running LANpad processes so we can overwrite
    Get-Process -Name "LANpad" -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Seconds 1
} else {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

$Downloaded = $false

foreach ($Url in @($PrimaryUrl, $FallbackUrl)) {
    try {
        Invoke-WebRequest -Uri $Url -OutFile $ExePath -UseBasicParsing -UserAgent "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        if (Test-Path $ExePath) {
            $ContentHeader = Get-Content -Path $ExePath -Raw -TotalCount 10 -ErrorAction SilentlyContinue
            if ($ContentHeader -match "<!DOCTYPE" -or $ContentHeader -match "<html" -or $ContentHeader -match "var strBlockCategory") {
                Remove-Item -Path $ExePath -Force -ErrorAction SilentlyContinue
                Write-Warning "Received HTML block/error page from $Url. Trying next mirror..."
                continue
            }
            $Downloaded = $true
            break
        }
    } catch {
        Write-Warning "Download from $Url failed: $_"
    }
}

if (-not $Downloaded -or -not (Test-Path $ExePath)) {
    Write-Host "❌ Installation Failed: Could not download LANpad binary executable." -ForegroundColor Red
    Write-Host "The network proxy, firewall, or server returned an error or block page instead of the application installer." -ForegroundColor Red
    Write-Host "Please download LANpad directly from: https://github.com/Nithin1138/Glidepass_local/releases" -ForegroundColor Yellow
    exit 1
}

# 2. Create Desktop Shortcut
try {
    Write-Host "✨ Creating Desktop Shortcut..." -ForegroundColor Cyan
    $DesktopPath = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
    if (-not $DesktopPath -or -not (Test-Path $DesktopPath)) {
        $DesktopPath = "$env:USERPROFILE\Desktop"
    }
    if (Test-Path $DesktopPath) {
        $WshShell = New-Object -ComObject WScript.Shell
        $ShortcutPath = Join-Path $DesktopPath "LANpad.lnk"
        $Shortcut = $WshShell.CreateShortcut($ShortcutPath)
        $Shortcut.TargetPath = $ExePath
        $Shortcut.WorkingDirectory = $InstallDir
        $Shortcut.Save()
        Write-Host "✅ Installed successfully! Double-click the LANpad icon on your Desktop to start." -ForegroundColor Green
    } else {
        Write-Warning "Could not locate Desktop folder. LANpad is installed at $ExePath"
    }
} catch {
    Write-Warning "Unable to create Desktop shortcut: $_. You can run LANpad directly from $ExePath"
}
