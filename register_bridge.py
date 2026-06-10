"""Register the GlidePass native messaging host with every Chromium-based
browser installed on the current machine.

This script works on both macOS and Windows.  It writes a small JSON
manifest file (the same one Chromium uses to discover native hosts)
into every Chromium user's profile directory.

Usage::

    python register_bridge.py <extension_id>

``extension_id`` is the 32-character ID you can copy from
``chrome://extensions`` after enabling Developer Mode.
"""
import json
import os
import shutil
import subprocess
import sys


# ── Configuration ────────────────────────────────────────────────────────────

# TODO: replace this with your real extension ID the first time you
# install the unpacked extension on a new machine.
EXTENSION_ID = "balleijkjhnmflldlhgclonmnndoeiji"
HOST_NAME    = "com.glidepass.launcher"


# ── Per-OS paths ─────────────────────────────────────────────────────────────

def _mac_paths():
    """Chromium user-data locations on macOS."""
    return [
        "~/Library/Application Support/Google/Chrome/NativeMessagingHosts",
        "~/Library/Application Support/Google/Chrome Canary/NativeMessagingHosts",
        "~/Library/Application Support/Chromium/NativeMessagingHosts",
        "~/Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts",
        "~/Library/Application Support/Microsoft Edge/NativeMessagingHosts",
        "~/Library/Application Support/Vivaldi/NativeMessagingHosts",
    ]


def _windows_paths():
    """Chromium user-data locations on Windows.

    These are the *per-user* (HKCU) registry keys Chromium looks up;
    we also need a *file-system* path because Chromium falls back to
    looking for the JSON manifest in a known folder.
    """
    appdata = os.environ.get("APPDATA") or os.path.expanduser("~\\AppData\\Roaming")
    return [
        os.path.join(appdata, "Google", "Chrome", "NativeMessagingHosts"),
        os.path.join(appdata, "Google", "Chrome SxS", "NativeMessagingHosts"),
        os.path.join(appdata, "Chromium", "NativeMessagingHosts"),
        os.path.join(appdata, "BraveSoftware", "Brave-Browser", "NativeMessagingHosts"),
        os.path.join(appdata, "Microsoft", "Edge", "NativeMessagingHosts"),
        os.path.join(appdata, "Vivaldi", "NativeMessagingHosts"),
    ]


def _linux_paths():
    return [
        "~/.config/google-chrome/NativeMessagingHosts",
        "~/.config/chromium/NativeMessagingHosts",
        "~/.config/BraveSoftware/Brave-Browser/NativeMessagingHosts",
        "~/.config/microsoft-edge/NativeMessagingHosts",
        "~/.config/vivaldi/NativeMessagingHosts",
    ]


# ── Bridge writer (per-OS) ───────────────────────────────────────────────────

def _write_mac_bridge(extension_id: str) -> str:
    """Generate a tiny ``glidepass_bridge.sh`` and return its absolute path."""
    project = os.path.dirname(os.path.abspath(__file__))
    bridge  = os.path.join(project, "glidepass_bridge.sh")

    python_path = (
        subprocess.check_output(["which", "python3"]).decode().strip()
        if shutil.which("python3")
        else "/usr/bin/python3"
    )

    with open(bridge, "w", encoding="utf-8") as f:
        f.write("#!/bin/bash\n")
        f.write('DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"\n')
        f.write(f'"{python_path}" "$DIR/native_host.py" "$@"\n')

    os.chmod(bridge, 0o755)
    try:
        os.chmod(os.path.abspath("native_host.py"), 0o755)
    except FileNotFoundError:
        pass
    return bridge


def _write_windows_bridge(extension_id: str) -> str:
    """Generate a ``native_host_wrapper.bat`` next to ``native_host.py``.

    Chromium requires the ``path`` field in the manifest to point to
    an ``.exe`` or a ``.bat`` – it can NOT point to a ``.py`` directly.
    """
    project = os.path.dirname(os.path.abspath(__file__))
    bridge  = os.path.join(project, "native_host_wrapper.bat")

    # We rely on the pre-generated native_host_wrapper.bat (which this
    # repository already contains).  If it is missing, regenerate it.
    if not os.path.exists(bridge):
        pyexe = shutil.which("pythonw") or shutil.which("python") or "python"
        contents = (
            "@echo off\r\n"
            "setlocal\r\n"
            f'set "DIR={project}"\r\n'
            f'"{pyexe}" "%DIR%\\native_host.py" %*\r\n'
            "endlocal\r\n"
        )
        with open(bridge, "w", encoding="utf-8", newline="\r\n") as f:
            f.write(contents)
    return bridge


# ── Registration ─────────────────────────────────────────────────────────────

def _build_manifest(extension_id: str, bridge_path: str) -> dict:
    return {
        "name": HOST_NAME,
        "description": "GlidePass Backend Launcher",
        "path": bridge_path,
        "type": "stdio",
        "allowed_origins": [
            f"chrome-extension://{extension_id.strip().lower()}/"
        ],
    }


def _register(extension_id: str) -> int:
    if sys.platform == "darwin":
        paths  = _mac_paths()
        bridge = _write_mac_bridge(extension_id)
    elif sys.platform.startswith("win"):
        paths  = _windows_paths()
        bridge = _write_windows_bridge(extension_id)
    else:
        paths  = _linux_paths()
        bridge = _write_mac_bridge(extension_id)  # .sh works on Linux too

    manifest = _build_manifest(extension_id, bridge)
    count = 0

    for p in paths:
        target_dir = os.path.expanduser(p)
        try:
            os.makedirs(target_dir, exist_ok=True)
            target_path = os.path.join(target_dir, f"{HOST_NAME}.json")
            with open(target_path, "w", encoding="utf-8") as f:
                json.dump(manifest, f, indent=2)
            print(f"✅ Registered: {target_path}")
            count += 1
        except Exception as e:
            print(f"❌ Failed for {p}: {e}")

    # ── Windows-only: also register under HKCU\Software\Google\Chrome
    #   \NativeMessagingHosts\com.glidepass.launcher so Chrome picks it up
    #   even if the file-based lookup is misconfigured.
    if sys.platform.startswith("win"):
        try:
            import winreg
            with winreg.CreateKey(
                winreg.HKEY_CURRENT_USER,
                rf"Software\Google\Chrome\NativeMessagingHosts\{HOST_NAME}",
            ) as key:
                winreg.SetValueEx(
                    key, None, 0, winreg.REG_SZ,
                    os.path.join(os.path.dirname(bridge), f"{HOST_NAME}.json"),
                )
            print("✅ Registered in HKCU Chrome registry hive.")
        except Exception as e:
            print(f"⚠️ Could not write Chrome registry hive: {e}")

    print(f"\n🚀 Total registrations: {count}")
    print("👉 Now RESTART your browser and try again.")
    return 0


def main(argv):
    if len(argv) > 1:
        ext_id = argv[1].strip().lower()
    else:
        ext_id = EXTENSION_ID
    return _register(ext_id)


if __name__ == "__main__":
    sys.exit(main(sys.argv))
