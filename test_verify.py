import urllib.request
import json
import ssl

def safe_urlopen(url_or_req, timeout=4):
    try:
        ctx = ssl._create_unverified_context()
        return urllib.request.urlopen(url_or_req, timeout=timeout, context=ctx)
    except Exception as e:
        if "CERTIFICATE_VERIFY_FAILED" in str(e):
            return urllib.request.urlopen(url_or_req, timeout=timeout)
        raise e

urls = ["http://127.0.0.1:3000/api/monetization/verify", "https://lanpad.app/api/monetization/verify"]
payload = json.dumps({"key": "LP-BASIC-I7XZB4OS-QBGV"}).encode("utf-8")

for url in urls:
    try:
        req = urllib.request.Request(
            url,
            data=payload,
            headers={"Content-Type": "application/json", "User-Agent": "LANpad App"},
            method="POST"
        )
        print(f"Trying {url}...")
        with safe_urlopen(req, timeout=5) as resp:
            print(f"Response from {url}:", resp.read().decode("utf-8"))
    except Exception as e:
        print(f"Error on {url}: {e}")
