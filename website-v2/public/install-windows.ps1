# LANpad Windows Installer Script (Release v1.4.1)
$ErrorActionPreference = 'Stop'

Write-Host "Installing LANpad for Windows (v1.4.1)..." -ForegroundColor Green
Write-Host ""
Write-Host "LEGAL DISCLAIMER:" -ForegroundColor Yellow
Write-Host "LANpad is provided AS IS without warranty of any kind." -ForegroundColor Yellow
Write-Host "The developers assume no liability for misuse." -ForegroundColor Yellow
Write-Host ""

$InstallDir = Join-Path $env:LOCALAPPDATA "LANpad"
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

# Release mirrors
$Mirrors = @(
    "https://github.com/Nithin1138/Glidepass_local/releases/download/v1.4.1/LANpad-Windows.zip",
    "https://github.com/Nithin1138/Glidepass_local/releases/latest/download/LANpad-Windows.zip",
    "https://github.com/Nithin1138/Glidepass_local/releases/download/v1.4.0/LANpad-Windows.zip"
)

Write-Host "Downloading LANpad application bundle..." -ForegroundColor Cyan
$Downloaded = $false

foreach ($Url in $Mirrors) {
    try {
        if (Test-Path $ZipPath) { Remove-Item -Path $ZipPath -Force -ErrorAction SilentlyContinue }
        Write-Host "Trying mirror: $Url" -ForegroundColor DarkGray
        
        # Try curl.exe if present (most reliable on Windows 10/11)
        if (Get-Command curl.exe -ErrorAction SilentlyContinue) {
            & curl.exe -sL -f -o "$ZipPath" "$Url"
        } else {
            (New-Object System.Net.WebClient).DownloadFile("$Url", "$ZipPath")
        }

        if (Test-Path $ZipPath) {
            $Size = (Get-Item $ZipPath).Length
            if ($Size -gt 1000000) {
                $Downloaded = $true
                Unblock-File -Path "$ZipPath" -ErrorAction SilentlyContinue
                Write-Host "Download complete! ($([math]::Round($Size/1MB,1)) MB)" -ForegroundColor Green
                break
            }
        }
    } catch {
        Write-Warning "Mirror failed: $_"
    }
}

if (-not $Downloaded) {
    Write-Host "ERROR: Could not download LANpad application bundle." -ForegroundColor Red
    Write-Host "Please download LANpad manually: https://github.com/Nithin1138/Glidepass_local/releases/tag/v1.4.1" -ForegroundColor Yellow
    exit 1
}

# Clean old installation files before extracting new release
Get-ChildItem -Path $InstallDir | Where-Object { $_.FullName -ne $ZipPath } | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

# Extract package
Write-Host "Extracting application files and DLL plugins..." -ForegroundColor Cyan
try {
    Expand-Archive -Path $ZipPath -DestinationPath $InstallDir -Force
    Remove-Item -Path $ZipPath -Force -ErrorAction SilentlyContinue
} catch {
    Write-Host "ERROR: Extraction failed." -ForegroundColor Red
    exit 1
}

# Flatten directory if unzipped into a subfolder
$SubExe = Get-ChildItem -Path $InstallDir -Filter "*lanpad*.exe" -Recurse | Select-Object -First 1
if ($SubExe -and ($SubExe.DirectoryName -ne $InstallDir)) {
    $SubDir = $SubExe.DirectoryName
    Get-ChildItem -Path $SubDir | Move-Item -Destination $InstallDir -Force -ErrorAction SilentlyContinue
    Remove-Item -Path $SubDir -Recurse -Force -ErrorAction SilentlyContinue
}

if (-not (Test-Path $ExePath)) {
    $AltExe = Join-Path $InstallDir "lanpad.exe"
    if (Test-Path $AltExe) { $ExePath = $AltExe }
}

if (-not (Test-Path $ExePath) -or (Get-Item $ExePath).Length -lt 100000) {
    Write-Host "ERROR: LANpad.exe not found or invalid after extraction." -ForegroundColor Red
    exit 1
}

# Create Desktop Shortcut
try {
    $DesktopPath = [System.Environment]::GetFolderPath("Desktop")
    if (-not (Test-Path $DesktopPath)) { $DesktopPath = "$env:USERPROFILE\Desktop" }
    if (Test-Path $DesktopPath) {
        $WshShell = New-Object -ComObject WScript.Shell
        $ShortcutPath = Join-Path $DesktopPath "LANpad.lnk"
        if (Test-Path $ShortcutPath) { Remove-Item -Path $ShortcutPath -Force -ErrorAction SilentlyContinue }
        $Shortcut = $WshShell.CreateShortcut($ShortcutPath)
        $Shortcut.TargetPath = $ExePath
        $Shortcut.WorkingDirectory = $InstallDir
        $Shortcut.IconLocation = "$ExePath,0"
        $Shortcut.Save()
    }
} catch { }

# Unblock all extracted executables and DLLs
Get-ChildItem -Path $InstallDir -Recurse | Unblock-File -ErrorAction SilentlyContinue

Write-Host "LANpad installed successfully!" -ForegroundColor Green
Write-Host "Launching LANpad..." -ForegroundColor Cyan
Start-Process -FilePath $ExePath -WorkingDirectory $InstallDir
