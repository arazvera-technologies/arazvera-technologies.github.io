import unittest
from unittest.mock import patch
import price_preview as pp
import json
from datetime import datetime, timezone
from io import BytesIO
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

    def test_kraken_timestamp_and_pair(self):
        def payload(symbol, stamp):
            return BytesIO(json.dumps({"result":{"trades":[{"symbol":symbol,"price":"42.125","trade_ts":datetime.fromtimestamp(stamp,timezone.utc).isoformat()}]}}).encode())
        for symbol, stamp, valid in [("TRX/USD",1000,True),("ETH/USD",1000,False),("TRX/USD",700,False)]:
            with patch("price_preview.urlopen",return_value=payload(symbol,stamp)),patch("price_preview.time.time",return_value=1000):
                value=pp._kraken_trade("TRX")
                self.assertEqual(bool(value),valid)
                if valid: self.assertEqual(value["source"],"Kraken")

    def test_fallback_source_and_fail_closed(self):
        with patch.object(pp,"_cache",{}),patch.object(pp,"_fetched",0),patch.object(pp,"_retry_after",0),patch("price_preview.time.time",return_value=1000),patch("price_preview._download",side_effect=TimeoutError),patch("price_preview._fallback",return_value={"BTC":{"usd":"50000","last_updated_at":999,"source":"Kraken"}}):
            snapshot=pp.rates_snapshot()
            self.assertEqual(snapshot["source"],"Kraken")
            self.assertEqual(demo_quote("100","BTC",snapshot)["source"],"Kraken")
            self.assertFalse(snapshot["payment_enabled"])
            with self.assertRaises(LookupError): demo_quote("100","ETH",snapshot)
