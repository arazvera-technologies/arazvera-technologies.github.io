import os
import json
from urllib.parse import parse_qs
from price_preview import rates_snapshot, demo_quote
from db_probe import startup_database_status
from wsgiref.simple_server import make_server, WSGIRequestHandler
from oauth_demo import oauth, enabled as google_demo_enabled

HOME = b'''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ARAZVERA Store Staging</title><body style="background:#101820;color:#eee;font:18px system-ui;max-width:700px;margin:40px auto;padding:20px"><h1>ARAZVERA TECHNOLOGIES</h1><h2>Staging server</h2><p>Infrastructure check only. Customer authentication, ticket storage, purchases and private downloads are disabled. Do not submit personal data here.</p><p><a style="color:#8ce3ef" href="https://arazvera-technologies.github.io/buyer-lab/">Browse public demos</a></p><p><a style="color:#8ce3ef" href="https://arazvera-technologies.github.io/buyer-lab/freelance.html">Freelance enquiry via email</a></p></body></html>'''
HEALTH = b'{"status":"ok","mode":"staging","accounts":false,"tickets":false,"payment":false,"private_download":false}'

def application(environ, start_response):
    path = environ.get('PATH_INFO', '/')
    method = environ.get('REQUEST_METHOD', 'GET')
    headers = [('Cache-Control', 'no-store'), ('X-Content-Type-Options', 'nosniff'), ('Referrer-Policy', 'no-referrer')]
    if method not in ('GET', 'HEAD'):
        status, content, kind = '405 Method Not Allowed', b'Method not allowed', 'text/plain'
        headers.append(('Allow', 'GET, HEAD'))
    elif path in ('/api/auth/google', '/api/auth/google/callback'):
        status, content, kind, extra = oauth(environ)
        headers.extend(extra)
    elif path == '/google-demo-success':
        status, kind = '200 OK', 'text/plain; charset=utf-8'
        content = b'Google sign-in demo completed if you arrived from a verified callback. No customer account or order has been created.'
    elif path == '/db-healthz':
        code, content = startup_database_status()
        status, kind = ('200 OK' if code == 200 else '503 Service Unavailable'), 'application/json'
    elif path in ('/api/demo/crypto-rates', '/api/demo/crypto-quote'):
        kind = 'application/json'
        try:
            if path.endswith('crypto-rates'):
                result = rates_snapshot()
                status = '200 OK' if result['rates'] else '503 Service Unavailable'
            else:
                raw = environ.get('QUERY_STRING', '')
                if len(raw) > 256:
                    raise ValueError('Invalid query')
                params = parse_qs(raw, strict_parsing=True, max_num_fields=2)
                if set(params) != {'usd', 'asset'} or any(len(v) != 1 for v in params.values()):
                    raise ValueError('Invalid query')
                result = demo_quote(params['usd'][0], params['asset'][0], rates_snapshot())
                status = '200 OK'
        except ValueError:
            result, status = {'error': 'Invalid demo quote', 'payment_enabled': False}, '400 Bad Request'
        except LookupError:
            result, status = {'error': 'Fresh rate unavailable', 'payment_enabled': False}, '503 Service Unavailable'
        content = json.dumps(result).encode('utf-8')
    elif path == '/healthz':
        status, content, kind = '200 OK', HEALTH, 'application/json'
    elif path == '/':
        status, content, kind = '200 OK', HOME, 'text/html; charset=utf-8'
        if google_demo_enabled():
            content = HOME.replace(b'</body>', b'<p><a style="color:#8ce3ef" href="/api/auth/google">Test Google sign-in (no account created)</a></p></body>')
    else:
        status, content, kind = '404 Not Found', b'Not found', 'text/plain'
    start_response(status, headers + [('Content-Type', kind), ('Content-Length', str(len(content)))])
    return [b'' if method == 'HEAD' else content]

class PrivateQueryHandler(WSGIRequestHandler):
    def log_request(self, code='-', size='-'):
        if self.path.startswith('/api/auth/google'):
            self.log_message('OAuth demo request %s', code)
        else:
            super().log_request(code, size)

if __name__ == '__main__':
    startup_database_status()
    with make_server('0.0.0.0', int(os.getenv('PORT', '10000')), application, handler_class=PrivateQueryHandler) as server:
        server.serve_forever()
