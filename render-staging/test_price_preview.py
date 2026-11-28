import unittest
from unittest.mock import patch
from price_preview import validated_rates, demo_quote, rates_snapshot
from app import application

class PricePreviewTests(unittest.TestCase):
    def test_valid_and_stale_rates(self):
        data = {"bitcoin":{"usd":100000,"last_updated_at":999},
                "ethereum":{"usd":2000,"last_updated_at":700},
                "tether":{"usd":-1,"last_updated_at":999},
                "tron":{"usd":"NaN","last_updated_at":999}}
        self.assertEqual(validated_rates(data,1000),{"BTC":{"usd":"100000","last_updated_at":999}})
    def test_future_rate_rejected(self):
        self.assertEqual(validated_rates({"bitcoin":{"usd":1,"last_updated_at":1100}},1000),{})
    def test_demo_quote(self):
        data={"rates":{"BTC":{"usd":"30000","last_updated_at":1000}}}
        q=demo_quote("100.00","BTC",data)
        self.assertEqual(q["estimated_amount"],"0.00333334")
        self.assertFalse(q["payment_enabled"])
        self.assertFalse(q["transfer_requested"])
    def test_invalid_amounts(self):
        for amount in ["NaN","Infinity","-1","0","1.001","1000001",""]:
            with self.subTest(amount=amount), self.assertRaises(ValueError):
                demo_quote(amount,"BTC",{"rates":{}})
    def test_unsupported_asset(self):
        with self.assertRaises(ValueError): demo_quote("100","FAKE",{"rates":{}})
    def test_unavailable_rate(self):
        with self.assertRaises(LookupError): demo_quote("100","BTC",{"rates":{}})
    def test_endpoint(self):
        with patch("app.rates_snapshot",return_value={"rates":{"BTC":{"usd":"30000","last_updated_at":1000}},"payment_enabled":False}):
            response=[]
            body=b"".join(application({"PATH_INFO":"/api/demo/crypto-quote","QUERY_STRING":"usd=100&asset=BTC","REQUEST_METHOD":"GET"},lambda s,h:response.append(s)))
            self.assertEqual(response[0],"200 OK")
            self.assertIn(b'"payment_enabled": false',body)
    def test_rate_failure(self):
        with patch("app.rates_snapshot",return_value={"rates":{},"payment_enabled":False}):
            response=[]
            application({"PATH_INFO":"/api/demo/crypto-rates","REQUEST_METHOD":"GET"},lambda s,h:response.append(s))
            self.assertEqual(response[0],"503 Service Unavailable")
