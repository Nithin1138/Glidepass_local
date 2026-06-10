"""Register the ``glidepass://`` URL scheme on Windows.

On macOS, ``create_starter_app.py`` builds a tiny ``.app`` bundle and
registers it with Launch Services.  Windows is different:  the URL
scheme is registered as a plain key in the user's ``HKCU\Software\Classes``
registry hive, and the "executable" is just a ``.bat`` file that
launches the actual Python backend.

This script:
  1. Writes ``GlidePassStarter.bat`` next to itself.
  2. Creates the registry entries that tell Windows to invoke that
     ``.bat`` whenever a ``glidepass://`` link is opened.
  3. Verifies the registration by querying the registry.

Run with::

    python create_starter_app_windows.py
"""
import os
import sys
import shutil
import subprocess
import textwrap


BAT_NAME  = "GlidePassStarter.bat"
REG_PATH  = r"Software\Classes\glidepass"
PROTOCOL  = "glidepass"
PYTHON_EXE = shutil.which("pythonw") or shutil.which("python") or "python"


def _project_dir() -> str:
    return os.path.dirname(os.path.abspath(__file__))


def write_bat_starter() -> str:
    """Write the ``GlidePassStarter.bat`` file that Windows will run when
    the user opens a ``glidepass://`` link."""
    bat_path = os.path.join(_project_dir(), BAT_NAME)
    project  = _project_dir().replace("\\", "\\\\")
    contents = textwrap.dedent(f"""\
        @echo off
        REM ─────────────────────────────────────────────────────────────────────
        REM GlidePass Windows URL-scheme starter
        REM
        REM Invoked by Windows whenever the user opens a ``glidepass://`` link
        REM (e.g. from the Chrome extension).  Boots the Python backend
        REM and the launcher GUI in the background.
        REM ─────────────────────────────────────────────────────────────────────
        setlocal
        set "DIR={project}"
        cd /d "%DIR%"
        start "" "{PYTHON_EXE}" "%DIR%\\main.py"
        endlocal
    """)
    with open(bat_path, "w", encoding="utf-8", newline="\r\n") as f:
        f.write(contents)
    print(f"✅ Wrote {bat_path}")
    return bat_path


def register_windows_protocol(bat_path: str) -> None:
    """Add the ``glidepass://`` scheme to ``HKCU\\Software\\Classes``.

    We deliberately use the **current user** hive (``HKCU``) so that
    no admin elevation is required.
    """
    import winreg

    bat_path_win = bat_path  # already Windows-style

    # 1. HKCU\Software\Classes\glidepass         (default) = "URL:GlidePass Protocol"
    #                                (default) "URL Protocol" = ""
    with winreg.CreateKey(winreg.HKEY_CURRENT_USER, REG_PATH) as key:
        winreg.SetValueEx(key, None, 0, winreg.REG_SZ, "URL:GlidePass Protocol")
        winreg.SetValueEx(key, "URL Protocol", 0, winreg.REG_SZ, "")

    # 2. HKCU\Software\Classes\glidepass\DefaultIcon
    #                                          (default) = "<bat_path>,0"
    with winreg.CreateKey(winreg.HKEY_CURRENT_USER, REG_PATH + r"\DefaultIcon") as key:
        winreg.SetValueEx(key, None, 0, winreg.REG_SZ, f'{bat_path_win},0')

    # 3. HKCU\Software\Classes\glidepass\shell\open\command
    #                                          (default) = "<bat> %1"
    with winreg.CreateKey(
        winreg.HKEY_CURRENT_USER, REG_PATH + r"\shell\open\command"
    ) as key:
        winreg.SetValueEx(key, None, 0, winreg.REG_SZ, f'"{bat_path_win}" "%1"')

    print(f"✅ Registered {PROTOCOL}:// → {bat_path_win}")


def verify_registration() -> None:
    """Read back the registry to confirm the scheme is wired correctly."""
    import winreg
    try:
        with winreg.OpenKey(
            winreg.HKEY_CURRENT_USER, REG_PATH + r"\shell\open\command"
        ) as key:
            cmd, _ = winreg.QueryValueEx(key, None)
        print(f"✅ Verification: {PROTOCOL}:// → {cmd}")
    except FileNotFoundError:
        print("❌ Verification failed: command not found in registry.")


def main() -> int:
    if not sys.platform.startswith("win"):
        print("This script only runs on Windows.  On macOS use create_starter_app.py.")
        return 1

    bat_path = write_bat_starter()
    try:
        register_windows_protocol(bat_path)
        verify_registration()
    except ImportError:
        print("❌ The 'winreg' module is missing.  Run on Windows.")
        return 1
    except Exception as e:
        print(f"❌ Failed to register protocol: {e}")
        return 1

    print("\n🎉 Done!  Try opening glidepass://start in your browser to test.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
