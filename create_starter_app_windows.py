"""Register the ``lanpad://`` URL scheme on Windows.

On macOS, ``create_starter_app.py`` builds a tiny ``.app`` bundle and
registers it with Launch Services.  Windows is different:  the URL
scheme is registered as a plain key in the user's ``HKCU\Software\Classes``
registry hive, and the "executable" is just a ``.bat`` file that
launches the actual Python backend.

This script:
  1. Writes ``LANpadStarter.bat`` next to itself.
  2. Creates the registry entries that tell Windows to invoke that
     ``.bat`` whenever a ``lanpad://`` link is opened.
  3. Verifies the registration by querying the registry.

Run with::

    python create_starter_app_windows.py
"""
import os
import sys
import shutil
import subprocess
import textwrap


BAT_NAME  = "LANpadStarter.bat"
REG_PATH  = r"Software\Classes\lanpad"
PROTOCOL  = "lanpad"
PYTHON_EXE = shutil.which("pythonw") or shutil.which("python") or "python"


def _project_dir() -> str:
    return os.path.dirname(os.path.abspath(__file__))


def write_bat_starter() -> str:
    """Write the ``LANpadStarter.bat`` file that Windows will run when
    the user opens a ``lanpad://`` link."""
    bat_path = os.path.join(_project_dir(), BAT_NAME)
    project  = _project_dir().replace("\\", "\\\\")
    contents = textwrap.dedent(f"""\
        @echo off
        REM ─────────────────────────────────────────────────────────────────────
        REM LANpad Windows URL-scheme starter
        REM
        REM Invoked by Windows whenever the user opens a ``lanpad://`` link
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
    """Add the ``lanpad://`` scheme to ``HKCU\\Software\\Classes``.

    We deliberately use the **current user** hive (``HKCU``) so that
    no admin elevation is required.
    """
    import winreg

    bat_path_win = bat_path  # already Windows-style

    # 1. HKCU\Software\Classes\lanpad         (default) = "URL:LANpad Protocol"
    #                                (default) "URL Protocol" = ""
    with winreg.CreateKey(winreg.HKEY_CURRENT_USER, REG_PATH) as key:
        winreg.SetValueEx(key, None, 0, winreg.REG_SZ, "URL:LANpad Protocol")
        winreg.SetValueEx(key, "URL Protocol", 0, winreg.REG_SZ, "")

    # 2. HKCU\Software\Classes\lanpad\DefaultIcon
    #                                          (default) = "<bat_path>,0"
    with winreg.CreateKey(winreg.HKEY_CURRENT_USER, REG_PATH + r"\DefaultIcon") as key:
        winreg.SetValueEx(key, None, 0, winreg.REG_SZ, f'{bat_path_win},0')

    # 3. HKCU\Software\Classes\lanpad\shell\open\command
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

    project = _project_dir()
    exe_path = None
    exe_options = [
        os.path.join(project, "dist", "LANpad", "LANpad.exe"),
        os.path.join(project, "dist", "LANpad.exe"),
        os.path.join(project, "LANpad.exe"),
    ]
    for opt in exe_options:
        if os.path.exists(opt):
            exe_path = opt
            break

    try:
        import winreg
        if exe_path:
            print(f"⭐ Found compiled executable: {exe_path}. Registering directly to avoid console flash!")
            # 1. HKCU\Software\Classes\lanpad
            with winreg.CreateKey(winreg.HKEY_CURRENT_USER, REG_PATH) as key:
                winreg.SetValueEx(key, None, 0, winreg.REG_SZ, "URL:LANpad Protocol")
                winreg.SetValueEx(key, "URL Protocol", 0, winreg.REG_SZ, "")
            # 2. HKCU\Software\Classes\lanpad\DefaultIcon
            with winreg.CreateKey(winreg.HKEY_CURRENT_USER, REG_PATH + r"\DefaultIcon") as key:
                winreg.SetValueEx(key, None, 0, winreg.REG_SZ, f'"{exe_path}",0')
            # 3. HKCU\Software\Classes\lanpad\shell\open\command
            with winreg.CreateKey(winreg.HKEY_CURRENT_USER, REG_PATH + r"\shell\open\command") as key:
                winreg.SetValueEx(key, None, 0, winreg.REG_SZ, f'"{exe_path}" "%1"')
            print(f"✅ Registered {PROTOCOL}:// → {exe_path}")
            verify_registration()
        else:
            # 1. HKCU\Software\Classes\lanpad
            with winreg.CreateKey(winreg.HKEY_CURRENT_USER, REG_PATH) as key:
                winreg.SetValueEx(key, None, 0, winreg.REG_SZ, "URL:LANpad Protocol")
                winreg.SetValueEx(key, "URL Protocol", 0, winreg.REG_SZ, "")
            # 2. HKCU\Software\Classes\lanpad\DefaultIcon
            with winreg.CreateKey(winreg.HKEY_CURRENT_USER, REG_PATH + r"\DefaultIcon") as key:
                winreg.SetValueEx(key, None, 0, winreg.REG_SZ, f'"{PYTHON_EXE}",0')
            # 3. HKCU\Software\Classes\lanpad\shell\open\command
            main_py = os.path.join(project, "main.py")
            cmd_str = f'"{PYTHON_EXE}" "{main_py}" "%1"'
            with winreg.CreateKey(winreg.HKEY_CURRENT_USER, REG_PATH + r"\shell\open\command") as key:
                winreg.SetValueEx(key, None, 0, winreg.REG_SZ, cmd_str)
            print(f"✅ Registered {PROTOCOL}:// → {cmd_str}")
            verify_registration()
    except ImportError:
        print("❌ The 'winreg' module is missing.  Run on Windows.")
        return 1
    except Exception as e:
        print(f"❌ Failed to register protocol: {e}")
        return 1

    print("\n🎉 Done!  Try opening lanpad://start in your browser to test.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
