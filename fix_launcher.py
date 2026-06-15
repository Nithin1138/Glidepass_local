import sys

def main():
    with open('launcher.py', 'r') as f:
        content = f.read()

    # Add kwargs for Windows
    old_setup = """            cloudflared_bin = _get_cloudflared_bin()"""
    new_setup = """            cloudflared_bin = _get_cloudflared_bin()

            kwargs = {}
            if sys.platform == "win32":
                kwargs["creationflags"] = 0x08000000  # CREATE_NO_WINDOW
"""
    content = content.replace(old_setup, new_setup)

    # Cloudflare Popen
    old_cf_popen = """                    proc = subprocess.Popen(
                        cmd,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.STDOUT,
                        text=True,
                        bufsize=1,
                    )"""
    new_cf_popen = """                    proc = subprocess.Popen(
                        cmd,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.STDOUT,
                        stdin=subprocess.DEVNULL,
                        text=True,
                        bufsize=1,
                        **kwargs
                    )"""
    content = content.replace(old_cf_popen, new_cf_popen)

    # Pinggy SSH cmd
    old_ssh_cmd = """                    cmd = ["ssh", "-tt", "-p", "443", "-o", "StrictHostKeyChecking=no",
                           "-o", "ConnectTimeout=10", "-R", "80:localhost:8000", "a.pinggy.io"]"""
    new_ssh_cmd = """                    cmd = ["ssh", "-p", "443", "-o", "StrictHostKeyChecking=no",
                           "-o", "ConnectTimeout=10", "-o", "BatchMode=yes", "-R", "80:localhost:8000", "a.pinggy.io"]"""
    content = content.replace(old_ssh_cmd, new_ssh_cmd)

    # Pinggy Popen
    old_pinggy_popen = """                    proc = subprocess.Popen(
                        cmd,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.STDOUT,
                        text=True,
                        bufsize=1
                    )"""
    new_pinggy_popen = """                    proc = subprocess.Popen(
                        cmd,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.STDOUT,
                        stdin=subprocess.DEVNULL,
                        text=True,
                        bufsize=1,
                        **kwargs
                    )"""
    content = content.replace(old_pinggy_popen, new_pinggy_popen)

    with open('launcher.py', 'w') as f:
        f.write(content)

    print("Updated launcher.py")

if __name__ == "__main__":
    main()
