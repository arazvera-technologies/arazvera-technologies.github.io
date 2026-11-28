"""Public, informational price previews. Never authorizes payments."""
import json
import logging
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from urllib.error import HTTPError
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

def _log_failure(source, exc):
    logging.warning("Price preview provider=%s error=%s status=%s", source,
                    type(exc).__name__, exc.code if isinstance(exc, HTTPError) else "-")

def _kraken_trade(symbol):
    pair = symbol + "/USD"
    query = urlencode({"symbol": pair, "count": 1})
    request = Request("https://api.kraken.com/0/public/PostTrade?" + query,
                      headers={"Accept": "application/json", "User-Agent": "ARAZVERA-Store/1.0"})
    try:
        with urlopen(request, timeout=4) as response:
            data = json.loads(response.read(65536), parse_float=Decimal)
        if data.get("error"):
            return None
        trade = data["result"]["trades"][-1]
        if trade["symbol"] != pair:
            return None
        stamp = datetime.fromisoformat(trade["trade_ts"].replace("Z", "+00:00"))
        if stamp.tzinfo is None:
            return None
        seconds = int(stamp.timestamp())
        price = Decimal(str(trade["price"]))
        if price.is_finite() and price > 0 and -15 <= time.time() - seconds <= MAX_AGE:
            return {"usd": format(price, "f"), "last_updated_at": seconds, "source": "Kraken"}
    except Exception as exc:
        _log_failure("Kraken", exc)
    return None

def _fallback(symbols):
    if not symbols:
        return {}
    with ThreadPoolExecutor(max_workers=5) as pool:
        return {s: r for s, r in zip(symbols, pool.map(_kraken_trade, symbols)) if r}

def rates_snapshot():
    global _cache, _fetched, _retry_after
    with _lock:
        now = time.time()
        if now >= _retry_after and (not _fetched or now - _fetched >= CACHE_TTL):
            try:
                _cache = {s: dict(r, source="CoinGecko")
                          for s, r in validated_rates(_download(), time.time()).items()}
                if not _cache:
                    logging.warning("Price preview CoinGecko: no fresh valid rates")
            except Exception as exc:
                _log_failure("CoinGecko", exc)
                _cache = {}
            _cache.update(_fallback([s for s in ASSETS if s not in _cache]))
            _fetched = time.time()
            _retry_after = _fetched + CACHE_TTL
        now = time.time()
        fresh = {s: r for s, r in _cache.items()
                 if -15 <= now - r["last_updated_at"] <= MAX_AGE}
        sources = sorted({r["source"] for r in fresh.values()})
        return {"source": " + ".join(sources) if sources else "unavailable", "mode": "informational",
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
    return {"mode": "demo_only", "source": rate.get("source", "CoinGecko"),
            "usd": format(amount, ".2f"), "asset": asset,
            "estimated_amount": format(units, "f"),
            "rate_usd": rate["usd"], "last_updated_at": rate["last_updated_at"],
            "payment_enabled": False, "transfer_requested": False}
