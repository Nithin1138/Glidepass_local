import urllib.request
try:
    urllib.request.urlopen("http://127.0.0.1:8000/shutdown", timeout=1)
except Exception as e:
    print(e)
