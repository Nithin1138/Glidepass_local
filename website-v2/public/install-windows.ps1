# LANpad Windows Installer Script
$ErrorActionPreference = 'Stop'

Write-Host "🚀 Installing LANpad for Windows..." -ForegroundColor Green

# Define paths
$DownloadUrl = "https://lanpad.vercel.app/downloads/LANpad_Windows.zip"
$TempZip = "$env:TEMP\LANpad_Windows.zip"
$InstallDir = "$env:LOCALAPPDATA\LANpad"

# 1. Download the zip
Write-Host "📥 Downloading LANpad bundle..." -ForegroundColor Cyan
Invoke-WebRequest -Uri $DownloadUrl -OutFile $TempZip -UseBasicParsing

# 2. Extract files
Write-Host "📦 Extracting files to $InstallDir..." -ForegroundColor Cyan
if (Test-Path $InstallDir) {
    Remove-Item -Path $InstallDir -Recurse -Force
}
New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
Expand-Archive -Path $TempZip -DestinationPath $InstallDir -Force

# 3. Clean up zip
Remove-Item -Path $TempZip -Force

# 4. Create Desktop Shortcut
Write-Host "✨ Creating Desktop Shortcut..." -ForegroundColor Cyan
$WshShell = New-Object -ComObject WScript.Shell
$ShortcutPath = "$env:USERPROFILE\Desktop\LANpad.lnk"
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "$InstallDir\LANpad\LANpad.exe"
$Shortcut.WorkingDirectory = "$InstallDir\LANpad"
$Shortcut.Save()

Write-Host "✅ Installed successfully! Double-click the LANpad icon on your Desktop to start." -ForegroundColor Green
