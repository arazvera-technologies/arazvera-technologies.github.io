import unittest
from unittest.mock import patch
from urllib.parse import urlencode
from cart_invoice_demo import quote_cart,invoice_page
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
