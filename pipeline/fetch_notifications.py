#!/usr/bin/env python3
"""Ministry notifications: gazette notifications, rules, policies, quality
control orders, orders and circulars, read from each ministry's own listing
pages (config/notifications.json) and linked straight to the official PDF.

Every item is kept. Each gets a type (from its title, else the page it was
listed on) and a "major policy" flag, so the site can filter out routine
administrative items (appointments, vacancies, office orders and the like)
without hiding them.

Writes site/data/notifications.json. History builds up: items already stored
stay even after a ministry drops them from its page. A page that can't be read
keeps its earlier items. Standard library only.
"""
import datetime as dt
import hashlib
import html
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fetch_news as fn  # noqa: E402  (sector keywords)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CFG = json.load(open(os.path.join(ROOT, "config", "notifications.json"), encoding="utf8"))
OUT = os.path.join(ROOT, "site", "data", "notifications.json")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"
PAUSE = 1.0
MINOR_RX = re.compile(CFG["minor_patterns"], re.I)
MAJOR_RX = re.compile(CFG["major_patterns"], re.I)
MAJOR_TYPES = {"Act / rules", "Policy / guidelines", "Quality control order", "Draft / consultation", "Gazette notification"}

# Only clear signals in a title override the type of the page an item is listed on.
TYPE_RULES = [
    ("Draft / consultation", r"\bdraft\b|comments? (?:are |is )?invited|public consultation|stakeholder comments|seeking comments|invites? suggestion"),
    ("Quality control order", r"quality control|\bqco"),
    ("Act / rules", r"\brules?,? \d{4}|\bact,? \d{4}|amendment rules|\bordinance\b|regulations,? \d{4}"),
    ("Policy / guidelines", r"^(?:revised |updated |amended )?(?:guidelines|policy)\b|\b(?:policy|guidelines),? 20\d{2}\b|scheme guidelines"),
]
TYPE_RULES = [(t, re.compile(rx, re.I)) for t, rx in TYPE_RULES]

DATE_RXS = [
    (re.compile(r"\b(20\d{2})-(\d{2})-(\d{2})\b"), "ymd"),
    (re.compile(r"\b(\d{1,2})/(\d{1,2})/(20\d{2}) - \d{2}:\d{2}\b"), "mdy"),   # Drupal "updated" stamps
    (re.compile(r"\b(\d{1,2})[./-](\d{1,2})[./-](20\d{2}|19\d{2})\b"), "dmy"),
]


def fetch(url):
    last = None
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html,*/*"})
            return urllib.request.urlopen(req, timeout=60).read().decode("utf8", "ignore")
        except OSError as exc:
            last = exc
            time.sleep(2 * (attempt + 1))
    raise last


def clean(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s or ""))).strip()


def parse_date(text, today):
    for rx, order in DATE_RXS:
        for m in rx.finditer(text):
            a, b, c = (int(x) for x in m.groups())
            y, mo, d = (a, b, c) if order == "ymd" else (c, a, b) if order == "mdy" else (c, b, a)
            for yy, mm, dd in ((y, mo, d), (y, d, mo)):   # fall back to swapped day/month
                try:
                    day = dt.date(yy, mm, dd)
                except ValueError:
                    continue
                if dt.date(1990, 1, 1) <= day <= today + dt.timedelta(days=2):
                    return day.isoformat()
    return None


JUNK_CELL = re.compile(r"^(?:\d{1,4}\.?|view|download.*|\(?[\d.]+ ?[kmg]b\)?|pdf|english|hindi|20\d{2}(?:-\d{2,4})?|.*\.pdf)$", re.I)
NUMBER_CELL = re.compile(r"^\d{1,4}\s*(?:/|of)?\s*\(?(?:re-?)?\)?\s*20\d{2}(?:-\d{2,4})?$", re.I)
STRIP = [re.compile(p, re.I) for p in (
    r"\bdownload\b(?:\s*\(type\s*:\s*pdf\))?", r"\(?\b[\d.]+\s?[KMG]B\)?", r"\bview\b(?: \(.*?\))?", r"\S+\.pdf\b",
    r"\b\d{1,2}/\d{1,2}/20\d{2} - \d{2}:\d{2}\b", r"\b20\d{2}-\d{2}-\d{2}\b", r"visibility", r"^\d{1,3}\s+")]


def tidy_title(t):
    for rx in STRIP:
        t = rx.sub(" ", t)
    t = re.sub(r"\s+", " ", t).strip(" -–|:")
    return t


def candidates(page):
    """Yield (pdf_href, row_text, cells) for every PDF linked from a table row
    or a listing card. Links elsewhere (menus, footers) are skipped."""
    for m in re.finditer(r'<a\b[^>]*href="([^"]+?\.pdf(?:\?[^"]*)?)"[^>]*>', page, re.I):
        href = html.unescape(m.group(1)).strip()
        st = page.rfind("<tr", 0, m.start())
        en = page.find("</tr>", m.end())
        if st != -1 and en != -1 and page.find("</tr>", st, m.start()) == -1 and m.start() - st < 6000:
            row = page[st:en]
            cells = [clean(c) for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", row, re.S | re.I)]
            yield href, clean(row), cells
            continue
        # Card listings (e.g. "Title: ... Date: dd-mm-yyyy ... View")
        window = clean(page[max(0, m.start() - 2500):m.start()])
        k = window.rfind("Title:")
        if k != -1 and len(window) - k < 900:
            card = window[k:]
            tm = re.match(r"Title:\s*(.+?)\s+(?:\S+\s+)?Date:\s*(\S+)", card)
            if tm:
                yield href, card, [tm.group(1), tm.group(2)]


def parse_page(page, base, src, today):
    out = {}
    for href, row, cells in candidates(page):
        url = urllib.parse.urljoin(base, href)
        url = urllib.parse.quote(url, safe=":/?&=%#+,;@()~!*'$")
        number = next((c for c in cells if NUMBER_CELL.match(c)), "")
        date = next((d for d in (parse_date(c, today) for c in cells if len(c) < 40) if d), None) or parse_date(row, today)
        texts = [c for c in cells if c and not JUNK_CELL.match(c) and not NUMBER_CELL.match(c) and not parse_date(c, today) or (c and len(c) > 40)]
        title = tidy_title(max(texts, key=len)) if texts else tidy_title(row)
        if len(re.findall(r"[A-Za-z]", title)) < 6:   # e.g. a bare date where the title should be
            title = tidy_title(row)
        if len(re.findall(r"[A-Za-z]", title)) < 6 or url in out:
            continue
        out[url] = make_item(title, url, date, number, src)
    return list(out.values())


def kind(title, default):
    for t, rx in TYPE_RULES:
        if rx.search(title):
            # A notification issued "under section 21 of the ... Act, 2025" is not the Act itself.
            if t == "Act / rules" and re.search(r"\bunder (?:the )?(?:section|rule|sub-section|clause)", title, re.I):
                continue
            # Recruitment rules for one post are personnel matters.
            if t == "Act / rules" and re.search(r"recruitment rules", title, re.I):
                continue
            return t
    return default


def is_major(title, typ):
    if MINOR_RX.search(title):
        return False
    return typ in MAJOR_TYPES or bool(MAJOR_RX.search(title))


def make_item(title, url, date, number, src):
    typ = kind(title, src["type"])
    sectors = sorted(set(fn.classify(title, "")) | set(src.get("sectors", [])))
    return {"id": hashlib.sha1(url.encode()).hexdigest()[:12], "t": title, "u": url, "d": date, "no": number,
            "m": src["ministry"], "ty": typ, "maj": is_major(title, typ), "s": sectors, "src": src["label"]}


def page_urls(src):
    yield src["url"]
    for p in range(1, src.get("pages", 1)):
        yield src["url"] + ("&" if "?" in src["url"] else "?") + "page=%d" % p


def main():
    today = dt.date.today()
    prior = {}
    if os.path.exists(OUT):
        for r in json.load(open(OUT, encoding="utf8")).get("items", []):
            prior[r["u"]] = r
    items, status = dict(prior), {}
    # On the very first build everything is "new", so an undated item's first-seen
    # day would just be today; leave those undated instead.
    first_build = not prior
    for src in CFG["sources"]:
        n, err = 0, None
        try:
            for i, u in enumerate(page_urls(src)):
                time.sleep(PAUSE)
                try:
                    found = parse_page(fetch(u), u, src, today)
                except OSError:
                    if i == 0:
                        raise
                    break   # later pages are optional
                if i and not found:
                    break
                for r in found:
                    old = items.get(r["u"])
                    if old:   # keep the first date we saw if the page drops it
                        r["d"] = r["d"] or old.get("d")
                        r["seen"] = old.get("seen")
                    else:
                        r["seen"] = None if first_build else today.isoformat()
                    # Undated items take the day they first appeared (marked on the site).
                    r["dated"] = bool(r["d"])
                    r["d"] = r["d"] or r["seen"]
                    items[r["u"]] = r
                    n += 1
        except Exception as exc:
            err = str(exc)[:200]
            print("FAILED %s: %s" % (src["label"], err))
        status[src["label"]] = {"ok": err is None and n > 0, "items": n, "ministry": src["ministry"], "url": src["url"],
                                **({"error": err or "no items found on the page"} if err or not n else {})}
        print("%-40s %s" % (src["label"], "ok %d" % n if err is None and n else "FAILED " + (err or "no items")))
    rows = sorted(items.values(), key=lambda r: (r.get("d") or "", r["t"]), reverse=True)
    with open(OUT, "w", encoding="utf8") as fh:
        json.dump({"updated": dt.datetime.now(dt.timezone.utc).isoformat(timespec="minutes"), "items": rows,
                   "status": status}, fh, ensure_ascii=False, separators=(",", ":"))
    print("notifications: %d items (%d major), %d sources ok of %d" % (
        len(rows), sum(r["maj"] for r in rows), sum(s["ok"] for s in status.values()), len(status)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
