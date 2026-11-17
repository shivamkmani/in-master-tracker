#!/usr/bin/env python3
"""Build the Human Development page's data from India Policy Insights (Harvard).

Source: Ko, Rajpal et al., "India Policy Insights: Village-, Cluster-, and
District-Level Estimates for 35 Sustainable Development Goal Indicators Across
India, 2021", Harvard Dataverse, doi:10.7910/DVN/GO8W1W (CC0). Estimates use
NFHS-5 (2019-21) and the 2011 Census; village estimates cover rural villages.

The source is one ~590 MB workbook and only changes when the authors publish a
new version, so this runs on request (workflow input "sdg"), not daily.

Writes:
  site/data/hd.json            indicators, states, districts, district means,
                               within-district spread, share of villages meeting
                               the 2030 target, and state and India summaries
  site/data/hd/v/<district>.json  that district's villages (loaded on demand)

Usage: fetch_sdg.py [path/to/workbook.xlsx]   (downloads it when no path given)
Needs openpyxl (installed by the workflow step).
"""
import datetime as dt
import json
import math
import os
import re
import sys
import urllib.request

import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "site", "data", "hd.json")
VDIR = os.path.join(ROOT, "site", "data", "hd", "v")
DOI = "doi:10.7910/DVN/GO8W1W"
API = "https://dataverse.harvard.edu/api"
SOURCE_URL = "https://dataverse.harvard.edu/dataset.xhtml?persistentId=" + DOI
UA = {"User-Agent": "Mozilla/5.0 (compatible; india-tracker/1.0)", "Accept": "*/*"}

GROUPS = [
    ("Poverty and basic services", r"poverty|basic services|electricity"),
    ("Health coverage", r"insurance"),
    ("Nutrition", r"stunting|wasting|underweight|anaemia|overweight"),
    ("Maternal and child health", r"birth|mortality|contracept|pregnan|vaccin|antenatal|delivery"),
    ("Women and girls", r"violence|marriage|mobile phone|bank|literacy|school"),
    ("Tobacco and alcohol", r"tobacco|alcohol"),
    ("Water, sanitation and fuel", r"water|sanitation|hand-washing|handwashing|fuel|cooking"),
]


def group_of(name):
    for label, rx in GROUPS:
        if re.search(rx, name, re.I):
            return label
    return "Other"


def num(v):
    if v is None or v == "" or v == "N/A":
        return None
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return None if math.isnan(f) else f


def download(path):
    # Dataverse refuses Python's default user agent (403), so name the client.
    req = urllib.request.Request(API + "/datasets/:persistentId/?persistentId=" + DOI, headers=UA)
    meta = json.load(urllib.request.urlopen(req, timeout=60))
    files = meta["data"]["latestVersion"]["files"]
    f = next(x for x in files if x["dataFile"]["filename"].lower().endswith(".xlsx"))
    version = "%s.%s" % (meta["data"]["latestVersion"].get("versionNumber"), meta["data"]["latestVersion"].get("versionMinorNumber"))
    url = API + "/access/datafile/%s" % f["dataFile"]["id"]
    print("downloading", f["dataFile"]["filename"], f["dataFile"].get("filesize"), "bytes", flush=True)
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=600) as r, open(path, "wb") as fh:
        while True:
            chunk = r.read(1 << 20)
            if not chunk:
                break
            fh.write(chunk)
    return version


def indicator_names(top_row, first_col, step, count):
    """Group headers sit above the first column of each indicator block."""
    names = []
    for i in range(count):
        raw = str(top_row[first_col + i * step] or "").strip()
        m = re.match(r"^(.*?)\s*\(([^()]*)\)\s*$", raw)
        names.append((m.group(1), m.group(2)) if m else (raw, ""))
    return names


def r1(v):
    return None if v is None else round(v, 2)


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "sdg.xlsx")
    version = None
    if not os.path.exists(path):
        version = download(path)
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)

    # ---- villages: id, name, district id/name, state id/name, then (Mean, Achieved, Rate) per indicator
    ws = wb["Village Estimates"]
    rows = ws.iter_rows(values_only=True)
    top, sub = next(rows), next(rows)
    n_ind = (len(sub) - 6) // 3
    names = indicator_names(top, 6, 3, n_ind)
    districts, states, villages_by_district = {}, {}, {}
    # running sums for state and India means of village estimates and target attainment
    acc = {}

    def add(key, i, mean, achieved):
        a = acc.setdefault(key, [[0.0, 0, 0, 0] for _ in range(n_ind)])[i]
        if mean is not None:
            a[0] += mean
            a[1] += 1
        if achieved is not None:
            a[2] += achieved
            a[3] += 1

    # evidence for each indicator's direction and its 2030 target threshold
    hi_ok = [[float("inf"), float("-inf")] for _ in range(n_ind)]   # min/max mean where achieved
    hi_no = [[float("inf"), float("-inf")] for _ in range(n_ind)]   # min/max mean where not achieved
    count = 0
    for row in rows:
        if row[0] is None:
            continue
        vid, vname, did, dname, sid, sname = row[:6]
        did, sid = int(did), int(sid)
        districts.setdefault(did, {"id": did, "name": str(dname).strip(), "state": sid, "villages": 0})
        districts[did]["villages"] += 1
        states.setdefault(sid, str(sname).strip())
        vals = []
        for i in range(n_ind):
            mean, achieved = num(row[6 + 3 * i]), num(row[7 + 3 * i])
            vals.append(None if mean is None else round(mean, 1))
            add(("d", did), i, mean, achieved)
            add(("s", sid), i, mean, achieved)
            add(("in", 0), i, mean, achieved)
            if mean is not None and achieved is not None:
                box = hi_ok[i] if achieved >= 0.5 else hi_no[i]
                box[0] = min(box[0], mean)
                box[1] = max(box[1], mean)
        villages_by_district.setdefault(did, []).append([int(vid), str(vname or "").strip()] + vals)
        count += 1
        if count % 100000 == 0:
            print("villages read:", count, flush=True)
    print("villages read:", count, "districts:", len(districts), "states:", len(states), flush=True)

    # direction: achieved villages sit above the target when higher is better
    indicators = []
    for i, (name, unit) in enumerate(names):
        ok, no = hi_ok[i], hi_no[i]
        higher = None
        target = None
        if ok[1] > float("-inf") and no[1] > float("-inf"):
            higher = (ok[0] + ok[1]) > (no[0] + no[1])
            target = round(ok[0], 2) if higher else round(ok[1], 2)
        indicators.append({"name": name, "unit": unit or "%", "group": group_of(name),
                           "higher_better": higher, "target_approx": target})

    # ---- districts: District ID, then (Mean, SD) per indicator
    ws = wb["District Estimates"]
    rows = ws.iter_rows(values_only=True)
    top, sub = next(rows), next(rows)
    dnames = [n for n, _ in indicator_names(top, 1, 2, (len(sub) - 1) // 2)]
    col = {n: i for i, n in enumerate(dnames)}
    dmean, dsd = {}, {}
    for row in rows:
        if row[0] is None:
            continue
        did = int(row[0])
        dmean[did] = [r1(num(row[1 + 2 * col[n]])) if n in col else None for n, _ in names]
        dsd[did] = [r1(num(row[2 + 2 * col[n]])) if n in col else None for n, _ in names]
    missing = sorted(set(dmean) - set(districts))
    if missing:
        print("district sheet ids with no villages (kept without names):", missing[:20])

    def summary(key):
        a = acc.get(key)
        if not a:
            return None, None
        means = [r1(x[0] / x[1]) if x[1] else None for x in a]
        share = [round(100 * x[2] / x[3], 1) if x[3] else None for x in a]
        return means, share

    district_list = []
    for did in sorted(set(districts) | set(dmean)):
        d = districts.get(did, {"id": did, "name": "District %d" % did, "state": None, "villages": 0})
        _, share = summary(("d", did))
        district_list.append({"id": did, "name": d["name"], "state": d["state"], "villages": d["villages"],
                              "mean": dmean.get(did) or summary(("d", did))[0], "sd": dsd.get(did),
                              "met": share})
    state_list = []
    for sid, sname in sorted(states.items(), key=lambda x: x[1]):
        m, share = summary(("s", sid))
        state_list.append({"id": sid, "name": sname, "mean": m, "met": share})
    india_mean, india_share = summary(("in", 0))

    payload = {
        "source": {"title": "India Policy Insights: village-, cluster- and district-level estimates for 35 SDG indicators, 2021",
                   "publisher": "Harvard University (Geographic Insights Lab), Harvard Dataverse", "url": SOURCE_URL,
                   "doi": DOI, "licence": "CC0 1.0", "version": version,
                   "note": "Model-based estimates from NFHS-5 (2019-21) and the 2011 Census. Village estimates cover inhabited rural villages; state and India figures here are simple averages of village estimates, not official survey figures."},
        "built": dt.datetime.now(dt.timezone.utc).isoformat(timespec="minutes"),
        "indicators": indicators, "states": state_list, "districts": district_list,
        "india": {"mean": india_mean, "met": india_share}, "villages": count,
    }
    os.makedirs(VDIR, exist_ok=True)
    for f in os.listdir(VDIR):
        os.remove(os.path.join(VDIR, f))
    for did, vs in villages_by_district.items():
        vs.sort(key=lambda v: v[1].lower())
        with open(os.path.join(VDIR, "%d.json" % did), "w", encoding="utf8") as fh:
            json.dump(vs, fh, ensure_ascii=False, separators=(",", ":"))
    with open(OUT, "w", encoding="utf8") as fh:
        json.dump(payload, fh, ensure_ascii=False, separators=(",", ":"))
    print("hd: %d indicators, %d states, %d districts, %d villages" % (len(indicators), len(state_list), len(district_list), count))
    for ind in indicators:
        print("  %-45s %-28s higher_better=%s target~%s" % (ind["name"], ind["group"], ind["higher_better"], ind["target_approx"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
