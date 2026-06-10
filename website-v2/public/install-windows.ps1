# GlidePass Windows Installer Script
$ErrorActionPreference = 'Stop'

Write-Host "🚀 Installing GlidePass for Windows..." -ForegroundColor Green

# Define paths
$DownloadUrl = "https://glidepass.vercel.app/downloads/GlidePass_Windows.zip"
$TempZip = "$env:TEMP\GlidePass_Windows.zip"
$InstallDir = "$env:LOCALAPPDATA\GlidePass"

# 1. Download the zip
Write-Host "📥 Downloading GlidePass bundle..." -ForegroundColor Cyan
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
$ShortcutPath = "$env:USERPROFILE\Desktop\GlidePass.lnk"
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "$InstallDir\GlidePass\GlidePass.exe"
$Shortcut.WorkingDirectory = "$InstallDir\GlidePass"
$Shortcut.Save()

Write-Host "✅ Installed successfully! Double-click the GlidePass icon on your Desktop to start." -ForegroundColor Green
