#!/usr/bin/env python3
"""Collect developments from official and trade-association feeds.

PIB's RSS only exposes the latest handful of releases with no dates, so each
run fetches new release pages for date/ministry/body, and merges them into
site/data/news.json. History therefore builds up day by day.
"""
import datetime as dt
import email.utils
import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "site", "data", "news.json")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"
RETENTION_DAYS = 365
SNIPPET = 260

CFG = json.load(open(os.path.join(ROOT, "config", "news.json"), encoding="utf8"))


def fetch(url, timeout=30, retries=2):
    last = None
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            return urllib.request.urlopen(req, timeout=timeout).read()
        except (urllib.error.URLError, OSError) as exc:
            last = exc
            time.sleep(1.5 * (attempt + 1))
    raise last


def clean(text):
    text = re.sub(r"(?is)<(script|style)\b.*?</\1>", " ", text or "")
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def compile_terms(terms):
    return re.compile(r"(?<![\w-])(?:%s)(?![\w-])" % "|".join(re.escape(t) for t in terms), re.I)


SECTOR_RX = {
    s: (compile_terms(k["strong"]), compile_terms(k["weak"]))
    for s, k in CFG["sector_keywords"].items()
}
STATE_RX = {s: compile_terms(a) for s, a in CFG["state_aliases"].items()}


EXCLUDE_RX = compile_terms(CFG["exclude_title_patterns"])


def classify(title, body):
    """Tag sectors. A title hit counts; the body needs repeated, distinct evidence
    so that a passing mention of 'ports' in a long release does not qualify."""
    sectors = []
    if EXCLUDE_RX.search(title):
        return sectors
    for sector, (strong, weak) in SECTOR_RX.items():
        if strong.search(title):
            sectors.append(sector)
            continue
        body_strong = {m.lower() for m in strong.findall(body)}
        title_weak = bool(weak.search(title))
        if len(body_strong) >= 2 or (title_weak and body_strong):
            sectors.append(sector)
    return sectors


def find_states(title, body):
    hits = [s for s, rx in STATE_RX.items() if rx.search(title)]
    if hits:
        return hits
    counts = {s: len(rx.findall(body)) for s, rx in STATE_RX.items()}
    return [s for s, n in counts.items() if n >= 2]


def iso(value):
    if not value:
        return None
    try:
        return email.utils.parsedate_to_datetime(value).date().isoformat()
    except (TypeError, ValueError):
        pass
    m = re.match(r"\d{4}-\d{2}-\d{2}", value.strip())
    return m.group(0) if m else None


def parse_feed(raw):
    root = ET.fromstring(raw.lstrip(b"\xef\xbb\xbf \r\n\t"))
    items = []
    for it in root.iter():
        tag = it.tag.rsplit("}", 1)[-1]
        if tag not in ("item", "entry"):
            continue
        rec = {}
        for child in it:
            name = child.tag.rsplit("}", 1)[-1].lower()
            if name == "link":
                rec["link"] = (child.text or child.get("href") or "").strip()
            elif name in ("title", "description", "summary", "encoded", "content"):
                rec.setdefault(name, child.text or "")
            elif name in ("pubdate", "date", "published", "updated"):
                rec.setdefault("date", child.text or "")
        items.append(rec)
    return items


def pib_page(prid, reg):
    url = "https://www.pib.gov.in/PressReleasePage.aspx?PRID=%s&reg=%s&lang=1" % (prid, reg)
    page = fetch(url).decode("utf8", "ignore")
    when = re.search(r"(\d{2}) ([A-Z]{3}) (\d{4}) \d{1,2}:\d{2}[AP]M by PIB ([A-Za-z ]+?)\s*<", page)
    date, office = None, None
    if when:
        date = dt.datetime.strptime(" ".join(when.group(1, 2, 3)).title(), "%d %b %Y").date().isoformat()
        office = when.group(4).strip()
    ministry = re.search(r'id="MinistryName"[^>]*>(.*?)</div>', page, re.S)
    # Keep only the release itself: site menus list every ministry and would
    # otherwise match every sector.
    start = page.find('id="Titleh2"')
    end = page.find("Release ID", start)
    text = clean(page[start:end]) if 0 <= start < end else ""
    text = re.sub(r'^id="Titleh2">\s*', "", text)
    return {
        "date": date,
        "office": office,
        "ministry": clean(ministry.group(1)) if ministry else "",
        "text": text[:12000],
        "url": url,
    }


def is_english(text):
    return sum(ord(c) < 256 or c in "‘’“”–—₹" for c in text) / max(len(text), 1) > 0.9


def pib_record(prid, title, page):
    sectors = classify(title, page["text"])
    if not sectors:
        return None
    office_state = CFG["pib_region_state"].get(page["office"] or "")
    states = find_states(title, page["text"])
    if office_state and office_state not in states:
        states.append(office_state)
    return {
        "id": "pib-" + prid,
        "title": title,
        "url": page["url"],
        "date": page["date"],
        "publisher": "PIB" + (" " + page["office"] if page["office"] else ""),
        "detail": page["ministry"],
        "type": "Government",
        "scope": "State" if states else "National",
        "sectors": sectors,
        "states": states,
        "snippet": page["text"][:SNIPPET],
    }


def collect_pib(known, status):
    found = {}
    for reg, office in CFG["pib_regions"].items():
        url = "https://www.pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=%s&reg=%s" % (reg, reg)
        try:
            items = parse_feed(fetch(url))
            status["PIB " + office] = {"ok": True, "items": len(items)}
        except Exception as exc:  # one office failing must not stop the rest
            status["PIB " + office] = {"ok": False, "error": str(exc)[:160]}
            continue
        for it in items:
            m = re.search(r"PRID=(\d+)", it.get("link", ""))
            if m and is_english(it.get("title", "")):
                found.setdefault(m.group(1), (it["title"].strip(), reg))

    new = {prid: v for prid, v in found.items() if "pib-" + prid not in known}

    def load(entry):
        prid, (title, reg) = entry
        try:
            return prid, title, pib_page(prid, reg)
        except Exception:
            return prid, title, None

    records = []
    with ThreadPoolExecutor(6) as pool:
        for prid, title, page in pool.map(load, new.items()):
            if not page or not page["date"]:
                continue
            rec = pib_record(prid, title, page)
            if rec:
                records.append(rec)
    status["PIB release pages"] = {"ok": True, "items": len(new)}
    return records


def collect_feed(feed, status):
    records = []
    try:
        items = parse_feed(fetch(feed["url"]))
        status[feed["name"]] = {"ok": True, "items": len(items)}
    except Exception as exc:
        status[feed["name"]] = {"ok": False, "error": str(exc)[:160]}
        return records
    for it in items:
        title = clean(it.get("title"))
        link = it.get("link", "")
        body = clean(it.get("encoded") or it.get("content") or it.get("description") or it.get("summary"))
        date = iso(it.get("date"))
        if not (title and link and date):
            continue
        if EXCLUDE_RX.search(title):
            continue
        sectors = classify(title, "" if feed.get("title_only") else body)
        if feed["require_match"] and not sectors:
            continue
        sectors = sorted(set(sectors) | set(feed["default_sectors"]))
        states = find_states(title, body) if feed["scope"] != "International" else []
        scope = "State" if states else feed["scope"]
        records.append({
            "id": feed["id"] + "-" + re.sub(r"\W+", "", link)[-60:],
            "title": title, "url": link, "date": date,
            "publisher": feed["name"], "detail": "", "type": feed["type"],
            "scope": scope, "sectors": sectors, "states": states,
            "snippet": body[:SNIPPET],
        })
    return records


def collect_federal_register(status):
    """US export-control and trade rules; relevant to semiconductors and supply chains."""
    q = [("per_page", "100"), ("order", "newest"), ("fields[]", "title"), ("fields[]", "abstract"),
         ("fields[]", "html_url"), ("fields[]", "publication_date"), ("fields[]", "agency_names"),
         ("fields[]", "document_number")]
    q += [("conditions[agencies][]", a) for a in CFG["federal_register_agencies"]]
    url = "https://www.federalregister.gov/api/v1/documents.json?" + urllib.parse.urlencode(q)
    records = []
    try:
        docs = json.loads(fetch(url)).get("results", [])
        status["US Federal Register"] = {"ok": True, "items": len(docs)}
    except Exception as exc:
        status["US Federal Register"] = {"ok": False, "error": str(exc)[:160]}
        return records
    for d in docs:
        title, body = d.get("title") or "", d.get("abstract") or ""
        sectors = [s for s in classify(title, body) if s != "macro"]
        if not sectors:
            continue
        records.append({
            "id": "fr-" + d["document_number"], "title": title, "url": d["html_url"],
            "date": d["publication_date"], "publisher": "US Federal Register",
            "detail": ", ".join(d.get("agency_names") or [])[:120], "type": "Government",
            "scope": "International", "sectors": sectors, "states": [], "snippet": body[:SNIPPET],
        })
    return records


def main():
    existing = {}
    if os.path.exists(OUT):
        existing = {r["id"]: r for r in json.load(open(OUT, encoding="utf8")).get("items", [])}
    status = {}
    fresh = collect_pib(existing, status)
    for feed in CFG["feeds"]:
        fresh += collect_feed(feed, status)
    fresh += collect_federal_register(status)

    merged = dict(existing)
    merged.update({r["id"]: r for r in fresh})
    cutoff = (dt.date.today() - dt.timedelta(days=RETENTION_DAYS)).isoformat()
    today = dt.date.today().isoformat()
    items = [r for r in merged.values() if cutoff <= r["date"] <= today]
    items.sort(key=lambda r: (r["date"], r["id"]), reverse=True)

    payload = {"updated": dt.datetime.now(dt.timezone.utc).isoformat(timespec="minutes"),
               "status": status, "items": items}
    with open(OUT, "w", encoding="utf8") as fh:
        json.dump(payload, fh, ensure_ascii=False, separators=(",", ":"))
    ok = sum(1 for s in status.values() if s["ok"])
    print("news: %d items (%d new this run), %d/%d sources ok" % (len(items), len(fresh), ok, len(status)))
    for name, s in status.items():
        if not s["ok"]:
            print("  FAILED %s: %s" % (name, s["error"]))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
