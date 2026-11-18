"""Isolated Chrome headless smoke test. No user browser profile or live APIs."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import tempfile,subprocess,threading,os,re
root=Path(__file__).resolve().parents[1]
chrome=Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe")
assert chrome.is_file()
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
os.chdir(root)
server=ThreadingHTTPServer(("127.0.0.1",0),Quiet)
threading.Thread(target=server.serve_forever,daemon=True).start()
try:
    url=f"http://127.0.0.1:{server.server_port}/buyer-lab/"
    with tempfile.TemporaryDirectory(prefix="arazvera-proof-smoke-") as tmp:
        base=[str(chrome),"--headless=new","--disable-gpu","--no-first-run","--no-default-browser-check","--disable-extensions","--user-data-dir="+tmp,"--virtual-time-budget=5000"]
        r=subprocess.run(base+["--dump-dom",url],capture_output=True,text=True,encoding="utf-8",errors="replace",timeout=35)
        dom=r.stdout
        terms=["Engineering Proof Lab","68 of 68 technical entries","Webhook idempotency","Recovery evidence check","ARAZVERA-L3-POSTGRES-CDC-RECON-001","ARAZVERA-L5-013"]
        absent=[x for x in terms if x not in dom]
        print("BROWSER_DOM",r.returncode,"BYTES",len(dom),"MISSING",absent)
        assert r.returncode==0 and not absent,(r.stderr[-400:],absent)
        dest=root/"buyer-lab"/"assets"/"proof-lab-preview.png"
        screen=subprocess.run(base+["--window-size=1440,900","--screenshot="+str(dest),url],capture_output=True,text=True,encoding="utf-8",errors="replace",timeout=35)
        print("BROWSER_SCREENSHOT",screen.returncode,dest.is_file(),dest.stat().st_size if dest.is_file() else 0)
        assert screen.returncode==0 and dest.is_file()
finally:
    server.shutdown()
