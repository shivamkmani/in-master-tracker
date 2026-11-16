#!/usr/bin/env python3
"""Import the hand-picked daily updates document into site/data/picks.json.

The document is read as a running log: a line that is just a date starts a new
day, a short line without a link is a section heading within that day, and a
line with a link is an article. A plain line right after an article is kept as
that article's note.

Usage:
    import_picks.py                 use the newest .docx in picks/, or the
                                    Google Doc in config/picks.json if set
    import_picks.py path/to/file.docx
    import_picks.py --dry-run ...   print what would be imported, write nothing

Items already in picks.json are kept, so trimming old days out of the document
does not delete them from the site. An article that appears again under the
same date and link is updated, not duplicated.
"""
import datetime as dt
import glob
import json
import os
import re
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
import zipfile
from io import BytesIO

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "site", "data", "picks.json")
CFG = os.path.join(ROOT, "config", "picks.json")
INBOX = os.path.join(ROOT, "picks")

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
R = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
REL = "{http://schemas.openxmlformats.org/package/2006/relationships}"

MONTHS = {m.lower(): i + 1 for i, m in enumerate(
    "January February March April May June July August September October November December".split())}
MONTHS.update({k[:3]: v for k, v in list(MONTHS.items())})
MON = r"(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)"
DAY = r"(?:(?:mon|tues?|wed(?:nes)?|thu(?:rs?)?|fri|sat(?:ur)?|sun)(?:day)?,?\s+)?"
DATE_PATTERNS = [
    re.compile(r"^%s(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?%s,?\s+(\d{4})$" % (DAY, MON), re.I),  # 16 November 2026
    re.compile(r"^%s%s\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$" % (DAY, MON), re.I),            # November 16, 2026
    re.compile(r"^%s(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$" % DAY, re.I),                         # 16/11/2026, 16.11.26
    re.compile(r"^(\d{4})-(\d{2})-(\d{2})$"),                                                      # 2026-11-16
]

# Friendly publisher names for common domains; anything else shows its domain.
SOURCES = {
    "economictimes.indiatimes.com": "Economic Times", "timesofindia.indiatimes.com": "Times of India",
    "livemint.com": "Mint", "business-standard.com": "Business Standard", "thehindu.com": "The Hindu",
    "thehindubusinessline.com": "BusinessLine", "financialexpress.com": "Financial Express",
    "hindustantimes.com": "Hindustan Times", "indianexpress.com": "Indian Express", "moneycontrol.com": "Moneycontrol",
    "reuters.com": "Reuters", "bloomberg.com": "Bloomberg", "ft.com": "Financial Times", "wsj.com": "Wall Street Journal",
    "pib.gov.in": "PIB", "rbi.org.in": "RBI", "sebi.gov.in": "SEBI", "ndtv.com": "NDTV", "ndtvprofit.com": "NDTV Profit",
    "cnbctv18.com": "CNBC-TV18", "theprint.in": "ThePrint", "scroll.in": "Scroll", "thewire.in": "The Wire",
    "deccanherald.com": "Deccan Herald", "nikkei.com": "Nikkei Asia", "asia.nikkei.com": "Nikkei Asia",
    "fortuneindia.com": "Fortune India", "businesstoday.in": "Business Today", "inc42.com": "Inc42",
    "entrackr.com": "Entrackr", "the-ken.com": "The Ken", "themorningcontext.com": "The Morning Context",
}


def parse_date(text):
    t = re.sub(r"\s+", " ", text.strip().strip(":-–—*#").strip())
    if not t or len(t) > 40:
        return None
    for i, rx in enumerate(DATE_PATTERNS):
        m = rx.match(t)
        if not m:
            continue
        try:
            if i == 0:
                d, mon, y = int(m.group(1)), MONTHS[m.group(2).lower()[:3]], int(m.group(3))
            elif i == 1:
                mon, d, y = MONTHS[m.group(1).lower()[:3]], int(m.group(2)), int(m.group(3))
            elif i == 2:
                d, mon, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
                y = y + 2000 if y < 100 else y
            else:
                y, mon, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
            return dt.date(y, mon, d).isoformat()
        except (ValueError, KeyError):
            return None
    return None


def source_for(url):
    host = urllib.parse.urlparse(url).netloc.lower()
    host = re.sub(r"^(www|m|amp)\.", "", host)
    if host in SOURCES:
        return SOURCES[host]
    for dom, name in SOURCES.items():
        if host.endswith("." + dom):
            return name
    return host


def paragraphs(docx_bytes):
    """Yield (text, links, is_heading, all_bold) for each paragraph, in order."""
    z = zipfile.ZipFile(BytesIO(docx_bytes))
    rels = {}
    try:
        for rel in ET.fromstring(z.read("word/_rels/document.xml.rels")).iter(REL + "Relationship"):
            if rel.get("TargetMode") == "External":
                rels[rel.get("Id")] = rel.get("Target")
    except KeyError:
        pass
    body = ET.fromstring(z.read("word/document.xml")).find(W + "body")
    for p in body.iter(W + "p"):
        style = p.find("%spPr/%spStyle" % (W, W))
        style = style.get(W + "val") if style is not None else ""
        parts, links, bold_runs, runs = [], [], 0, 0
        for node in p.iter():
            if node.tag == W + "hyperlink":
                url = rels.get(node.get(R + "id"))
                text = "".join(t.text or "" for t in node.iter(W + "t"))
                if url and text.strip():
                    links.append((text.strip(), url))
            elif node.tag == W + "r":
                txt = "".join(t.text or "" for t in node.iter(W + "t"))
                if txt.strip():
                    runs += 1
                    b = node.find("%srPr/%sb" % (W, W))
                    if b is not None and b.get(W + "val") not in ("0", "false"):
                        bold_runs += 1
            elif node.tag == W + "t":
                parts.append(node.text or "")
            elif node.tag in (W + "tab", W + "br"):
                parts.append(" ")
            elif node.tag == W + "instrText" and "HYPERLINK" in (node.text or ""):
                m = re.search(r'HYPERLINK\s+"([^"]+)"', node.text)
                if m:
                    links.append(("", m.group(1)))
        text = re.sub(r"\s+", " ", "".join(parts)).strip()
        # Bare URLs typed as text, not as links.
        for u in re.findall(r"https?://\S+", text):
            if not any(u.rstrip(").,") == l[1] for l in links):
                links.append(("", u.rstrip(").,")))
        heading = bool(re.match(r"(?i)heading|title", style))
        yield text, links, heading, runs > 0 and bold_runs == runs


def clean_title(text, link_text, url):
    """Prefer the paragraph text minus the raw URL; fall back to the link text."""
    t = text.replace(url, "").strip()
    t = re.sub(r"^[\-–—•*·\d.)\s]+", "", t)
    t = re.sub(r"\s*[\-–—|:(\[]*\s*$", "", t)
    t = re.sub(r"\(\s*\)|\[\s*\]", "", t).strip()
    return t or link_text or url


def parse(docx_bytes):
    items, current, section, last = [], None, "", None
    for text, links, heading, bold in paragraphs(docx_bytes):
        if not text and not links:
            continue
        date = parse_date(text) if not links else None
        if date:
            current, section, last = date, "", None
            continue
        if current is None:
            continue
        if links:
            # One paragraph can hold several links; each becomes its own item
            # unless the paragraph is a single headline with one link.
            if len(links) == 1:
                link_text, url = links[0]
                pairs = [(clean_title(text, link_text, url), url)]
            else:
                pairs = [(lt or source_for(u), u) for lt, u in links]
            for title, url in pairs:
                last = {"date": current, "title": title[:400], "url": url, "source": source_for(url),
                        "section": section, "note": ""}
                items.append(last)
            continue
        short = len(text) <= 70 and not text.endswith(".")
        if heading or (bold and short) or (short and last is None and not section):
            section, last = text.strip(":- "), None
        elif last is not None and not last["note"]:
            last["note"] = text[:500]
        else:
            # A headline pasted without a link still counts as a pick.
            last = {"date": current, "title": text[:400], "url": "", "source": "", "section": section, "note": ""}
            items.append(last)
    return items


def load_source(arg):
    if arg:
        return open(arg, "rb").read(), os.path.basename(arg)
    files = sorted(glob.glob(os.path.join(INBOX, "*.docx")), key=os.path.getmtime)
    if files:
        return open(files[-1], "rb").read(), os.path.basename(files[-1])
    if os.path.exists(CFG):
        url = json.load(open(CFG, encoding="utf8")).get("google_doc_url") or ""
        m = re.search(r"/document/d/([\w-]+)", url)
        if m:
            export = "https://docs.google.com/document/d/%s/export?format=docx" % m.group(1)
            req = urllib.request.Request(export, headers={"User-Agent": "Mozilla/5.0"})
            return urllib.request.urlopen(req, timeout=60).read(), "Google Doc"
    return None, None


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry-run" in sys.argv
    raw, name = load_source(args[0] if args else None)
    if raw is None:
        print("picks: no document found (add a .docx to picks/ or a google_doc_url to config/picks.json)")
        return 0
    new = parse(raw)
    if dry:
        for r in new:
            print(r["date"], "|", r["section"][:20], "|", r["title"][:90], "|", r["source"], "|", r["note"][:40])
        print("picks: %d items over %d days from %s (dry run)" % (len(new), len({r["date"] for r in new}), name))
        return 0
    existing = json.load(open(OUT, encoding="utf8")).get("items", []) if os.path.exists(OUT) else []
    key = lambda r: (r["date"], r["url"] or r["title"])  # noqa: E731
    merged = {key(r): r for r in existing}
    order = {}
    for i, r in enumerate(new):
        merged[key(r)] = r
        order[key(r)] = i
    # Newest day first; within a day keep the document's order.
    items = sorted(merged.values(), key=lambda r: (r["date"], -order.get(key(r), 10**6)), reverse=True)
    payload = {"updated": dt.datetime.now(dt.timezone.utc).isoformat(timespec="minutes"), "items": items}
    with open(OUT, "w", encoding="utf8") as fh:
        json.dump(payload, fh, ensure_ascii=False, separators=(",", ":"))
    print("picks: %d items over %d days (%d read from %s)" % (
        len(items), len({r["date"] for r in items}), len(new), name))
    return 0


if __name__ == "__main__":
    sys.exit(main())
