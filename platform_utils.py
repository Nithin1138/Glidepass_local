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


VERSION = "1.5.1"



