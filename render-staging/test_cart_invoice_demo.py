import unittest
import io
import re
import time
from html import unescape
from unittest.mock import patch
from urllib.parse import urlencode
from cart_invoice_demo import quote_cart,invoice_page,confirm_page,sample_download,_sign
from app import application

class CartInvoiceTests(unittest.TestCase):
    def setUp(self):
        self.items=[("sku","ARAZVERA-L2-AI-EVALUATION-001"),("sku","ARAZVERA-L3-B2B-INTEGRATION-HUB-001"),("asset","USDT"),("network","Tron")]
    @patch("cart_invoice_demo.rates_snapshot",return_value={"rates":{"USDT":{"usd":"0.99","last_updated_at":1000,"source":"test"}}})
    def test_server_total(self,m):
        q=quote_cart(urlencode(self.items))
        self.assertEqual(q["usd"],"1598.00")
        self.assertEqual(q["estimated_amount"],"1614.141415")
        self.assertFalse(q["payment_enabled"])
        self.assertFalse(q["transfer_requested"])
    def test_reject_tampering(self):
        for items in [self.items+[("usd","1")],self.items+[self.items[0]],self.items[:-1]+[("network","Bitcoin")],self.items[1:]+[("sku","FAKE")]]:
            with self.subTest(items=items),self.assertRaises(ValueError):
                quote_cart(urlencode(items))
    @patch("cart_invoice_demo.rates_snapshot",return_value={"rates":{}})
    def test_missing_rate(self,m):
        status,body,_=invoice_page(urlencode(self.items))
        self.assertEqual(status,"503 Service Unavailable")
        self.assertIn(b"Do not send funds",body)
    @patch("cart_invoice_demo.rates_snapshot",return_value={"rates":{"USDT":{"usd":"1","last_updated_at":1000}}})
    def test_invoice_route(self,m):
        result=[]
        body=b"".join(application({"PATH_INFO":"/demo/cart-invoice","QUERY_STRING":urlencode(self.items),"REQUEST_METHOD":"GET"},lambda status,headers:result.append(status)))
        self.assertEqual(result[0],"200 OK")
        self.assertIn(b"NO LIVE PAYMENT",body)
        self.assertIn(b"1598.00",body)
        self.assertNotIn(b"bitcoin:",body)

    @patch("cart_invoice_demo.rates_snapshot")
    def test_confirm_then_download(self,m):
        m.return_value={"rates":{"USDT":{"usd":"1","last_updated_at":int(time.time()),"source":"test"}}}
        status,body,_=invoice_page(urlencode(self.items))
        self.assertEqual(status,"200 OK")
        self.assertNotIn(b"/demo/cart-download?",body)
        quote=re.search(r'name="quote" value="([^"]+)"',body.decode()).group(1)
        raw=urlencode({"quote":quote,"consent":"yes"}).encode()
        env={"HTTP_ORIGIN":"https://arazvera-store.onrender.com","CONTENT_TYPE":"application/x-www-form-urlencoded","CONTENT_LENGTH":str(len(raw)),"wsgi.input":io.BytesIO(raw)}
        status,body,_=confirm_page(env)
        self.assertEqual(status,"200 OK")
        link=unescape(re.search(r'href="(/demo/cart-download\?[^"]+)"',body.decode()).group(1))
        status,content,_=sample_download(link.split("?",1)[1])
        self.assertEqual(status,"200 OK")
        self.assertIn(b"NO PAYMENT, LICENSE OR PRIVATE PRODUCT",content)
        self.assertEqual(sample_download("ticket=invalid")[0],"400 Bad Request")
        self.assertEqual(sample_download(urlencode({"ticket":quote}))[0],"400 Bad Request")
        self.assertEqual(sample_download(urlencode({"ticket":_sign("sample",{},time.time()-1)}))[0],"400 Bad Request")
    def test_no_consent_or_cross_origin(self):
        raw=b"quote=fake&consent=no"
        env={"HTTP_ORIGIN":"https://example.com","CONTENT_TYPE":"application/x-www-form-urlencoded","CONTENT_LENGTH":str(len(raw)),"wsgi.input":io.BytesIO(raw)}
        self.assertEqual(confirm_page(env)[0],"403 Forbidden")
        env["HTTP_ORIGIN"]="https://arazvera-store.onrender.com"
        self.assertEqual(confirm_page(env)[0],"400 Bad Request")
