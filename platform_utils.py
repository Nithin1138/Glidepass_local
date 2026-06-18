"""Platform-specific helpers for LANpad cross-platform support.

This module is the single source of truth for OS detection and platform-
specific code paths. Importing it from anywhere guarantees that the Mac
(rumps/AppKit) code is never even *imported* on Windows, which prevents
the dreaded "ModuleNotFoundError: No module named 'rumps'" crash when
the binary is launched on a Windows machine.
"""
import os
import sys
import platform


def is_mac() -> bool:
    return sys.platform == "darwin" or platform.system() == "Darwin"


def is_windows() -> bool:
    return sys.platform.startswith("win") or platform.system() == "Windows"


def is_linux() -> bool:
    return sys.platform.startswith("linux") or platform.system() == "Linux"


def cmd_key() -> str:
    """Return the platform-native modifier key for copy/paste."""
    return "command" if is_mac() else "ctrl"


def osascript_cmd() -> str:
    """Full path to osascript on macOS, empty string on other OSes."""
    return "/usr/bin/osascript" if is_mac() else ""


def resource_path(relative_path: str) -> str:
    """Get absolute path to a bundled resource.

    Works for both ``python main.py`` (dev) and the PyInstaller-frozen
    executable (``LANpad.exe`` / ``LANpad.app``).
    """
    try:
        base_path = sys._MEIPASS  # type: ignore[attr-defined]
    except Exception:
        base_path = os.path.abspath(".")
    return os.path.join(base_path, relative_path)


def user_data_dir() -> str:
    """Return the per-user directory where LANpad stores config/logs."""
    if is_windows():
        return os.path.join(os.path.expanduser("~"), "AppData", "Local", "LANpad")
    return os.path.expanduser("~/.lanpad")


VERSION = "1.5.8.4"


def get_hardware_id() -> str:
    """Get a stable, unique hardware identifier for licensing lock."""
    import subprocess
    import hashlib
    import uuid

    hwid = ""
    if is_windows():
        try:
            # Query motherboard UUID via wmic
            cf = 0x08000000  # CREATE_NO_WINDOW
            out = subprocess.run(
                ["wmic", "csproduct", "get", "uuid"],
                capture_output=True, text=True, timeout=3, creationflags=cf
            ).stdout
            for line in out.splitlines():
                line = line.strip()
                if line and "UUID" not in line:
                    hwid = line
                    break
        except Exception:
            pass
        if not hwid:
            try:
                # Fallback to registry MachineGuid
                import winreg
                key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Cryptography")
                hwid, _ = winreg.QueryValueEx(key, "MachineGuid")
                winreg.CloseKey(key)
            except Exception:
                pass
    elif is_mac():
        try:
            # Query macOS IOPlatformUUID
            out = subprocess.run(
                ["ioreg", "-rd1", "-c", "IOPlatformExpertDevice"],
                capture_output=True, text=True, timeout=3
            ).stdout
            for line in out.splitlines():
                if "IOPlatformUUID" in line:
                    parts = line.split("=")
                    if len(parts) > 1:
                        hwid = parts[1].strip().replace('"', '')
                        break
        except Exception:
            pass
        if not hwid:
            try:
                # Alternative system_profiler lookup
                out = subprocess.run(
                    ["system_profiler", "SPHardwareDataType"],
                    capture_output=True, text=True, timeout=3
                ).stdout
                for line in out.splitlines():
                    if "Hardware UUID" in line:
                        hwid = line.split(":")[-1].strip()
                        break
            except Exception:
                pass

    if not hwid:
        # Fallback to hash of unique mac + hostname
        try:
            node_id = str(uuid.getnode())
            node_name = platform.node()
            hwid = hashlib.sha256(f"{node_id}-{node_name}".encode("utf-8")).hexdigest()
        except Exception:
            hwid = "UNKNOWN-HWID"

    return hwid.strip().upper()




