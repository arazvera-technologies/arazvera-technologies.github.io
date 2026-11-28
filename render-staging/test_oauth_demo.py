import os
import unittest
from unittest.mock import patch, Mock
from urllib.parse import urlparse, parse_qs, urlencode
from oauth_demo import oauth, unseal, seal, COOKIE
from app import application

class OAuthDemoTests(unittest.TestCase):
    def setUp(self):
        self.env = patch.dict(os.environ, {"GOOGLE_DEMO_ENABLED":"1","GOOGLE_CLIENT_ID":"test-client","GOOGLE_CLIENT_SECRET":"test-only"}, clear=False)
        self.env.start()
        self.addCleanup(self.env.stop)
    def start(self):
        status, _, _, headers = oauth({"PATH_INFO":"/api/auth/google"})
        self.assertEqual(status,"302 Found")
        hdr = dict(headers)
        query = parse_qs(urlparse(hdr["Location"]).query)
        self.assertEqual(query["scope"],["openid email"])
        self.assertEqual(query["code_challenge_method"],["S256"])
        c = hdr["Set-Cookie"].split(";",1)[0]
        return query,c,unseal(c.split("=",1)[1])
    def test_disabled(self):
        with patch.dict(os.environ,{"GOOGLE_DEMO_ENABLED":"0"}):
            self.assertEqual(oauth({"PATH_INFO":"/api/auth/google"})[0],"503 Service Unavailable")
    def test_start(self):
        self.start()
    def test_wrong_state(self):
        _,c,_=self.start()
        self.assertEqual(oauth({"PATH_INFO":"/api/auth/google/callback","QUERY_STRING":"state=bad&code=x","HTTP_COOKIE":c})[0],"400 Bad Request")
    def test_tampered_cookie(self):
        q,c,_=self.start()
        self.assertEqual(oauth({"PATH_INFO":"/api/auth/google/callback","QUERY_STRING":urlencode({"state":q["state"][0],"code":"test"}),"HTTP_COOKIE":c+"x"})[0],"400 Bad Request")
    def test_expired_cookie(self):
        q,c,d=self.start()
        d["issued"] -= 600
        self.assertEqual(oauth({"PATH_INFO":"/api/auth/google/callback","QUERY_STRING":urlencode({"state":q["state"][0],"code":"test"}),"HTTP_COOKIE":COOKIE+"="+seal(d)})[0],"400 Bad Request")
    @patch("oauth_demo.id_token.verify_oauth2_token")
    @patch("oauth_demo.requests.post")
    def test_verified_demo(self, post, verify):
        q,c,d=self.start()
        post.return_value.json.return_value={"id_token":"test-token"}
        verify.return_value={"nonce":d["nonce"],"sub":"test-user","email_verified":True}
        status,body,_,headers=oauth({"PATH_INFO":"/api/auth/google/callback","QUERY_STRING":urlencode({"state":q["state"][0],"code":"test"}),"HTTP_COOKIE":c})
        self.assertEqual(status,"303 See Other")
        self.assertEqual(dict(headers)["Location"],"/google-demo-success")
        self.assertEqual(body,b"")
        self.assertNotIn("test-user",str(headers))
    @patch("oauth_demo.id_token.verify_oauth2_token")
    @patch("oauth_demo.requests.post")
    def test_bad_nonce(self, post, verify):
        q,c,d=self.start()
        post.return_value.json.return_value={"id_token":"test-token"}
        verify.return_value={"nonce":"wrong","sub":"test-user","email_verified":True}
        self.assertEqual(oauth({"PATH_INFO":"/api/auth/google/callback","QUERY_STRING":urlencode({"state":q["state"][0],"code":"test"}),"HTTP_COOKIE":c})[0],"502 Bad Gateway")
    def test_wsgi_disabled(self):
        with patch.dict(os.environ,{"GOOGLE_DEMO_ENABLED":"0"}):
            s=[]
            application({"PATH_INFO":"/api/auth/google","REQUEST_METHOD":"GET"},lambda status,h:s.append(status))
            self.assertEqual(s[0],"503 Service Unavailable")
