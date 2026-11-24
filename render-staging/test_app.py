import unittest
from app import application

class StagingTests(unittest.TestCase):
    def request(self, path, method='GET'):
        response=[]
        body=b''.join(application({'PATH_INFO':path,'REQUEST_METHOD':method},lambda status,headers: response.append(status)))
        return response[0],body
    def test_health(self):
        status,body=self.request('/healthz')
        self.assertEqual(status,'200 OK')
        self.assertIn(b'"payment":false',body)
    def test_home(self):
        status,body=self.request('/')
        self.assertEqual(status,'200 OK')
        self.assertIn(b'Staging',body)
    def test_post_blocked(self):
        self.assertEqual(self.request('/api/tickets','POST')[0],'405 Method Not Allowed')
    def test_unknown(self):
        self.assertEqual(self.request('/private.zip')[0],'404 Not Found')
