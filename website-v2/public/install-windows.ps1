# LANpad Windows Installer Script (Release v1.3.4)
$ErrorActionPreference = 'Stop'

Write-Host "🚀 Installing LANpad for Windows (v1.3.4)..." -ForegroundColor Green
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

# Define mirrors (downloading full application package with all required DLLs)
$TagUrl = "https://github.com/Nithin1138/Glidepass_local/releases/download/v1.3.4/LANpad-Windows.zip"
$LatestUrl = "https://github.com/Nithin1138/Glidepass_local/releases/latest/download/LANpad-Windows.zip"
$FallbackUrl = "https://lanpad.app/api/download?platform=windows"

$InstallDir = "$env:LOCALAPPDATA\LANpad"
$ZipPath = Join-Path $InstallDir "LANpad-Windows.zip"
$ExePath = Join-Path $InstallDir "LANpad.exe"

# 1. Prepare installation directory & process management
Write-Host "📥 Downloading LANpad release bundle..." -ForegroundColor Cyan
if (Test-Path $InstallDir) {
    Get-Process -Name "LANpad" -ErrorAction SilentlyContinue | Stop-Process -Force
    Get-Process -Name "lanpad" -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Seconds 1
} else {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

$Downloaded = $false

foreach ($Url in @($TagUrl, $LatestUrl, $FallbackUrl)) {
    try {
        Invoke-WebRequest -Uri $Url -OutFile $ZipPath -UseBasicParsing -UserAgent "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        if (Test-Path $ZipPath) {
            $ContentHeader = Get-Content -Path $ZipPath -Raw -TotalCount 10 -ErrorAction SilentlyContinue
            if ($ContentHeader -match "<!DOCTYPE" -or $ContentHeader -match "<html" -or $ContentHeader -match "var strBlockCategory") {
                Remove-Item -Path $ZipPath -Force -ErrorAction SilentlyContinue
                Write-Warning "Network/Firewall returned HTML block page from $Url. Trying next mirror..."
                continue
            }
            $Downloaded = $true
            break
        }
    } catch {
        Write-Warning "Download from $Url failed: $_"
    }
}

if (-not $Downloaded -or -not (Test-Path $ZipPath)) {
    Write-Host "❌ Installation Failed: Could not download LANpad application bundle." -ForegroundColor Red
    Write-Host "Your network proxy or university campus firewall blocked the download." -ForegroundColor Red
    Write-Host "Please download LANpad directly from GitHub Releases: https://github.com/Nithin1138/Glidepass_local/releases/tag/v1.3.4" -ForegroundColor Yellow
    exit 1
}

# 2. Extract zip containing LANpad.exe and all required DLL plugins
Write-Host "📦 Extracting application files and DLL plugins..." -ForegroundColor Cyan
try {
    Expand-Archive -Path $ZipPath -DestinationPath $InstallDir -Force
    Remove-Item -Path $ZipPath -Force -ErrorAction SilentlyContinue

    # Ensure executable exists (check LANpad.exe or lanpad.exe)
    if (-not (Test-Path $ExePath)) {
        $AltExe = Join-Path $InstallDir "lanpad.exe"
        if (Test-Path $AltExe) {
            $ExePath = $AltExe
        }
    }
} catch {
    Write-Warning "Failed to extract ZIP package: $_"
}

if (-not (Test-Path $ExePath)) {
    Write-Host "❌ Installation Failed: Could not find LANpad.exe inside extracted directory $InstallDir" -ForegroundColor Red
    exit 1
}

# 3. Create Desktop Shortcut
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
