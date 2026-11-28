import io
import json
import os
import unittest
from unittest.mock import patch, MagicMock
from customer_requests import handle, read_payload, identity

class CustomerRequestTests(unittest.TestCase):
    def setUp(self):
        env=patch.dict(os.environ,{"CUSTOMER_REQUESTS_DEMO_ENABLED":"1","CUSTOMER_DEMO_DATABASE_URL":"test-only"})
        env.start()
        self.addCleanup(env.stop)
    def payload(self,**changes):
        p={"kind":"ticket","subject":"Test request","description":"Synthetic test description","request_key":"cd0fed5e-2f1e-4e88-bf8f-15c92abc775a"}
        p.update(changes)
        raw=json.dumps(p).encode()
        return {"REQUEST_METHOD":"POST","CONTENT_TYPE":"application/json","CONTENT_LENGTH":str(len(raw)),"wsgi.input":io.BytesIO(raw),"HTTP_ORIGIN":"https://arazvera-store.onrender.com"}
    def test_disabled(self):
        with patch.dict(os.environ,{"CUSTOMER_REQUESTS_DEMO_ENABLED":"0"}):
            self.assertEqual(handle({})[0],"503 Service Unavailable")
    def test_missing_auth(self):
        self.assertEqual(handle({})[0],"401 Unauthorized")
    def test_invalid_claims(self):
        with patch("customer_requests.jwt.get_unverified_header",return_value={"alg":"EdDSA"}),patch("customer_requests.jwks"),patch("customer_requests.jwt.decode",return_value={"sub":"x","emailVerified":False}):
            with self.assertRaises(ValueError): identity({"HTTP_AUTHORIZATION":"Bearer test"})
    def test_invalid_input(self):
        for v in [{"kind":"unknown"},{"subject":""},{"owner_id":"another"},{"request_key":"invalid"}]:
            with self.subTest(v=v), self.assertRaises(ValueError):read_payload(self.payload(**v))
    def test_cross_origin_denied(self):
        with patch("customer_requests.identity",return_value="test-owner"):
            e=self.payload()
            e["HTTP_ORIGIN"]="https://example.com"
            self.assertEqual(handle(e)[0],"403 Forbidden")
    @patch("customer_requests.db_connect")
    @patch("customer_requests.identity",return_value="test-owner")
    def test_list_scoped(self,ident,db):
        cur=db.return_value.__enter__.return_value.cursor.return_value.__enter__.return_value
        cur.fetchall.return_value=[]
        self.assertEqual(handle({"REQUEST_METHOD":"GET"})[0],"200 OK")
        self.assertIn("WHERE owner_id=%s",cur.execute.call_args.args[0])
        self.assertEqual(cur.execute.call_args.args[1],("test-owner",))
    @patch("customer_requests.db_connect")
    @patch("customer_requests.identity",return_value="test-owner")
    def test_create_scoped(self,ident,db):
        cur=db.return_value.__enter__.return_value.cursor.return_value.__enter__.return_value
        cur.fetchone.side_effect=[None,{"n":0},{"id":"test","kind":"ticket"}]
        self.assertEqual(handle(self.payload())[0],"201 Created")
        self.assertEqual(cur.execute.call_args.args[1][1],"test-owner")
    @patch("customer_requests.db_connect")
    @patch("customer_requests.identity",return_value="test-owner")
    def test_rate_limit(self,ident,db):
        cur=db.return_value.__enter__.return_value.cursor.return_value.__enter__.return_value
        cur.fetchone.side_effect=[None,{"n":10}]
        self.assertEqual(handle(self.payload())[0],"429 Too Many Requests")
    @patch("customer_requests.db_connect")
    @patch("customer_requests.identity",return_value="test-owner")
    def test_duplicate(self,ident,db):
        cur=db.return_value.__enter__.return_value.cursor.return_value.__enter__.return_value
        cur.fetchone.return_value={"id":"existing","kind":"ticket","subject":"Test request","description":"Synthetic test description"}
        self.assertEqual(handle(self.payload())[0],"200 OK")
        self.assertEqual(cur.execute.call_count,2)
