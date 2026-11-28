"""Public, informational price previews. Never authorizes payments."""
import json
import os
import time
from decimal import Decimal, InvalidOperation, ROUND_UP, localcontext
from threading import Lock
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ASSETS = {"BTC": ("bitcoin", 8), "ETH": ("ethereum", 18),
          "USDT": ("tether", 6), "USDC": ("usd-coin", 6),
          "TRX": ("tron", 6)}
MAX_AGE = 180
CACHE_TTL = 60
_lock = Lock()
_cache = {}
_fetched = 0
_retry_after = 0

def _download():
    query = urlencode({"ids": ",".join(v[0] for v in ASSETS.values()),
                       "vs_currencies": "usd", "include_last_updated_at": "true"})
    headers = {"Accept": "application/json", "User-Agent": "ARAZVERA-Store/1.0"}
    key = os.getenv("COINGECKO_DEMO_API_KEY")
    if key:
        headers["x-cg-demo-api-key"] = key
    request = Request("https://api.coingecko.com/api/v3/simple/price?" + query,
                      headers=headers)
    with urlopen(request, timeout=8) as response:
        return json.loads(response.read(65536), parse_float=Decimal)

def validated_rates(data, now):
    rates = {}
    for symbol, (coin_id, _) in ASSETS.items():
        try:
            item = data[coin_id]
            price = Decimal(str(item["usd"]))
            stamp = int(item["last_updated_at"])
            if price.is_finite() and price > 0 and -15 <= now - stamp <= MAX_AGE:
                rates[symbol] = {"usd": format(price, "f"), "last_updated_at": stamp}
        except (KeyError, TypeError, ValueError, InvalidOperation, OverflowError):
            continue
    return rates

def rates_snapshot():
    global _cache, _fetched, _retry_after
    with _lock:
        now = time.time()
        if now >= _retry_after and (not _fetched or now - _fetched >= CACHE_TTL):
            try:
                _cache = validated_rates(_download(), time.time())
                _fetched = time.time()
                _retry_after = _fetched + CACHE_TTL
            except Exception:
                _cache = {}
                _fetched = 0
                _retry_after = time.time() + CACHE_TTL
        fresh = {s: r for s, r in _cache.items()
                 if -15 <= now - r["last_updated_at"] <= MAX_AGE}
        return {"source": "CoinGecko", "mode": "informational",
                "currency": "USD", "payment_enabled": False, "rates": fresh}

def demo_quote(usd, asset, snapshot):
    if asset not in ASSETS:
        raise ValueError("Unsupported asset")
    try:
        if len(usd) > 24:
            raise ValueError("Invalid demo amount")
        amount = Decimal(usd)
        if not amount.is_finite() or amount < Decimal("0.01") or amount > Decimal("1000000") or amount.as_tuple().exponent < -2:
            raise ValueError("Invalid demo amount")
    except (InvalidOperation, TypeError):
        raise ValueError("Invalid demo amount") from None
    rate = snapshot["rates"].get(asset)
    if not rate:
        raise LookupError("Fresh rate unavailable")
    with localcontext() as ctx:
        ctx.prec = 48
        units = (amount / Decimal(rate["usd"])).quantize(
            Decimal(1).scaleb(-ASSETS[asset][1]), rounding=ROUND_UP)
    return {"mode": "demo_only", "source": "CoinGecko",
            "usd": format(amount, ".2f"), "asset": asset,
            "estimated_amount": format(units, "f"),
            "rate_usd": rate["usd"], "last_updated_at": rate["last_updated_at"],
            "payment_enabled": False, "transfer_requested": False}
