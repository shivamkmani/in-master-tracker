#!/usr/bin/env python3
"""RBI Consumer Confidence Surveys (urban and rural) for the Surveys page.

RBI publishes each round every two months as a web page with HTML tables:
perceptions and one-year-ahead expectations on the economy, employment,
prices, inflation, income and spending (share of respondents saying
improved / same / worsened, and the net response), plus, for the rural
survey, the Current Situation and Future Expectations indices and household
inflation expectations. Each release shows its latest five rounds, so reading
every release on RBI's listing builds a longer history; later releases win
where rounds overlap (revisions).

Writes site/data/surveys.json in the site's long format. Standard library
only. If RBI can't be reached the previous file is kept.
"""
import base64
import html
import json
import os
import re
import sys
import time
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fetch_data as fd  # noqa: E402  (shared writer and data folder)

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"
BASE = "https://www.rbi.org.in/Scripts/"
SURVEYS = {
    "ccs_urban": ("Urban", "Urban Consumer Confidence Survey - Bi-monthly"),
    "ccs_rural": ("Rural", "Rural Consumer Confidence Survey - Bi-monthly"),
}
MON = {m: i + 1 for i, m in enumerate("Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split())}
ROUND = re.compile(r"^([A-Z][a-z]{2})-(\d{2})$")
PAUSE = 1.0


def fetch(url):
    last = None
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            return urllib.request.urlopen(req, timeout=60).read().decode("utf8", "ignore")
        except OSError as exc:
            last = exc
            time.sleep(2 * (attempt + 1))
    raise last


def clean(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s or ""))).strip()


def release_ids(listing_html):
    """The listing renders from ASP.NET view state; the release table sits
    base64-encoded inside it, so decode both layers and read the links."""
    src = listing_html
    m = re.search(r'id="__VIEWSTATE" value="([^"]+)"', listing_html)
    if m:
        vs = m.group(1)
        raw = base64.b64decode(vs + "=" * (-len(vs) % 4)).decode("latin-1")
        for blob in re.findall(r"[A-Za-z0-9+/=]{200,}", raw):
            try:
                src += base64.b64decode(blob + "=" * (-len(blob) % 4)).decode("utf8", "ignore")
            except ValueError:
                pass
    seen = []
    for rid in re.findall(r"PublicationsView\.aspx\?id=(\d+)", src, re.I):
        if rid not in seen:
            seen.append(rid)
    return seen


def period(label):
    m = ROUND.match(label.strip())
    return "20%s-%02d" % (m.group(2), MON[m.group(1)]) if m and m.group(1) in MON else None


TOPIC_NAMES = {
    "general economic situation": "Economic situation", "employment": "Employment", "price level": "Price level",
    "rate of change in price level (inflation)": "Inflation", "income": "Income", "spending": "Spending",
    "spending- essential items": "Spending: essentials", "spending- non-essential items": "Spending: non-essentials",
}
TOPIC_RX = re.compile(r"Expectations on (?:the )?(.+?)\s*\*?$", re.I)


def parse_release(page):
    """Yield (segment, indicator, unit, period, value) from one release page."""
    out = []
    prev_end = 0
    for tm_ in re.finditer(r"<table.*?</table>", page, re.S | re.I):
        tb = tm_.group(0)
        span_start, prev_end = prev_end, tm_.end()
        rows = [[clean(c) for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", r, re.S | re.I)]
                for r in re.findall(r"<tr.*?</tr>", tb, re.S | re.I)]
        data = [r for r in rows if r and period(r[0])]
        if not data:
            continue
        # The title is the last "Table N: ..." line above the first data row. The
        # first table also carries the release header and introduction text,
        # which mention the indices, so only short header cells decide type.
        first = next(i for i, r in enumerate(rows) if r and period(r[0]))
        above = rows[:first]
        # Title: the last "Table N: ..." line before the first data row, which on
        # RBI's pages can sit inside the table or in the release text before it.
        first_row_pos = tm_.start() + tb.find(re.findall(r"<tr.*?</tr>", tb, re.S | re.I)[
            next(i for i, r in enumerate(re.findall(r"<tr.*?</tr>", tb, re.S | re.I))
                 if period(clean((re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", r, re.S | re.I) or [""])[0]) or ""))])
        lead = clean(page[span_start:first_row_pos])
        caps = re.findall(r"Table\s*\d+\s*:\s*(.+?)(?=\s*\(Percentage responses\)|\s*Survey Round|\s*Table\s*\d+\s*:|$)", lead)
        caption = caps[-1].strip() if caps else ""
        header_cells = [c for r in above for c in r if len(c) < 80]
        if any(re.search(r"Current Situation Index", c, re.I) for c in header_cells):
            for r in data:
                p = period(r[0])
                for name, v in (("Current Situation Index", r[1] if len(r) > 1 else None),
                                ("Future Expectations Index", r[2] if len(r) > 2 else None)):
                    v = fd.num(v)
                    if v is not None:
                        out.append(("Consumer confidence", name, "Index", p, v))
            continue
        if re.search(r"Household Inflation Expectations", caption, re.I):
            for r in data:
                p = period(r[0])
                for name, v in (("Median inflation perceived now", r[1] if len(r) > 1 else None),
                                ("Median inflation expected a year ahead", r[3] if len(r) > 3 else None)):
                    v = fd.num(v)
                    if v is not None:
                        out.append(("Household inflation expectations", name, "%", p, v))
            continue
        tm = TOPIC_RX.search(caption)
        if not tm or len(data[0]) < 9:
            continue
        topic = tm.group(1).strip()
        topic = TOPIC_NAMES.get(topic.lower(), topic[0].upper() + topic[1:].lower())
        # Category labels from the header row, e.g. Improved / Remained Same / Worsened
        hdr = next((r for r in rows if len(r) >= 8 and not period(r[0]) and "Net Response" in r), None)
        cur_labels = hdr[:3] if hdr else ["Improved", "Remained same", "Worsened"]
        for r in data:
            p = period(r[0])
            vals = [fd.num(x) for x in r[1:9]]
            pairs = [("Net response, current", vals[3]), ("Net response, one year ahead", vals[7])]
            for k in range(3):
                lab = cur_labels[k].capitalize() if k < len(cur_labels) else str(k)
                pairs.append(("%s, current" % lab, vals[k]))
                pairs.append(("%s, one year ahead" % lab, vals[4 + k]))
            for name, v in pairs:
                if v is not None:
                    out.append((topic, name, "% of respondents", p, v))
    return out


def main():
    prior = fd.previous("surveys")
    status, rows = {}, {}
    for ds, (geo, head) in SURVEYS.items():
        try:
            listing = fetch(BASE + "BimonthlyPublications.aspx?head=" + urllib.request.quote(head))
            ids = release_ids(listing)
            if not ids:
                raise RuntimeError("no releases found on the listing page")
            # Oldest first so newer releases overwrite revised rounds.
            n = 0
            for rid in reversed(ids[:12]):
                time.sleep(PAUSE)
                for seg, ind, unit, p, v in parse_release(fetch(BASE + "PublicationsView.aspx?id=" + rid)):
                    rows[(ds, geo, seg, ind, p)] = [ds, geo, seg, ind, unit, p, v]
                    n += 1
            status["RBI " + geo.lower() + " consumer confidence"] = {"ok": True, "rows": n, "releases": len(ids[:12])}
        except Exception as exc:  # keep last good rows for this survey
            status["RBI " + geo.lower() + " consumer confidence"] = {"ok": False, "error": str(exc)[:200]}
            print("FAILED %s: %s" % (ds, exc))
            for r in prior:
                if r[0] == ds:
                    rows[(r[0], r[1], r[2], r[3], r[5])] = r
    if not rows:
        print("surveys: nothing fetched and no previous data")
        return 0
    fd.write("surveys", "Surveys", sorted(rows.values(), key=lambda r: (r[0], r[2], r[3], r[5])), status)
    meta_path = os.path.join(fd.DATA, "meta.json")
    if os.path.exists(meta_path):
        meta = json.load(open(meta_path, encoding="utf8"))
        meta.setdefault("status", {}).update(status)
        with open(meta_path, "w", encoding="utf8") as fh:
            json.dump(meta, fh, ensure_ascii=False, indent=1)
    for k, s in status.items():
        print("surveys:", k, "ok" if s["ok"] else "FAILED " + s["error"], s.get("rows", ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
