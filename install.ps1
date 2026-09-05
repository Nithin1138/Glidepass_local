# ============================================================
#   LANpad Installer for Windows (PowerShell - Release v1.3.7)
#   https://github.com/Nithin1138/Glidepass_local
# ============================================================
#   Run with:
#   powershell -c "irm https://raw.githubusercontent.com/Nithin1138/Glidepass_local/main/install.ps1 | iex"
# ============================================================

$repo  = "Nithin1138/Glidepass_local"
$InstallDir = "$env:LOCALAPPDATA\LANpad"
$ZipPath = Join-Path $InstallDir "LANpad-Windows.zip"
$ExePath = Join-Path $InstallDir "LANpad.exe"

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
Write-Step 1 4 "Checking system..."
$os = [System.Environment]::OSVersion.VersionString
Write-Ok "Windows detected ($os)"
Start-Sleep -Milliseconds 300

# ── Fetch Release Package ────────────────────────────────────────
Write-Host ""
Write-Step 2 4 "Downloading LANpad application release bundle..."

if (Test-Path $InstallDir) {
    Get-Process -Name "LANpad" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Get-Process -Name "lanpad" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
} else {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

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

Start-Sleep -Milliseconds 300

# ── Extract & Flatten Package ──────────────────────────────────
Write-Host ""
Write-Step 3 4 "Extracting application files and plugin DLLs..."
try {
    # Clean old binaries
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

    Write-Ok "Extracted binaries and plugin dependencies"
} catch {
    Write-Fail "Extraction failed: $_"
    exit 1
}

Start-Sleep -Milliseconds 300

# ── Launch ───────────────────────────────────────────────────
Write-Host ""
Write-Step 4 4 "Launching LANpad..."
Start-Process -FilePath $ExePath -WorkingDirectory $InstallDir
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
