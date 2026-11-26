#!/usr/bin/env python3
"""Nifty closing values for the Home page's Markets strip.

NSE Indices publishes each trading day's closing values for all its indices as
a CSV (open, high, low, close, change, P/E, P/B, dividend yield). Only the
latest file stays online, so this looks back over the past week for the newest
one and adds it to site/data/markets.json, which keeps a running history.

Live US prices and Sensex come from TradingView's embeddable widget on the page
itself; NSE and BSE don't license live index prices for free embeds.
Standard library only. If nothing can be fetched the previous file is kept.
"""
import csv
import datetime as dt
import io
import json
import os
import sys
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "site", "data", "markets.json")
URL = "https://www.niftyindices.com/Daily_Snapshot/ind_close_all_%s.csv"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"
KEEP = ["Nifty 50", "Nifty Next 50", "Nifty Bank", "Nifty 500", "India VIX"]
HISTORY_DAYS = 800


def num(s):
    s = (s or "").strip().replace(",", "")
    if s in ("", "-"):
        return None
    try:
        return float(s)
    except ValueError:
        return None


def fetch(day):
    req = urllib.request.Request(URL % day.strftime("%d%m%Y"), headers={"User-Agent": UA, "Accept": "text/csv,*/*"})
    body = urllib.request.urlopen(req, timeout=60).read().decode("utf8", "ignore")
    if not body.startswith("Index Name"):
        return None   # missing days come back as an HTML error page
    rows = {}
    for r in csv.DictReader(io.StringIO(body)):
        name = (r.get("Index Name") or "").strip()
        if name.lower() in (k.lower() for k in KEEP):
            name = next(k for k in KEEP if k.lower() == name.lower())
            d = dt.datetime.strptime(r["Index Date"].strip(), "%d-%m-%Y").date().isoformat()
            rows[name] = {"date": d, "open": num(r.get("Open Index Value")), "high": num(r.get("High Index Value")),
                          "low": num(r.get("Low Index Value")), "close": num(r.get("Closing Index Value")),
                          "change": num(r.get("Points Change")), "pct": num(r.get("Change(%)")),
                          "pe": num(r.get("P/E")), "pb": num(r.get("P/B"))}
    return rows or None


def main():
    data = json.load(open(OUT, encoding="utf8")) if os.path.exists(OUT) else {"indices": {}, "history": {}}
    ist_today = (dt.datetime.now(dt.timezone.utc) + dt.timedelta(hours=5, minutes=30)).date()
    got = None
    for back in range(0, 8):
        day = ist_today - dt.timedelta(days=back)
        if day.weekday() >= 5:
            continue
        try:
            got = fetch(day)
        except OSError as exc:
            print("markets: %s %s" % (day, exc))
            time.sleep(1)
            continue
        if got:
            break
    if not got:
        print("markets: no closing file found in the past week; keeping previous data")
        return 0
    for name, row in got.items():
        data["indices"][name] = row
        hist = {h[0]: h for h in data["history"].get(name, [])}
        hist[row["date"]] = [row["date"], row["close"]]
        data["history"][name] = sorted(hist.values())[-HISTORY_DAYS:]
    data["source"] = {"title": "NSE Indices daily closing values", "publisher": "NSE Indices Ltd", "url": "https://www.niftyindices.com/reports/daily-reports"}
    data["updated"] = dt.datetime.now(dt.timezone.utc).isoformat(timespec="minutes")
    with open(OUT, "w", encoding="utf8") as fh:
        json.dump(data, fh, ensure_ascii=False, separators=(",", ":"))
    n = got.get("Nifty 50")
    print("markets: %d indices for %s; Nifty 50 %s (%s%%)" % (len(got), n and n["date"], n and n["close"], n and n["pct"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
