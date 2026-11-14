#!/usr/bin/env python3
"""Build the site's data files from official sources.

Every value is written as one long-format row:
    [dataset, geography, segment, indicator, unit, period, value]
so a single table builder on the site works across all datasets.

If a dataset fails, its previous rows are kept and it is flagged stale, so a
source outage never blanks a table. Run with --skip-asi to reuse ASI data,
which only changes once a year, or --only=CPI to refresh one source group.
"""
import datetime as dt
import json
import os
import re
import socket
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mospi  # noqa: E402

socket.setdefaulttimeout(60)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "site", "data")
INDIA = "All India"
MONTHS = {m: i + 1 for i, m in enumerate(
    "January February March April May June July August September October November December".split())}

MOSPI = "https://esankhyiki.mospi.gov.in/"
DATASETS = {
    "nas": {"title": "National Accounts Statistics", "publisher": "MoSPI", "url": MOSPI, "frequency": "Annual and quarterly", "note": "Base 2022-23. Latest years are provisional and get revised."},
    "gsdp": {"title": "State Domestic Product", "publisher": "MoSPI, from State DES", "url": MOSPI, "frequency": "Annual", "note": "Base 2011-12, so not directly comparable with the 2022-23 national series. Assam, Haryana and Nagaland are not available through MoSPI's API."},
    "gsva": {"title": "Gross State Value Added by industry", "publisher": "MoSPI, from State DES", "url": MOSPI, "frequency": "Annual", "note": "Base 2011-12. Converted from ₹ lakh to ₹ crore. Assam, Haryana and Nagaland are not available through MoSPI's API."},
    "cpi": {"title": "Consumer Price Index", "publisher": "MoSPI", "url": MOSPI, "frequency": "Monthly", "note": "Base 2024, combined rural and urban."},
    "wpi": {"title": "Wholesale Price Index", "publisher": "DPIIT, via MoSPI", "url": MOSPI, "frequency": "Monthly", "note": "Base 2022-23."},
    "iip": {"title": "Index of Industrial Production", "publisher": "MoSPI", "url": MOSPI, "frequency": "Monthly", "note": "Base 2022-23. Growth is year on year as published."},
    "isp": {"title": "Index of Service Production", "publisher": "MoSPI", "url": MOSPI, "frequency": "Monthly", "note": "Base 2024-25. Growth is year on year as published."},
    "plfs": {"title": "Periodic Labour Force Survey", "publisher": "MoSPI", "url": MOSPI, "frequency": "Annual", "note": "Persons aged 15+, rural and urban combined, usual status (PS+SS), calendar year."},
    "asi": {"title": "Annual Survey of Industries", "publisher": "MoSPI", "url": MOSPI, "frequency": "Annual", "note": "Registered factories only, NIC 2008, so it excludes small informal units. Converted from ₹ lakh to ₹ crore. Values can be withheld where few factories report."},
    "rbi_trade": {"title": "India's foreign trade", "publisher": "RBI, via MoSPI", "url": MOSPI, "frequency": "Monthly", "note": "US$ million. MoSPI's copy of this RBI series lags; check the latest period shown."},
    "rbi_fx": {"title": "Foreign exchange reserves", "publisher": "RBI, via MoSPI", "url": MOSPI, "frequency": "Monthly", "note": "US$ million. MoSPI's copy of this RBI series lags; check the latest period shown."},
    "rbi_commodity": {"title": "Exports and imports of major commodities", "publisher": "RBI, via MoSPI", "url": MOSPI, "frequency": "Annual", "note": "US$ million, financial year. National only: this series has no state split."},
}

ASI_YEARS = ["%d-%02d" % (y, (y + 1) % 100) for y in range(2014, 2024)]
ASI_INDICATORS = {
    "Number of Factories", "Factories in Operation", "Fixed Capital", "Invested Capital",
    "Total Output", "Total Inputs", "Gross Value Added", "Net Value Added",
    "Gross Fixed Capital Formation", "Net Profit", "Total Number of Persons Engaged",
    "Total Number of Workers", "Wages and Salaries", "Total Emoluments",
}
ASI_SECTORS = {
    "semiconductors": ["261"],
    "electronics": ["26", "261", "262", "263", "264", "265", "266", "267", "268"],
    "textiles": ["13", "131", "139", "14", "141", "142", "143", "15", "151", "152"],
}
IIP_RX = {
    "electronics": re.compile(r"computer, electronic|electrical equipment", re.I),
    "semiconductors": re.compile(r"computer, electronic", re.I),
    "textiles": re.compile(r"textiles|wearing apparel|leather", re.I),
}
WPI_RX = {
    "electronics": re.compile(r"computer, electronic|electrical equipment", re.I),
    "semiconductors": re.compile(r"computer, electronic", re.I),
    "textiles": re.compile(r"textiles|wearing apparel|leather", re.I),
}
ISP_LOGISTICS = re.compile(r"rail|road|water transport|air transport|warehousing|postal|courier", re.I)
GSVA_LOGISTICS = re.compile(r"transport|storage|railway", re.I)
COMMODITY_RX = {
    "electronics": re.compile(r"electronic", re.I),
    "semiconductors": re.compile(r"electronic", re.I),
    "textiles": re.compile(r"cotton|textile|garment|jute|carpet|handicraft|leather|man-?made|silk|yarn", re.I),
}


def num(value):
    if value in (None, "", "-", "NA", "N.A.", "NA*"):
        return None
    try:
        return float(str(value).replace(",", ""))
    except ValueError:
        return None


def month_period(year, month):
    return "%s-%02d" % (year, MONTHS[month.strip()])


def fy_month_period(fy, month):
    """'2026-27', 'January' -> '2027-01'."""
    start = int(fy[:4])
    m = MONTHS[month.strip()]
    return "%d-%02d" % (start + 1 if m <= 3 else start, m)


def pull(jobs, page_size=200):
    """Run (dataset, filters) jobs one at a time; see the pacing note in mospi.py."""
    return [mospi.get_all(ds, filters, page_size=page_size) for ds, filters in jobs]


def nas_rows(rows, ds, geo_key=None, seg=None, scale=1.0, unit=None):
    out = []
    for r in rows:
        geo = r.get(geo_key) if geo_key else INDIA
        period = r["year"] + (" " + r["quarter"] if r.get("quarter") else "")
        segment = seg(r) if seg else "Economy"
        for field, label in (("constant_price", "constant prices"), ("current_price", "current prices")):
            v = num(r.get(field))
            if v is not None:
                out.append([ds, geo, segment, "%s (%s)" % (r["indicator"].strip(), label),
                            unit or r.get("unit") or "", period, round(v * scale, 2)])
    return out


def b_nas():
    base = {"base_year": "2022-23", "series": "Current"}
    out = []
    for code in (5, 22, 21, 9, 10, 14, 15):
        out += nas_rows(mospi.get_all("NAS", dict(base, frequency_code=1, indicator_code=code)), "nas",
                        seg=lambda r: r.get("industry") or "Economy" if not r.get("subindustry") else None)
    for code in (5, 22):
        out += nas_rows(mospi.get_all("NAS", dict(base, frequency_code=2, indicator_code=code)), "nas")
    gva = [r for r in mospi.get_all("NAS", dict(base, frequency_code=1, indicator_code=1))
           if not r.get("subindustry") and not r.get("institutional_sector")]
    out += nas_rows(gva, "nas", seg=lambda r: r.get("industry") or "Total")
    return [r for r in out if r[2]]


NAS_STATE_CODES = range(1, 38)


def b_state_accounts():
    base = {"base_year": "2011-12", "series": "Current", "frequency_code": 1}
    jobs = [("NAS", dict(base, indicator_code=i, state_code="%02d" % s))
            for s in NAS_STATE_CODES for i in (23, 26, 25, 28, 31)]
    gsdp = []
    for rows in pull(jobs):
        gsdp += nas_rows(rows, "gsdp", geo_key="state")
    jobs = [("NAS", dict(base, indicator_code=29, state_code="%02d" % s)) for s in NAS_STATE_CODES]
    raw = [r for rows in pull(jobs) for r in rows]
    top = [r for r in raw if not r.get("subindustry")]
    gsva = nas_rows(top, "gsva", geo_key="state", seg=lambda r: r.get("industry") or "Total",
                    scale=0.01, unit="₹ crore")
    logistics = nas_rows(
        [r for r in raw if GSVA_LOGISTICS.search((r.get("subindustry") or r.get("industry") or ""))],
        "gsva", geo_key="state", seg=lambda r: r.get("subindustry") or r.get("industry"),
        scale=0.01, unit="₹ crore")
    return gsdp, gsva, logistics


def b_cpi():
    meta = mospi.call("get_metadata", dataset="CPI", base_year="2024", level="Group")["data"][0]
    states = [s["state_code"] for s in meta["state"]]
    divisions = [d["division_code"] for d in meta["division"]]
    years = [2026]  # base-2024 data starts in 2026; earlier years sit on base 2012
    base = {"base_year": "2024", "series": "Current", "sector_code": 3}
    jobs = [("CPI", dict(base, year=y, state_code=s, division_code="00")) for y in years for s in states]
    jobs += [("CPI", dict(base, year=y, state_code=1, division_code="%02d" % d)) for y in years for d in divisions if d != 0]
    out = []
    for rows in pull(jobs, page_size=100):  # the CPI endpoint rejects limit=200
        for r in rows:
            if r.get("group") or r.get("class") or r.get("sub_class") or r.get("item"):
                continue
            period = month_period(r["year"], r["month"])
            seg = (r.get("division") or "CPI (General)").strip()
            if num(r.get("index")) is not None:
                out.append(["cpi", r["state"], seg, "CPI index", "Index", period, num(r["index"])])
            if num(r.get("inflation")) is not None:
                out.append(["cpi", r["state"], seg, "CPI inflation (y/y)", "%", period, num(r["inflation"])])
    return out


def b_iip():
    jobs = [("IIP", {"base_year": "2022-23", "frequency": "Monthly", "type": t, "year": y})
            for t in ("General", "Sectoral", "Use-based category") for y in (2023, 2024, 2025, 2026)]
    out = []
    for rows in pull(jobs):
        for r in rows:
            seg = (r.get("sub_category") or r.get("category") or "General").strip()
            period = month_period(r["year"], r["month"])
            if num(r.get("index")) is not None:
                out.append(["iip", INDIA, seg, "IIP index", "Index", period, num(r["index"])])
            if num(r.get("growth_rate")) is not None:
                out.append(["iip", INDIA, seg, "IIP growth (y/y)", "%", period, num(r["growth_rate"])])
    return out


def b_wpi():
    meta = mospi.call("get_metadata", dataset="WPI", base_year="2022-23")["data"]
    groups = [g["group_code"] for g in meta["group"]
              if any(rx.search(g["label"]) for rx in WPI_RX.values())]
    years = [y["year"] for y in meta["year"]]
    jobs = [("WPI", {"base_year": "2022-23", "year": y, "major_group_code": c})
            for y in years for c in ("1000000000", "1100000000", "1200000000", "1300000000")]
    jobs += [("WPI", {"base_year": "2022-23", "year": y, "group_code": g}) for y in years for g in groups]
    seen, out = set(), []
    for rows in pull(jobs):
        for r in rows:
            if r.get("sub_sub_group") or r.get("item"):
                continue
            seg = (r.get("sub_group") or r.get("group") or r.get("major_group") or "").strip()
            period = month_period(r["year"], r["month"])
            v = num(r.get("index_value"))
            if v is None or (seg, period) in seen:
                continue
            seen.add((seg, period))
            out.append(["wpi", INDIA, seg, "WPI index", "Index", period, v])
    return out


def b_isp():
    out = []
    for fy in ("2025-26", "2026-27"):
        for r in mospi.get_all("ISP", {"base_year": "2024-25", "frequency_code": 2, "year": fy}):
            seg = (r.get("broad_sub_sector") or "Services").strip()
            period = fy_month_period(r["year"], r["month"])
            if num(r.get("index")) is not None:
                out.append(["isp", INDIA, seg, "ISP index", "Index", period, num(r["index"])])
            if num(r.get("growth_rate")) is not None:
                out.append(["isp", INDIA, seg, "ISP growth (y/y)", "%", period, num(r["growth_rate"])])
    return out


def b_plfs():
    names = {1: "Labour force participation rate", 2: "Worker population ratio", 3: "Unemployment rate"}
    years = ["PLFS 2022", "PLFS 2023", "PLFS 2024", "PLFS 2025"]
    filt = {"frequency_code": 1, "gender_code": 3, "sector_code": 3, "age_code": 1, "weekly_status_code": 1}
    jobs = [("PLFS", dict(filt, indicator_code=i, year=y)) for i in names for y in years]
    keys = [i for i in names for _ in years]
    out = []
    for code, rows in zip(keys, pull(jobs)):
        for r in rows:
            if (r.get("gender") != "person" or r.get("sector") != "rural + urban"
                    or r.get("AgeGroup") != "15 years and above" or r.get("weekly_status") != "PS+SS"
                    or r.get("religion") or r.get("socialGroup") or r.get("General_Education")):
                continue
            v = num(r.get("value"))
            if v is not None:
                out.append(["plfs", r["state"], "Labour market", names[code], "%", r["year"].replace("PLFS ", ""), v])
    return out


def b_rbi():
    trade = []
    for r in mospi.get_all("RBI", {"indicator_code": 12}):
        v = num(r.get("value"))
        if v is None:
            continue
        trade.append(["rbi_trade", INDIA, "Merchandise trade", r["trade"].strip(), "US$ million",
                      fy_month_period(r["year"], r["month"]), v])
    fx = []
    for r in mospi.get_all("RBI", {"indicator_code": 47}):
        v = num(r.get("value"))
        if v is None or "US" not in (r.get("foreign_exchange_reserve_currency") or ""):
            continue
        fx.append(["rbi_fx", INDIA, "Reserves", r["foreign_exchange_reserve_type"].strip(), "US$ million",
                   month_period(r["year"], r["month"]), v])
    commodity = []
    for code, flow, key in ((44, "Exports", "export_commodities"), (46, "Imports", "import_commodities")):
        for r in mospi.get_all("RBI", {"indicator_code": code}):
            v = num(r.get("value"))
            name = r.get(key) or next((r[k] for k in r if "commodit" in k), "")
            if v is not None and name:
                commodity.append(["rbi_commodity", INDIA, name.strip(), flow, "US$ million", r["year"], v])
    return trade, fx, commodity


def asi_fetch(job):
    state_code, nic = job
    out, page = [], 1
    while True:
        res = mospi.rest("asi/getASIData", classification_year=2008, sector="Combined", year=",".join(ASI_YEARS),
                         state_code=state_code, nic_code=nic, limit=200, page=page, Format="JSON")
        rows = res.get("data") or []
        out += rows
        if page >= int((res.get("meta_data") or {}).get("totalPages") or 1) or not rows:
            return out
        page += 1


def b_asi():
    meta = mospi.call("get_metadata", dataset="ASI", indicator_code=1)["data"]
    states = [s["state_code"] for s in meta["state"]]
    nics = sorted({n for v in ASI_SECTORS.values() for n in v})
    jobs = [(s, n) for s in states for n in nics]
    rows_by_nic = {n: [] for n in nics}
    for job in jobs:
        for r in asi_fetch(job):
            if r["indicator"].strip() not in ASI_INDICATORS:
                continue
            v = num(r.get("value"))
            if v is None:
                continue
            unit = (r.get("unit") or "").strip()
            if "lakh" in unit.lower():
                v, unit = round(v / 100, 2), "₹ crore"
            elif unit in ("-", ""):
                unit = "Number"
            seg = "NIC %s: %s" % (r["nic_code"], r["nic_description"].replace("Manufacture of ", ""))
            rows_by_nic[str(r["nic_code"])].append(
                ["asi", r["state"].strip(), seg, r["indicator"].strip(), unit, r["year"], v])
    return {sector: [row for n in codes for row in rows_by_nic[n]] for sector, codes in ASI_SECTORS.items()}


def previous(name):
    path = os.path.join(DATA, name + ".json")
    if not os.path.exists(path):
        return []
    raw = json.load(open(path, encoding="utf8"))
    d = raw["dims"]
    return [[d["dataset"][r[0]], d["geo"][r[1]], d["segment"][r[2]], d["indicator"][r[3]], d["unit"][r[4]], r[5], r[6]]
            for r in raw["rows"]]


GEO_FIXES = {
    "chattisgarh": "Chhattisgarh", "orissa": "Odisha", "pondicherry": "Puducherry",
    "nct of delhi": "Delhi", "uttaranchal": "Uttarakhand",
}


def geo_name(value):
    """Datasets spell states differently; one spelling keeps filters complete."""
    v = re.sub(r"\s+", " ", value.replace(" And ", " & ").replace(" and ", " & ")).strip()
    v = re.sub(r"^The ", "", v)
    return GEO_FIXES.get(v.lower(), v)


def seg_name(value):
    """WPI and RBI capitalise the same categories differently from IIP."""
    v = value.replace(" Of ", " of ").replace(" And ", " and ").replace(" Or ", " or ")
    return "Electronic goods" if v.lower() == "electronic goods" else v


def write(name, title, rows, status):
    """Dictionary-encode the repeated text columns to keep files small."""
    dims = {k: [] for k in ("dataset", "geo", "segment", "indicator", "unit")}
    index = {k: {} for k in dims}

    def code(k, v):
        if v not in index[k]:
            index[k][v] = len(dims[k])
            dims[k].append(v)
        return index[k][v]

    seen, encoded = set(), []
    for ds, geo, seg, ind, unit, period, value in rows:
        geo, seg = geo_name(geo), seg_name(seg)
        key = (ds, geo, seg, ind, period)
        if key in seen:
            continue
        seen.add(key)
        encoded.append([code("dataset", ds), code("geo", geo), code("segment", seg),
                        code("indicator", ind), code("unit", unit), period, value])
    payload = {"name": name, "title": title, "dims": dims, "rows": encoded}
    with open(os.path.join(DATA, name + ".json"), "w", encoding="utf8") as fh:
        json.dump(payload, fh, ensure_ascii=False, separators=(",", ":"))
    print("%-16s %7d rows" % (name, len(encoded)))


def main():
    only = next((a.split("=", 1)[1] for a in sys.argv if a.startswith("--only=")), None)
    skip_asi = "--skip-asi" in sys.argv or (only is not None and only != "ASI")
    status, parts = {}, {}

    def run(key, fn, *names):
        if only and key != only:
            return
        try:
            res = fn()
            res = res if isinstance(res, tuple) else (res,)
            for n, rows in zip(names, res):
                if not rows:
                    raise mospi.MospiError("%s returned no rows" % n)
                parts[n] = rows
            status[key] = {"ok": True, "rows": sum(len(r) for r in res)}
        except Exception as exc:
            status[key] = {"ok": False, "error": str(exc)[:200]}
            print("FAILED %s: %s" % (key, exc))

    run("National accounts", b_nas, "nas")
    run("State accounts", b_state_accounts, "gsdp", "gsva", "gsva_logistics")
    run("CPI", b_cpi, "cpi")
    run("IIP", b_iip, "iip")
    run("WPI", b_wpi, "wpi")
    run("ISP", b_isp, "isp")
    run("PLFS", b_plfs, "plfs")
    run("RBI", b_rbi, "rbi_trade", "rbi_fx", "rbi_commodity")
    if not skip_asi:
        try:
            asi = b_asi()
            status["ASI"] = {"ok": True, "rows": sum(len(v) for v in asi.values())}
            for sector, rows in asi.items():
                parts["asi_" + sector] = rows
        except Exception as exc:
            status["ASI"] = {"ok": False, "error": str(exc)[:200]}
            print("FAILED ASI: %s" % exc)

    prior = {n: previous(n) for n in ("macro", "states", "semiconductors", "electronics", "logistics", "textiles")}

    def get(part, file, ds):
        """Fresh rows if this run got them, else last good rows for that dataset."""
        if part in parts:
            return parts[part]
        return [r for r in prior[file] if r[0] == ds]

    def sel(rows, rx, seg_col=2):
        return [r for r in rows if rx.search(r[seg_col])]

    iip, wpi = get("iip", "macro", "iip"), get("wpi", "macro", "wpi")
    commodity = get("rbi_commodity", "macro", "rbi_commodity")
    state_cpi = [r for r in get("cpi", "macro", "cpi") if r[1] != INDIA]
    india_cpi = [r for r in get("cpi", "macro", "cpi") if r[1] == INDIA]
    isp = get("isp", "macro", "isp")
    plfs = get("plfs", "macro", "plfs")

    write("macro", "India macro", get("nas", "macro", "nas") + india_cpi + iip + wpi + isp
          + [r for r in plfs if r[1] == INDIA] + get("rbi_trade", "macro", "rbi_trade")
          + get("rbi_fx", "macro", "rbi_fx") + commodity, status)
    write("states", "States", get("gsdp", "states", "gsdp") + get("gsva", "states", "gsva") + state_cpi
          + [r for r in plfs if r[1] != INDIA], status)
    for sector, title in (("semiconductors", "Semiconductors"), ("electronics", "Electronics"), ("textiles", "Textiles")):
        write(sector, title,
              get("asi_" + sector, sector, "asi") + sel(iip, IIP_RX[sector]) + sel(wpi, WPI_RX[sector])
              + sel(commodity, COMMODITY_RX[sector]), status)
    write("logistics", "Logistics", sel(isp, ISP_LOGISTICS) + get("gsva_logistics", "logistics", "gsva"), status)

    meta_path = os.path.join(DATA, "meta.json")
    if os.path.exists(meta_path):  # keep the last known status of anything not run now
        status = dict(json.load(open(meta_path, encoding="utf8")).get("status", {}), **status)
    meta = {"updated": dt.datetime.now(dt.timezone.utc).isoformat(timespec="minutes"),
            "datasets": DATASETS, "status": status}
    with open(meta_path, "w", encoding="utf8") as fh:
        json.dump(meta, fh, ensure_ascii=False, indent=1)
    ok = sum(1 for s in status.values() if s["ok"])
    print("data: %d/%d source groups ok" % (ok, len(status)))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
