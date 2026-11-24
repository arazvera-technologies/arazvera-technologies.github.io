import os
from db_probe import startup_database_status
from wsgiref.simple_server import make_server

HOME = b'''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ARAZVERA Store Staging</title><body style="background:#101820;color:#eee;font:18px system-ui;max-width:700px;margin:40px auto;padding:20px"><h1>ARAZVERA TECHNOLOGIES</h1><h2>Staging server</h2><p>Infrastructure check only. Customer authentication, ticket storage, purchases and private downloads are disabled. Do not submit personal data here.</p><p><a style="color:#8ce3ef" href="https://arazvera-technologies.github.io/buyer-lab/">Browse public demos</a></p><p><a style="color:#8ce3ef" href="https://arazvera-technologies.github.io/buyer-lab/freelance.html">Freelance enquiry via email</a></p></body></html>'''
HEALTH = b'{"status":"ok","mode":"staging","accounts":false,"tickets":false,"payment":false,"private_download":false}'

def application(environ, start_response):
    path = environ.get('PATH_INFO', '/')
    method = environ.get('REQUEST_METHOD', 'GET')
    headers = [('Cache-Control', 'no-store'), ('X-Content-Type-Options', 'nosniff'), ('Referrer-Policy', 'no-referrer')]
    if method not in ('GET', 'HEAD'):
        status, content, kind = '405 Method Not Allowed', b'Method not allowed', 'text/plain'
        headers.append(('Allow', 'GET, HEAD'))
    elif path == '/db-healthz':
        code, content = startup_database_status()
        status, kind = ('200 OK' if code == 200 else '503 Service Unavailable'), 'application/json'
    elif path == '/healthz':
        status, content, kind = '200 OK', HEALTH, 'application/json'
    elif path == '/':
        status, content, kind = '200 OK', HOME, 'text/html; charset=utf-8'
    else:
        status, content, kind = '404 Not Found', b'Not found', 'text/plain'
    start_response(status, headers + [('Content-Type', kind), ('Content-Length', str(len(content)))])
    return [b'' if method == 'HEAD' else content]

if __name__ == '__main__':
    startup_database_status()
    with make_server('0.0.0.0', int(os.getenv('PORT', '10000')), application) as server:
        server.serve_forever()
