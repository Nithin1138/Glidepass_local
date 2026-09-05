# ============================================================
#   LANpad Installer for Windows
#   https://github.com/Nithin1138/Glidepass_local
# ============================================================

$repo = "Nithin1138/Glidepass_local"
$InstallDir = Join-Path $env:LOCALAPPDATA "LANpad"
$ZipPath = Join-Path $InstallDir "LANpad-Windows.zip"
$ExePath = Join-Path $InstallDir "LANpad.exe"

$ErrorActionPreference = "Stop"

function Write-Step($n, $total, $msg) {
    Write-Host "  [$n/$total] $msg" -ForegroundColor Cyan
}

function Write-Ok($msg) {
    Write-Host "  [OK] $msg" -ForegroundColor Green
}

function Write-Fail($msg) {
    Write-Host "  [FAIL] $msg" -ForegroundColor Red
}

Clear-Host
Write-Host ""
Write-Host "  ================================================" -ForegroundColor Cyan
Write-Host "               LANpad Installer                   " -ForegroundColor Cyan
Write-Host "  ================================================" -ForegroundColor Cyan
Write-Host "  Fast local keyboard and file bridge for devices" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  ------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""

# Stop running processes
if (Test-Path $InstallDir) {
    Get-Process -Name "LANpad" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Get-Process -Name "lanpad" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
} else {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

# ── System Check ─────────────────────────────────────────────
Write-Step 1 4 "Checking system..."
$os = [System.Environment]::OSVersion.VersionString
Write-Ok "Windows detected ($os)"
Start-Sleep -Milliseconds 200

# ── Fetch Release Package ────────────────────────────────────
Write-Host ""
Write-Step 2 4 "Downloading LANpad application release bundle..."

$Mirrors = @(
    "https://github.com/$repo/releases/download/v1.4.0/LANpad-Windows.zip",
    "https://github.com/$repo/releases/latest/download/LANpad-Windows.zip",
    "https://github.com/$repo/releases/download/v1.3.9/LANpad-Windows.zip"
)

$Downloaded = $false

foreach ($url in $Mirrors) {
    try {
        if (Test-Path $ZipPath) { Remove-Item -Path $ZipPath -Force -ErrorAction SilentlyContinue }
        
        if (Get-Command curl.exe -ErrorAction SilentlyContinue) {
            & curl.exe -sL -f -o "$ZipPath" "$url"
        } else {
            (New-Object System.Net.WebClient).DownloadFile("$url", "$ZipPath")
        }

        if (Test-Path $ZipPath) {
            $Size = (Get-Item $ZipPath).Length
            if ($Size -gt 1000000) {
                $Downloaded = $true
                Unblock-File -Path "$ZipPath" -ErrorAction SilentlyContinue
                Write-Ok "Downloaded package ($([math]::Round($Size/1MB,1)) MB)"
                break
            }
        }
    } catch {}
}

if (-not $Downloaded) {
    Write-Fail "Could not download LANpad package from GitHub Releases"
    Write-Host "  Download manually: https://github.com/$repo/releases/tag/v1.4.0" -ForegroundColor Yellow
    exit 1
}

Start-Sleep -Milliseconds 200

# ── Extract & Flatten Package ──────────────────────────────────
Write-Host ""
Write-Step 3 4 "Extracting application files and plugin dependencies..."
try {
    # Clean old binaries except the zip
    Get-ChildItem -Path $InstallDir | Where-Object { $_.FullName -ne $ZipPath } | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

    Expand-Archive -Path $ZipPath -DestinationPath $InstallDir -Force
    Remove-Item -Path $ZipPath -Force -ErrorAction SilentlyContinue

    # Move files out of subfolder if zip contained top-level folder
    $SubExe = Get-ChildItem -Path $InstallDir -Filter "*lanpad*.exe" -Recurse | Select-Object -First 1
    if ($SubExe -and ($SubExe.DirectoryName -ne $InstallDir)) {
        $SubDir = $SubExe.DirectoryName
        Get-ChildItem -Path $SubDir | Move-Item -Destination $InstallDir -Force -ErrorAction SilentlyContinue
        Remove-Item -Path $SubDir -Recurse -Force -ErrorAction SilentlyContinue
    }

    if (-not (Test-Path $ExePath)) {
        $AltExe = Join-Path $InstallDir "lanpad.exe"
        if (Test-Path $AltExe) {
            $ExePath = $AltExe
        }
    }

    # Unblock all extracted executables and DLLs
    Get-ChildItem -Path $InstallDir -Recurse | Unblock-File -ErrorAction SilentlyContinue

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
    } catch {}

    Write-Ok "Extracted binaries and plugin dependencies successfully"
} catch {
    Write-Fail "Extraction failed: $_"
    exit 1
}

Start-Sleep -Milliseconds 200

# ── Launch ───────────────────────────────────────────────────
Write-Host ""
Write-Step 4 4 "Launching LANpad..."
Start-Process -FilePath $ExePath -WorkingDirectory $InstallDir
Start-Sleep -Milliseconds 800

Write-Host ""
Write-Host "  ------------------------------------------------" -ForegroundColor DarkGray
Write-Host "  [OK] LANpad installed and launched successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "  Desktop shortcut created at: $ShortcutPath" -ForegroundColor DarkGray
Write-Host "  ------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""
