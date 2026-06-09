@echo off
REM ─────────────────────────────────────────────────────────────────────────────
REM GlidePass Windows Native Messaging Host wrapper
REM
REM Chromium's native messaging protocol requires a single executable that
REM reads 4-byte little-endian length headers from STDIN and writes
REM length-prefixed JSON to STDOUT.  Python's ``pythonw.exe`` (no console)
REM is the perfect host, but Chromium also needs the wrapper to remain
REM alive indefinitely, reading from STDIN.
REM
REM This .bat is what ``com.glidepass.launcher.json`` points to.
REM It is equivalent in role to ``glidepass_bridge.sh`` on macOS / Linux.
REM ─────────────────────────────────────────────────────────────────────────────

setlocal

REM Resolve the directory this .bat lives in (i.e. the GlidePass project)
set "DIR=%~dp0"

REM Prefer pythonw.exe (no console flash) but fall back to python.exe.
where pythonw >nul 2>&1
if %errorlevel% equ 0 (
    set "PYEXE=pythonw"
) else (
    where python >nul 2>&1
    if %errorlevel% equ 0 (
        set "PYEXE=python"
    ) else (
        echo [GlidePass] ERROR: Python is not installed or not in PATH. 1>&2
        exit /b 1
    )
)

REM Run the Python native host.  Pass through any arguments Chromium gave us.
"%PYEXE%" "%DIR%native_host.py" %*
