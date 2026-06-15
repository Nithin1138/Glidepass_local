# LANpad Windows Installer Script
$ErrorActionPreference = 'Stop'

Write-Host "🚀 Installing LANpad for Windows..." -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  LEGAL DISCLAIMER:" -ForegroundColor Yellow
Write-Host "LANpad is provided AS IS without warranty of any kind." -ForegroundColor Yellow
Write-Host "The developers, contributors, and founders assume NO liability or responsibility" -ForegroundColor Yellow
Write-Host "for any misuse of this tool, including academic misconduct, policy violations," -ForegroundColor Yellow
Write-Host "data security issues, or system disruption." -ForegroundColor Yellow
Write-Host "By continuing, you agree that you use this software at your own risk." -ForegroundColor Yellow
Write-Host ""

# Define paths
$DownloadUrl = "https://lanpad.vercel.app/downloads/LANpad.exe"
$InstallDir = "$env:LOCALAPPDATA\LANpad"
$ExePath = Join-Path $InstallDir "LANpad.exe"

# 1. Download the exe directly
Write-Host "📥 Downloading LANpad executable..." -ForegroundColor Cyan
if (Test-Path $InstallDir) {
    # Force stop any running LANpad processes so we can overwrite
    Get-Process -Name "LANpad" -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Seconds 1
} else {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

Invoke-WebRequest -Uri $DownloadUrl -OutFile $ExePath -UseBasicParsing

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
