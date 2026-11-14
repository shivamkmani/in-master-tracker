#!/usr/bin/env python3
"""Pull PIB releases by ministry and month from PIB's public archive page.

The daily RSS only shows the latest few releases. This reads the archive for
the ministries that matter to the tracked sectors, keeps releases whose title
matches a sector, and merges them into site/data/news.json.

Usage: backfill_news.py [months_back]   (default 1, run with 6 for a first load)
"""
import datetime as dt
import html
import http.cookiejar
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fetch_news as fn  # noqa: E402

URL = "https://www.pib.gov.in/allRel.aspx?reg=3&lang=1"
P = "ctl00$ContentPlaceHolder1$"
MINISTRIES = {
    "1323": "Electronics & IT", "19": "Textiles", "16": "Commerce & Industry", "46": "Ports, Shipping and Waterways",
    "23": "Railways", "26": "Civil Aviation", "69": "Road Transport & Highways",
}
PAUSE = 1.0

opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
opener.addheaders = [("User-Agent", fn.UA)]


def hidden(page):
    return {n: html.unescape(v) for n, v in re.findall(
        r'<input[^>]*name="(__[A-Z]+)"[^>]*value="([^"]*)"', page)}


def post(page, **changes):
    fields = hidden(page)
    fields.update({"ctl00$Bar1$ddlregion": "3", "ctl00$Bar1$ddlLang": "1"})
    fields.update(changes)
    time.sleep(PAUSE)
    return opener.open(URL, urllib.parse.urlencode(fields).encode(), timeout=60).read().decode("utf8", "ignore")


def listing(ministry, year, month):
    page = opener.open(URL, timeout=60).read().decode("utf8", "ignore")
    sel = {P + "ddlMinistry": ministry, P + "ddlday": "0", P + "ddlMonth": str(month), P + "ddlYear": str(year)}
    page = post(page, __EVENTTARGET=P + "ddlMinistry", **sel)
    page = post(page, __EVENTTARGET=P + "ddlMonth", **sel)
    links = re.findall(r'<a[^>]*href=["\'][^"\']*PRID=(\d+)[^"\']*["\'][^>]*>(.*?)</a>', page, re.S)
    return {prid: fn.clean(title) for prid, title in links if fn.clean(title)}


def months_back(n):
    today = dt.date.today()
    y, m = today.year, today.month
    for _ in range(n):
        yield y, m
        m -= 1
        if m == 0:
            y, m = y - 1, 12


def main():
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    data = json.load(open(fn.OUT, encoding="utf8"))
    known = {r["id"]: r for r in data["items"]}
    added = 0
    for year, month in months_back(n):
        for code, name in MINISTRIES.items():
            try:
                found = listing(code, year, month)
            except Exception as exc:
                print("  skipped %s %d-%02d: %s" % (name, year, month, exc))
                continue
            hits = {p: t for p, t in found.items() if "pib-" + p not in known and fn.classify(t, "")}
            print("%d-%02d %-32s %4d listed, %3d relevant" % (year, month, name, len(found), len(hits)), flush=True)
            for prid, title in hits.items():
                time.sleep(PAUSE / 2)
                try:
                    page = fn.pib_page(prid, "3")
                except Exception:
                    continue
                if not page["date"]:
                    continue
                rec = fn.pib_record(prid, title, page)
                if rec:
                    known[rec["id"]] = rec
                    added += 1
    items = sorted(known.values(), key=lambda r: (r["date"], r["id"]), reverse=True)
    data["items"] = items
    with open(fn.OUT, "w", encoding="utf8") as fh:
        json.dump(data, fh, ensure_ascii=False, separators=(",", ":"))
    print("backfill: %d added, %d total" % (added, len(items)))


if __name__ == "__main__":
    main()
