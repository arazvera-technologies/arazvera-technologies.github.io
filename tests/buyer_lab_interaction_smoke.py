"""Browser UI regression via Chrome DevTools in an isolated headless profile.
Tests real DOM events and live module execution. No user cookies or accounts.
"""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import tempfile,subprocess,threading,os,time,json,requests,websocket
root=Path(__file__).resolve().parents[1]
browser=r"C:\Program Files\Google\Chrome\Application\chrome.exe"
class Silent(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
os.chdir(root)
server=ThreadingHTTPServer(("127.0.0.1",0),Silent)
threading.Thread(target=server.serve_forever,daemon=True).start()
proc=None
try:
 with tempfile.TemporaryDirectory(prefix="arazvera-cdp-",ignore_cleanup_errors=True) as tmp:
  url=f"http://127.0.0.1:{server.server_port}/buyer-lab/"
  args=[browser,"--headless=new","--disable-gpu","--disable-extensions","--no-first-run",
        "--no-default-browser-check","--remote-debugging-port=0","--remote-allow-origins=*",
        "--user-data-dir="+tmp,url]
  proc=subprocess.Popen(args,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  active=Path(tmp)/"DevToolsActivePort"
  for _ in range(100):
   if active.exists():break
   time.sleep(.1)
  assert active.exists(),"Chrome debugging endpoint did not start"
  port=int(active.read_text().splitlines()[0])
  targets=requests.get(f"http://127.0.0.1:{port}/json/list",timeout=5).json()
  target=next(x for x in targets if x.get("type")=="page" and "/buyer-lab/" in x.get("url",""))
  ws=websocket.create_connection(target["webSocketDebuggerUrl"],timeout=8)
  ident=0
  def evaljs(code):
   nonlocal_placeholder=None
   global ident
   ident+=1
   ws.send(json.dumps({"id":ident,"method":"Runtime.evaluate","params":{"expression":code,"returnByValue":True,"awaitPromise":True}}))
   while True:
    got=json.loads(ws.recv())
    if got.get("id")==ident:
     if got.get("error"):raise RuntimeError(got["error"])
     res=got.get("result",{})
     if "exceptionDetails" in res:raise RuntimeError(str(res["exceptionDetails"]))
     return res.get("result",{}).get("value")
  for _ in range(70):
   if evaljs("document.documentElement.dataset.catalogLoaded || 'loading'")=="true":break
   time.sleep(.1)
  assert evaljs("document.documentElement.dataset.catalogLoaded")=="true"
  initial=evaljs("document.querySelectorAll('#product-grid .product').length")
  assert initial==68,initial
  example_link=evaljs("Array.from(document.querySelectorAll('#product-grid .product')).find(x=>x.textContent.includes('ARAZVERA-L3-POSTGRES-CDC-RECON-001'))?.querySelector('a.try-demo')?.getAttribute('href') || ''")
  assert '?bench=reconcile#playground' in example_link,example_link
  level5=evaljs("document.querySelector('[data-level=L5]').click();document.querySelectorAll('#product-grid .product').length")
  assert level5==13,level5
  filtered=evaljs("document.querySelector('#product-search').value='agent';document.querySelector('#product-search').dispatchEvent(new Event('input',{bubbles:true}));document.querySelectorAll('#product-grid .product').length")
  assert 1<=filtered<=13,filtered
  evaljs("document.querySelector('[data-level=all]').click();document.querySelector('#product-search').value='';document.querySelector('#product-search').dispatchEvent(new Event('input',{bubbles:true}));")
  assert evaljs("document.querySelectorAll('#product-grid .product').length")==68
  issue=evaljs("document.querySelector('[data-scenario=issues]').click();document.querySelector('#run-check').click();document.querySelector('#decision').textContent")
  assert issue=="REVIEW",issue
  good=evaljs("document.querySelector('[data-scenario=pass]').click();document.querySelector('#run-check').click();document.querySelector('#decision').textContent")
  assert good=="PASS",good
  changed=evaljs("document.querySelector('#lab-menu button:nth-child(4)').click();document.querySelector('[data-scenario=issues]').click();document.querySelector('#run-check').click();document.querySelector('#decision').textContent")
  assert changed=="REVIEW",changed
  bad=evaljs("document.querySelector('#fixture-input').value='{invalid';document.querySelector('#run-check').click();document.querySelector('#decision').textContent")
  assert bad=="ERROR",bad
  assert evaljs("document.querySelector('#download-result').disabled") is True
  print("CDP_BROWSER_INTERACTION_PASS initial=68 L5=13 filtered="+str(filtered)+" issue=REVIEW pass=PASS agent=REVIEW invalid=ERROR",flush=True)
  ws.close()
finally:
 if proc is not None:
  proc.terminate()
  try:proc.wait(timeout=5)
  except subprocess.TimeoutExpired:proc.kill()
 server.shutdown()
