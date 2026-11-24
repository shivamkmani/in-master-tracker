/* India Dashboard: static front end. All text from data files is set with
   textContent, never innerHTML, because it originates from external sources. */
"use strict";

const PAGES = {
  macro: {
    label: "India macro", news: "macro",
    lede: "National accounts, prices, production, jobs, trade and reserves from MoSPI and RBI.",
    presets: [
      ["GDP growth", { ind: /GDP Growth Rate \(constant/, freq: "Annual" }],
      ["Quarterly GDP growth", { ind: /GDP Growth Rate \(constant/, freq: "Quarterly" }],
      ["GVA by industry", { ind: /Gross Value Added \(constant/, freq: "Annual" }],
      ["CPI inflation", { ind: /CPI inflation/, freq: "Monthly" }],
      ["IIP growth", { ind: /IIP growth/, seg: /^(General|Manufacturing|Capital Goods|Consumer Durables)$/, freq: "Monthly" }],
      ["Trade", { ds: ["rbi_trade"], freq: "Monthly" }],
    ],
  },
  states: {
    label: "States", news: null,
    lede: "Compare states on output, structure, prices and jobs. Pick a focus state to filter the data and the developments together.",
    caveat: "State GDP data is on a 2011-12 base, while the national series is on 2022-23, so don't compare the two directly. MoSPI's API has no GSDP for Assam, Haryana or Nagaland.",
    presets: [
      ["GSDP (constant prices)", { ind: /Gross State Domestic Product \(constant/, freq: "Annual" }],
      ["GSDP growth", { ind: /GSDP Growth Rate \(constant/, freq: "Annual" }],
      ["Per capita income", { ind: /Per Capita Net State Domestic Product \(current/, freq: "Annual" }],
      ["Manufacturing GVA", { ind: /Gross State Value Added \(constant/, seg: /^Manufacturing$/, freq: "Annual" }],
      ["Unemployment", { ind: /Unemployment rate/, freq: "Annual" }],
      ["CPI inflation", { ind: /CPI inflation/, freq: "Monthly" }],
    ],
  },
  semiconductors: {
    label: "Semiconductors", news: "semiconductors",
    lede: "State and national indicators for the nearest official categories, with developments in India and abroad.",
    caveat: "India publishes no dedicated semiconductor output series. NIC 261 (electronic components and boards) is the closest official proxy, and it also includes items such as PCBs, so treat it as an upper-bound context measure. National series (IIP, WPI, trade) cover all electronics.",
    presets: [
      ["Components: GVA by state", { ds: ["asi"], ind: /^Gross Value Added$/, freq: "Annual" }],
      ["Components: jobs by state", { ds: ["asi"], ind: /Persons Engaged/, freq: "Annual" }],
      ["Components: factories", { ds: ["asi"], ind: /^Number of Factories$/, freq: "Annual" }],
      ["Electronics imports", { ds: ["rbi_commodity"], ind: /Imports/, freq: "Annual" }],
    ],
  },
  electronics: {
    label: "Electronics", news: ["electronics", "semiconductors"],
    lede: "Factory-level data by state and industry group, production and price indices, and trade.",
    caveat: "ASI covers registered factories and lags by about two years, so 2023-24 is the latest. Trade figures are national only.",
    presets: [
      ["GVA by state", { ds: ["asi"], ind: /^Gross Value Added$/, seg: /^NIC 26:/, freq: "Annual" }],
      ["Output by state", { ds: ["asi"], ind: /^Total Output$/, seg: /^NIC 26:/, freq: "Annual" }],
      ["Jobs by state", { ds: ["asi"], ind: /Persons Engaged/, seg: /^NIC 26:/, freq: "Annual" }],
      ["Sub-industry mix", { ds: ["asi"], ind: /^Gross Value Added$/, freq: "Annual" }],
      ["Production index", { ds: ["iip"], ind: /IIP growth/, freq: "Monthly" }],
      ["Exports and imports", { ds: ["rbi_commodity"], freq: "Annual" }],
    ],
  },
  logistics: {
    label: "Logistics", news: "logistics",
    lede: "Monthly service output by transport mode, and state value added for transport and storage.",
    caveat: "ASI excludes logistics because it only surveys factories. ISP is national, with data from 2025-26. State figures come from GSVA on a 2011-12 base, with no Assam, Haryana or Nagaland. Port and air cargo volumes aren't included yet.",
    presets: [
      ["Service growth by mode", { ds: ["isp"], ind: /ISP growth/, freq: "Monthly" }],
      ["Courier and warehousing", { ds: ["isp"], ind: /ISP index/, seg: /Postal|Warehousing/, freq: "Monthly" }],
      ["State GVA: transport", { ds: ["gsva"], ind: /constant/, seg: /Transport, Storage/, freq: "Annual" }],
      ["State GVA: road", { ds: ["gsva"], ind: /constant/, seg: /Road/, freq: "Annual" }],
    ],
  },
  textiles: {
    label: "Textiles", news: "textiles",
    lede: "Textiles, apparel and leather: factory data by state, indices and trade.",
    caveat: "Leather and handbags (NIC 15) sit here alongside textiles and apparel. Use the Segment filter to separate them. Trade figures are national only.",
    presets: [
      ["Textiles GVA by state", { ds: ["asi"], ind: /^Gross Value Added$/, seg: /^NIC 13:/, freq: "Annual" }],
      ["Apparel GVA by state", { ds: ["asi"], ind: /^Gross Value Added$/, seg: /^NIC 14:/, freq: "Annual" }],
      ["Leather GVA by state", { ds: ["asi"], ind: /^Gross Value Added$/, seg: /^NIC 15:/, freq: "Annual" }],
      ["Apparel jobs by state", { ds: ["asi"], ind: /Persons Engaged/, seg: /^NIC 14:/, freq: "Annual" }],
      ["Production index", { ds: ["iip"], ind: /IIP growth/, freq: "Monthly" }],
      ["Exports", { ds: ["rbi_commodity"], ind: /Exports/, freq: "Annual" }],
    ],
  },
  auto: {
    label: "Auto", news: "auto",
    lede: "Vehicles and components: production and price indices, trade, household transport costs, and factory data by state, with industry and policy developments.",
    caveat: "Factory data is ASI NIC 29 (motor vehicles, trailers and parts) and NIC 30 (other transport equipment; NIC 309 includes motorcycles and bicycles) for registered factories, 2014-15 to 2023-24; it appears after the next full ASI run. Vehicle sales and registrations (SIAM, VAHAN) aren't included yet. Trade covers imports of all transport equipment, national and annual; MoSPI's copy of the RBI series has no matching export line.",
    tiles: [
      ["Vehicle output growth", (r) => r.ds === "iip" && /growth/.test(r.ind) && /Motor Vehicles/i.test(r.seg), "%", "Production index"],
      ["Vehicle wholesale prices", (r) => r.ds === "wpi" && r.seg === "Manufacture of Motor Vehicles", "", "Wholesale prices"],
      ["Transport equipment imports", (r) => r.ds === "rbi_commodity" && r.ind === "Imports", "usd_m", "Imports"],
      ["Transport inflation", (r) => r.ds === "cpi" && /inflation/.test(r.ind), "%", "Transport inflation"],
    ],
    presets: [
      ["Production index", { ds: ["iip"], ind: /IIP growth/, freq: "Monthly" }],
      ["Wholesale prices", { ds: ["wpi"], seg: /Motor Vehicles$|Motorcycles|Parts and Accessories|Tyres/, freq: "Monthly" }],
      ["Imports", { ds: ["rbi_commodity"], freq: "Annual" }],
      ["Transport inflation", { ds: ["cpi"], ind: /CPI inflation/, freq: "Monthly" }],
      ["Vehicles GVA by state", { ds: ["asi"], ind: /^Gross Value Added$/, seg: /^NIC 29:/, freq: "Annual" }],
      ["Vehicles jobs by state", { ds: ["asi"], ind: /Persons Engaged/, seg: /^NIC 29:/, freq: "Annual" }],
      ["Two-wheelers and other (NIC 309)", { ds: ["asi"], ind: /^Gross Value Added$/, seg: /^NIC 309:/, freq: "Annual" }],
      ["Components vs vehicles", { ds: ["asi"], ind: /^Gross Value Added$/, seg: /^NIC 29\d:/, freq: "Annual" }],
    ],
  },
  chemicals: {
    label: "Chemicals", news: "chemicals",
    lede: "Basic chemicals, fertilisers, agrochemicals, polymers and specialty chemicals: production, prices, trade and factory data by state.",
    caveat: "Factory data is ASI NIC 20 (chemicals and chemical products, excluding pharmaceuticals) with its groups 201 basic chemicals and fertilisers, 202 other chemical products and 203 man-made fibres; it appears after the next full ASI run. The production index groups chemicals with rubber and plastics as separate series. Trade is national and annual.",
    tiles: [
      ["Chemicals output growth", (r) => r.ds === "iip" && /growth/.test(r.ind) && /^Manufacture of Chemicals/i.test(r.seg), "%", "Production index"],
      ["Chemicals wholesale prices", (r) => r.ds === "wpi" && r.seg === "Manufacture of Chemicals and Chemical Products", "", "Wholesale prices"],
      ["Organic and inorganic exports", (r) => r.ds === "rbi_commodity" && r.ind === "Exports" && /^Organic/.test(r.seg), "usd_m", "Exports and imports"],
      ["Fertiliser imports", (r) => r.ds === "rbi_commodity" && r.ind === "Imports" && /^Fertilisers/.test(r.seg), "usd_m", "Fertiliser trade"],
    ],
    presets: [
      ["Production index", { ds: ["iip"], ind: /IIP growth/, freq: "Monthly" }],
      ["Wholesale prices", { ds: ["wpi"], freq: "Monthly" }],
      ["Exports and imports", { ds: ["rbi_commodity"], freq: "Annual" }],
      ["Fertiliser trade", { ds: ["rbi_commodity"], seg: /^Fertilisers/, freq: "Annual" }],
      ["GVA by state", { ds: ["asi"], ind: /^Gross Value Added$/, seg: /^NIC 20:/, freq: "Annual" }],
      ["Jobs by state", { ds: ["asi"], ind: /Persons Engaged/, seg: /^NIC 20:/, freq: "Annual" }],
      ["Product mix", { ds: ["asi"], ind: /^Gross Value Added$/, seg: /^NIC 20\d:/, freq: "Annual" }],
    ],
  },
  pharma: {
    label: "Pharma", news: "pharma",
    lede: "Production, prices, trade and factory data for pharmaceuticals, with regulatory and industry developments in India and abroad.",
    caveat: "The factory data is ASI NIC 21 (pharmaceuticals, medicinal chemicals and botanical products) for registered factories. It covers 2014-15 to 2023-24 and only refreshes when ASI is re-run. Trade figures are national and annual. Health CPI covers what households spend on healthcare, not drug prices alone.",
    presets: [
      ["Production index", { ds: ["iip"], ind: /IIP growth/, freq: "Monthly" }],
      ["Wholesale prices", { ds: ["wpi"], freq: "Monthly" }],
      ["Exports and imports", { ds: ["rbi_commodity"], freq: "Annual" }],
      ["Health CPI inflation", { ds: ["cpi"], ind: /CPI inflation/, freq: "Monthly" }],
      ["GVA by state", { ds: ["asi"], ind: /^Gross Value Added$/, seg: /^NIC 21:/, freq: "Annual" }],
      ["Jobs by state", { ds: ["asi"], ind: /Persons Engaged/, seg: /^NIC 21:/, freq: "Annual" }],
      ["Output by state", { ds: ["asi"], ind: /^Total Output$/, seg: /^NIC 21:/, freq: "Annual" }],
      ["Factories by state", { ds: ["asi"], ind: /^Number of Factories$/, seg: /^NIC 21:/, freq: "Annual" }],
      ["Investment by state", { ds: ["asi"], ind: /^Gross Fixed Capital Formation$/, seg: /^NIC 21:/, freq: "Annual" }],
      ["Profit by state", { ds: ["asi"], ind: /^Net Profit$/, seg: /^NIC 21:/, freq: "Annual" }],
    ],
    tiles: [
      ["Pharma output growth", (r) => r.ds === "iip" && /growth/.test(r.ind), "%", "Production index"],
      ["Pharma wholesale prices", (r) => r.ds === "wpi" && /^Manufacture of Pharmaceuticals, Medicinal/.test(r.seg), "", "Wholesale prices"],
      ["Drug exports", (r) => r.ds === "rbi_commodity" && r.ind === "Exports", "usd_m", "Exports and imports"],
      ["Health inflation", (r) => r.ds === "cpi" && /inflation/.test(r.ind), "%", "Health CPI inflation"],
    ],
  },
  energy: {
    label: "Energy", news: "energy",
    lede: "Oil, gas, coal and power: production and price indices, trade, value added by state, and developments in India and abroad.",
    caveat: "Physical volumes (crude and gas output, refinery throughput, power generation in units, installed capacity) aren't included yet: PPAC and CEA publish them outside MoSPI, so the IIP electricity and fuel-mineral indices are the closest monthly measures. State figures use a 2011-12 base. Refinery factory data is ASI NIC 19 (coke and refined petroleum) for 2014-15 to 2023-24; ASI returns no data for power plants (NIC 35).",
    presets: [
      ["Power output growth", { ds: ["iip"], ind: /IIP growth/, seg: /Electricity/, freq: "Monthly" }],
      ["Renewable vs other power", { ds: ["iip"], ind: /IIP index/, seg: /Renewable Electricity$/, freq: "Monthly" }],
      ["Fuel and power prices", { ds: ["wpi"], seg: /^(Fuel & Power|Mineral Oils|Coal and Lignite|Electricity)$/, freq: "Monthly" }],
      ["Oil and coal trade", { ds: ["rbi_commodity"], freq: "Annual" }],
      ["Utilities GVA by state", { ds: ["gsva"], ind: /constant/, seg: /^Electricity/, freq: "Annual" }],
      ["Mining GVA by state", { ds: ["gsva"], ind: /constant/, seg: /^Mining/, freq: "Annual" }],
      ["Household fuel inflation", { ds: ["cpi"], ind: /CPI inflation/, freq: "Monthly" }],
      ["Refining GVA by state", { ds: ["asi"], ind: /^Gross Value Added$/, seg: /^NIC 19:/, freq: "Annual" }],
      ["Refining output by state", { ds: ["asi"], ind: /^Total Output$/, seg: /^NIC 19:/, freq: "Annual" }],
      ["Refining jobs by state", { ds: ["asi"], ind: /Persons Engaged/, seg: /^NIC 19:/, freq: "Annual" }],
      ["Mining and fuel minerals", { ds: ["iip"], ind: /IIP growth/, seg: /^(Mining & Quarrying|Fuel Minerals)$/, freq: "Monthly" }],
      ["Coal prices", { ds: ["wpi"], seg: /Coal/, freq: "Monthly" }],
    ],
    tiles: [
      ["Power output growth", (r) => r.ds === "iip" && /growth/.test(r.ind) && r.seg === "Electricity", "%", "Power output growth"],
      ["Fuel and power prices", (r) => r.ds === "wpi" && r.seg === "Fuel & Power", "", "Fuel and power prices"],
      ["Petroleum imports", (r) => r.ds === "rbi_commodity" && r.ind === "Imports" && /^Petroleum, Crude/.test(r.seg), "usd_m", "Oil and coal trade"],
      ["Household fuel inflation", (r) => r.ds === "cpi" && /inflation/.test(r.ind), "%", "Household fuel inflation"],
    ],
  },
  surveys: {
    label: "Surveys", news: "macro", nonSector: true,
    lede: "How households see the economy, jobs, prices, income and spending, now and a year ahead, from RBI's urban and rural Consumer Confidence Surveys.",
    caveat: "Net response is the share saying things improved minus the share saying they worsened. For prices and inflation it is increased minus decreased, so a more negative number means more households see prices rising. Rural indices above 100 mean optimists outnumber pessimists. Each RBI release shows its latest five rounds; the history here is built from every release on RBI's site.",
    tiles: [
      ["Rural: current situation", (r) => r.ds === "ccs_rural" && r.ind === "Current Situation Index", "", "Rural confidence indices"],
      ["Rural: future expectations", (r) => r.ds === "ccs_rural" && r.ind === "Future Expectations Index", "", "Rural confidence indices"],
      ["Urban: economy, net now", (r) => r.ds === "ccs_urban" && r.seg === "Economic situation" && r.ind === "Net response, current", "", "Economy: urban vs rural"],
      ["Rural: expected inflation", (r) => r.ds === "ccs_rural" && r.ind === "Median inflation expected a year ahead", "%", "Household inflation expectations"],
    ],
    presets: [
      ["Economy: urban vs rural", { seg: /^Economic situation$/, ind: /^Net response/, freq: "Monthly" }],
      ["Employment", { seg: /^Employment$/, ind: /^Net response/, freq: "Monthly" }],
      ["Prices and inflation", { seg: /^(Price level|Inflation)$/, ind: /^Net response/, freq: "Monthly" }],
      ["Income", { seg: /^Income$/, ind: /^Net response/, freq: "Monthly" }],
      ["Spending", { seg: /^Spending/, ind: /^Net response, current/, freq: "Monthly" }],
      ["Rural confidence indices", { ds: ["ccs_rural"], seg: /^Consumer confidence$/, freq: "Monthly" }],
      ["Household inflation expectations", { seg: /^Household inflation expectations$/, freq: "Monthly" }],
      ["Full breakdown: economy", { seg: /^Economic situation$/, freq: "Monthly" }],
    ],
  },
  finance: {
    label: "Finance", news: "finance",
    lede: "Banking, insurance and financial services: value added nationally and by state, monthly service output, reserves, and developments from RBI, SEBI and others.",
    caveat: "Bank credit, deposits and interest rates aren't included yet: RBI publishes them on its own database, which this site doesn't read yet. State financial services GVA uses a 2011-12 base, while the national series uses 2022-23. Banking and insurance service output (ISP) starts in 2025-26.",
    presets: [
      ["Financial services GVA", { ds: ["nas"], ind: /Gross Value Added \(constant/, freq: "Annual" }],
      ["Financial services growth", { ds: ["nas"], ind: /GVA Growth Rate \(constant/, freq: "Annual" }],
      ["State financial services GVA", { ds: ["gsva"], ind: /constant/, freq: "Annual" }],
      ["Banking and insurance output", { ds: ["isp"], ind: /ISP growth/, freq: "Monthly" }],
      ["Foreign exchange reserves", { ds: ["rbi_fx"], freq: "Monthly" }],
    ],
  },
};

const MONTHLY = new Set(["cpi", "wpi", "iip", "isp", "rbi_trade", "rbi_fx", "ccs_urban", "ccs_rural"]);
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MAX_ROWS = 300;
const MAX_SERIES = 6;

const G = { meta: null, news: null, picks: null, cache: {}, focus: "" };
let V = null; // state of the current page

const el = (tag, props, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (k === "class") n.className = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else if (k in n && k !== "list") n[k] = v;
    else n.setAttribute(k, v);
  }
  for (const c of kids.flat()) if (c != null) n.append(c);
  return n;
};
const fmt = (v) => v == null ? "" : v.toLocaleString("en-IN", { maximumFractionDigits: Math.abs(v) < 1000 ? 2 : 0 });
const freqOf = (ds, p) => MONTHLY.has(ds) ? "Monthly" : (/ Q\d$/.test(p) ? "Quarterly" : "Annual");
const periodLabel = (p, f) => f === "Monthly" ? MON[+p.slice(5) - 1] + " " + p.slice(0, 4) : p;
const dateLabel = (s) => new Date(s + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

async function getJSON(name) {
  // Revalidate every time: Pages lets browsers reuse files for 10 minutes, which
  // hid freshly published picks. Unchanged files come back as a cheap 304.
  const r = await fetch("data/" + name + ".json", { cache: "no-cache" });
  if (!r.ok) throw new Error(name + ": HTTP " + r.status);
  return r.json();
}

async function loadPage(name) {
  if (!G.cache[name]) {
    const raw = await getJSON(name);
    const d = raw.dims;
    G.cache[name] = raw.rows.map((r) => {
      const ds = d.dataset[r[0]];
      return { ds, geo: d.geo[r[1]], seg: d.segment[r[2]], ind: d.indicator[r[3]], unit: d.unit[r[4]], p: r[5], v: r[6], f: freqOf(ds, r[5]) };
    });
  }
  return G.cache[name];
}

/* ---------- filtering ---------- */
const uniq = (a) => [...new Set(a)];
function matches(r, skip) {
  const s = V.sel;
  return r.f === s.freq
    && (skip === "ds" || !s.ds.length || s.ds.includes(r.ds))
    && (skip === "geo" || !s.geo.length || s.geo.includes(r.geo))
    && (skip === "seg" || !s.seg.length || s.seg.includes(r.seg))
    && (skip === "ind" || !s.ind.length || s.ind.includes(r.ind));
}
function optionsFor(key) {
  return uniq(V.rows.filter((r) => matches(r, key)).map((r) => r[key])).sort((a, b) => {
    if (a === "All India") return -1;
    if (b === "All India") return 1;
    return a.localeCompare(b);
  });
}

function applyPreset(p) {
  const s = V.sel, pool = V.rows;
  s.freq = p.freq; s.ds = p.ds || [];
  const base = pool.filter((r) => r.f === p.freq && (!s.ds.length || s.ds.includes(r.ds)));
  s.ind = p.ind ? uniq(base.filter((r) => p.ind.test(r.ind)).map((r) => r.ind)) : [];
  s.seg = p.seg ? uniq(base.filter((r) => p.seg.test(r.seg)).map((r) => r.seg)) : [];
  // An empty filter means "everything", so a preset with no matching data must
  // select nothing rather than fall through to an unrelated full table.
  if (p.ind && !s.ind.length) s.ind = ["(no data)"];
  if (p.seg && !s.seg.length) s.seg = ["(no data)"];
  s.geo = [];
  if (G.focus) {
    const has = base.some((r) => r.geo === G.focus && (!s.ind.length || s.ind.includes(r.ind)));
    s.geo = has ? [G.focus, "All India"].filter((g) => base.some((r) => r.geo === g)) : [];
  }
  V.sort = null;
}

function pivot() {
  const s = V.sel;
  const rows = V.rows.filter((r) => matches(r));
  let periods = uniq(rows.map((r) => r.p)).sort();
  if (s.span) periods = periods.slice(-s.span);
  const keep = new Set(periods);
  const map = new Map();
  for (const r of rows) {
    if (!keep.has(r.p)) continue;
    const k = [r.geo, r.seg, r.ind, r.unit, r.ds].join("\u0001");
    let o = map.get(k);
    if (!o) { o = { geo: r.geo, seg: r.seg, ind: r.ind, unit: r.unit, ds: r.ds, vals: {} }; map.set(k, o); }
    o.vals[r.p] = r.v;
  }
  const out = [...map.values()];
  const last = periods[periods.length - 1];
  const col = V.sort ? V.sort.col : last;
  const dir = V.sort ? V.sort.dir : -1;
  out.sort((a, b) => {
    if (["geo", "seg", "ind"].includes(col)) return dir * a[col].localeCompare(b[col]);
    const x = a.vals[col], y = b.vals[col];
    if (x == null) return 1;
    if (y == null) return -1;
    return dir * (x - y);
  });
  return { periods, rows: out };
}

/* Hide columns where every visible row has the same value. */
function labelCols(rows) {
  const cols = [["geo", "Geography"], ["seg", "Segment"], ["ind", "Indicator"], ["unit", "Unit"]];
  return cols.filter(([k]) => k === "geo" || new Set(rows.map((r) => r[k])).size > 1 || k === "unit");
}

function citation(rows) {
  const names = uniq(rows.map((r) => r.ds)).map((d) => {
    const m = G.meta.datasets[d];
    return m ? m.publisher + ", " + m.title : d;
  });
  const when = new Date(G.meta.updated).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  return names.length ? "Source: " + names.join("; ") + ". Retrieved " + when + "." : "";
}

function delimited(sep) {
  const { periods, rows } = pivot();
  const f = V.sel.freq;
  const q = (x) => {
    const t = x == null ? "" : String(x);
    return sep === "," && /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
  };
  const head = ["Geography", "Segment", "Indicator", "Unit", ...periods.map((p) => periodLabel(p, f)), "Source"];
  const lines = [head.map(q).join(sep)];
  for (const r of rows) {
    const m = G.meta.datasets[r.ds];
    lines.push([r.geo, r.seg, r.ind, r.unit, ...periods.map((p) => r.vals[p]), m ? m.publisher + ", " + m.title : r.ds].map(q).join(sep));
  }
  return lines.join("\n");
}

function download(name, text) {
  const a = el("a", { href: URL.createObjectURL(new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" })), download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

async function copy(text, btn) {
  const old = btn.textContent;
  try { await navigator.clipboard.writeText(text); btn.textContent = "Copied"; }
  catch (e) { btn.textContent = "Couldn't copy"; }
  setTimeout(() => { btn.textContent = old; }, 1400);
}

/* ---------- URL state, so a built table can be shared or reopened ---------- */
function saveHash() {
  const s = V.sel, q = new URLSearchParams();
  q.set("freq", s.freq); q.set("span", s.span);
  for (const k of ["ds", "geo", "seg", "ind"]) if (s[k].length) q.set(k, s[k].join("|"));
  if (G.focus) q.set("focus", G.focus);
  history.replaceState(null, "", "#/" + V.page + "?" + q.toString());
}
function readHash() {
  const [path, query] = location.hash.replace(/^#\/?/, "").split("?");
  const page = path === "home" ? "dashboard" : path;  // old links
  return { page: page || "dashboard", q: new URLSearchParams(query || "") };
}

/* ---------- multi-select ---------- */
function multiSelect(key, label) {
  const box = el("div", { class: "f" });
  const sel = V.sel[key];
  const text = sel.length === 0 ? "All" : sel.length === 1 ? (key === "ds" ? dsName(sel[0]) : sel[0]) : sel.length + " selected";
  const btn = el("button", { class: "ms-btn", type: "button", title: text, "aria-haspopup": "true", "aria-expanded": "false" }, text);
  box.append(label, btn);
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = box.querySelector(".ms-pop");
    closePops();
    if (open) return;
    btn.setAttribute("aria-expanded", "true");
    const opts = optionsFor(key);
    const list = el("div", { class: "ms-list" });
    const search = el("input", { type: "search", placeholder: "Search", "aria-label": "Search " + label });
    const draw = () => {
      list.replaceChildren();
      const t = search.value.toLowerCase();
      for (const o of opts.filter((x) => x.toLowerCase().includes(t))) {
        const cb = el("input", { type: "checkbox", checked: V.sel[key].includes(o) });
        cb.addEventListener("change", () => {
          V.sel[key] = cb.checked ? [...V.sel[key], o] : V.sel[key].filter((x) => x !== o);
          V.dirty = true;
        });
        list.append(el("label", null, cb, el("span", null, key === "ds" ? dsName(o) : o)));
      }
      if (!list.children.length) list.append(el("p", { class: "muted" }, "No matches"));
    };
    search.addEventListener("input", draw);
    draw();
    const pop = el("div", { class: "ms-pop", onclick: (ev) => ev.stopPropagation() }, search, list,
      el("div", { class: "ms-foot" },
        el("button", { type: "button", onclick: () => { V.sel[key] = []; closePops(); renderBuilder(); } }, "Clear"),
        el("button", { type: "button", onclick: () => { closePops(); renderBuilder(); } }, "Done")));
    box.append(pop);
    search.focus();
  });
  return box;
}
function closePops() {
  document.querySelectorAll(".ms-pop").forEach((p) => p.remove());
  document.querySelectorAll(".ms-btn").forEach((b) => b.setAttribute("aria-expanded", "false"));
  if (V && V.dirty) { V.dirty = false; renderBuilder(); }
}
document.addEventListener("click", () => closePops());
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closePops(); });
const dsName = (d) => (G.meta.datasets[d] || {}).title || d;

/* ---------- line chart: one axis, so it only draws a single unit ---------- */
function chart(periods, rows, f) {
  const units = uniq(rows.map((r) => r.unit));
  if (periods.length < 2 || !rows.length) return null;
  if (units.length > 1) return el("p", { class: "cite" }, "Chart hidden: this table mixes units. Pick one indicator to chart it.");
  const series = rows.slice(0, MAX_SERIES).map((r, i) => ({
    name: [r.geo, r.seg, r.ind].filter((x, j) => new Set(rows.map((q) => [q.geo, q.seg, q.ind][j])).size > 1).join(" · ") || r.geo,
    color: "var(--s" + (i + 1) + ")",
    pts: periods.map((p) => r.vals[p]),
  }));
  const W = 860, H = 250, L = 62, R = 14, T = 12, B = 26;
  const vals = series.flatMap((s) => s.pts).filter((v) => v != null);
  if (!vals.length) return null;
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (lo > 0 && lo < hi * 0.4) lo = 0;
  if (lo === hi) { lo -= 1; hi += 1; }
  const pad = (hi - lo) * 0.06; hi += pad; if (lo !== 0) lo -= pad;
  const x = (i) => L + (i * (W - L - R)) / (periods.length - 1);
  const y = (v) => T + ((hi - v) * (H - T - B)) / (hi - lo);
  const NS = "http://www.w3.org/2000/svg";
  const s = (t, a, txt) => {
    const n = document.createElementNS(NS, t);
    for (const k in a) n.setAttribute(k, a[k]);
    if (txt != null) n.textContent = txt;
    return n;
  };
  const svg = s("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Line chart of the first " + series.length + " table rows" });
  for (let i = 0; i <= 4; i++) {
    const v = lo + ((hi - lo) * i) / 4;
    svg.append(s("line", { x1: L, x2: W - R, y1: y(v), y2: y(v), stroke: "var(--line2)" }));
    svg.append(s("text", { x: L - 8, y: y(v) + 4, "text-anchor": "end", "font-size": 11, fill: "var(--ink3)" }, fmt(v)));
  }
  const step = Math.ceil(periods.length / 7);
  periods.forEach((p, i) => {
    if (i % step === 0 || i === periods.length - 1 && (periods.length - 1) % step > step / 2) {
      svg.append(s("text", { x: x(i), y: H - 8, "text-anchor": "middle", "font-size": 11, fill: "var(--ink3)" }, periodLabel(p, f)));
    }
  });
  for (const se of series) {
    let d = "", pen = false;
    se.pts.forEach((v, i) => {
      if (v == null) { pen = false; return; }
      d += (pen ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1);
      pen = true;
    });
    svg.append(s("path", { d, fill: "none", stroke: se.color, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round", pathLength: 1, class: "draw" }));
  }
  const hair = s("line", { y1: T, y2: H - B, stroke: "var(--ink3)", visibility: "hidden" });
  svg.append(hair);
  const tip = el("div", { class: "tip", hidden: true });
  const wrap = el("div", { class: "chart" });
  const legend = el("div", { class: "legend" }, series.length > 1 ? series.map((q) => el("span", null, el("i", { style: "background:" + q.color }), q.name)) : []);
  if (rows.length > MAX_SERIES) legend.append(el("span", null, "Top " + MAX_SERIES + " of " + rows.length + " rows"));
  svg.addEventListener("pointermove", (e) => {
    const b = svg.getBoundingClientRect();
    const px = ((e.clientX - b.left) / b.width) * W;
    const i = Math.max(0, Math.min(periods.length - 1, Math.round(((px - L) / (W - L - R)) * (periods.length - 1))));
    hair.setAttribute("x1", x(i)); hair.setAttribute("x2", x(i)); hair.setAttribute("visibility", "visible");
    tip.replaceChildren(el("strong", null, periodLabel(periods[i], f)),
      ...series.map((q) => el("div", null, el("i", { style: "background:" + q.color }), el("b", null, q.pts[i] == null ? "n/a" : fmt(q.pts[i])), el("span", null, q.name))));
    tip.hidden = false;
    const left = (x(i) / W) * b.width;
    tip.style.left = (left > b.width / 2 ? left - tip.offsetWidth - 12 : left + 12) + "px";
    tip.style.top = "26px";
  });
  svg.addEventListener("pointerleave", () => { tip.hidden = true; hair.setAttribute("visibility", "hidden"); });
  wrap.append(legend, svg, tip);
  wrap._chart = { svg, series, W, H };
  return wrap;
}

/* ---------- chart to PNG: copy to clipboard or download ---------- */
/* Draws the chart with its title, legend and source line on a canvas, so a
   pasted chart carries its own context. CSS variables are resolved to the
   current theme's colours, since a standalone image can't read them. */
function chartTitle(rows) {
  const one = (k) => { const u = uniq(rows.map((r) => r[k])); return u.length === 1 ? u[0] : null; };
  const parts = [one("ind") || uniq(rows.map((r) => r.ind)).slice(0, 2).join(", "), one("seg"), one("geo")].filter(Boolean);
  return uniq(parts).join(" · ") + (rows[0] && rows[0].unit ? " (" + rows[0].unit + ")" : "");
}
async function chartPng(wrap, title, cite) {
  const { svg, series, W, H } = wrap._chart;
  const css = getComputedStyle(document.documentElement);
  const resolve = (v) => v && v.startsWith("var(") ? css.getPropertyValue(v.slice(4, -1)).trim() : v;
  const clone = svg.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", W); clone.setAttribute("height", H);
  clone.setAttribute("font-family", "Helvetica, Arial, sans-serif");
  clone.querySelectorAll("[visibility=hidden]").forEach((n) => n.remove());
  clone.querySelectorAll("*").forEach((n) => { for (const a of ["stroke", "fill"]) if (n.hasAttribute(a)) n.setAttribute(a, resolve(n.getAttribute(a))); });
  const img = new Image();
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(clone));
  await img.decode();

  const S = 2, PAD = 28, FW = W + PAD * 2;
  const font = (w, px) => w + " " + px + "px 'Nunito Sans', Helvetica, Arial, sans-serif";
  const ctx0 = document.createElement("canvas").getContext("2d");
  const wrapText = (text, f, max) => {
    ctx0.font = f; const out = []; let line = "";
    for (const w of text.split(" ")) { const t = line ? line + " " + w : w; if (ctx0.measureText(t).width > max && line) { out.push(line); line = w; } else line = t; }
    if (line) out.push(line); return out;
  };
  const titleLines = wrapText(title, font(700, 18), W);
  // Legend items flow left to right, wrapping as needed.
  ctx0.font = font(400, 12);
  const legendRows = [[]]; let x = 0;
  if (series.length > 1) for (const q of series) {
    const w = 22 + ctx0.measureText(q.name).width + 18;
    if (x + w > W && legendRows[legendRows.length - 1].length) { legendRows.push([]); x = 0; }
    legendRows[legendRows.length - 1].push({ q, x }); x += w;
  }
  const citeLines = wrapText(cite + " Chart: India Dashboard.", font(400, 11), W);
  const legendH = series.length > 1 ? legendRows.length * 20 + 6 : 0;
  const FH = PAD + titleLines.length * 24 + 8 + legendH + H + 10 + citeLines.length * 15 + PAD;
  const c = document.createElement("canvas");
  c.width = FW * S; c.height = FH * S;
  const ctx = c.getContext("2d");
  ctx.scale(S, S);
  ctx.fillStyle = resolve("var(--surface)") || "#fff"; ctx.fillRect(0, 0, FW, FH);
  let y = PAD;
  ctx.fillStyle = resolve("var(--ink)"); ctx.font = font(700, 18); ctx.textBaseline = "top";
  for (const l of titleLines) { ctx.fillText(l, PAD, y); y += 24; }
  y += 8;
  ctx.font = font(400, 12);
  for (const row of series.length > 1 ? legendRows : []) {
    for (const { q, x: lx } of row) {
      ctx.fillStyle = resolve(q.color); ctx.fillRect(PAD + lx, y + 6, 14, 3);
      ctx.fillStyle = resolve("var(--ink2)"); ctx.fillText(q.name, PAD + lx + 22, y);
    }
    y += 20;
  }
  if (legendH) y += 6;
  ctx.drawImage(img, PAD, y, W, H); y += H + 10;
  ctx.fillStyle = resolve("var(--ink3)"); ctx.font = font(400, 11);
  for (const l of citeLines) { ctx.fillText(l, PAD, y); y += 15; }
  return new Promise((res) => c.toBlob(res, "image/png"));
}
function chartButtons(wrap, rows) {
  return chartButtonsFor(wrap, chartTitle(rows), citation(rows));
}

/* ---------- table builder ---------- */
function renderBuilder() {
  const host = V.builder;
  host.replaceChildren();
  saveHash();
  const s = V.sel;
  const freqs = uniq(V.rows.map((r) => r.f));
  const order = ["Annual", "Quarterly", "Monthly"].filter((f) => freqs.includes(f));

  const presets = el("div", { class: "chips" }, PAGES[V.page].presets.map(([name, p]) =>
    el("button", { type: "button", class: V.preset === name ? "on" : "", onclick: () => { V.preset = name; applyPreset(p); renderBuilder(); } }, name)));

  const freqSel = el("select", { "aria-label": "Frequency", onchange: (e) => { s.freq = e.target.value; s.ds = []; s.seg = []; s.ind = []; V.preset = null; V.sort = null; renderBuilder(); } },
    order.map((f) => el("option", { value: f, selected: f === s.freq }, f)));
  const spanSel = el("select", { "aria-label": "Periods shown", onchange: (e) => { s.span = +e.target.value; V.sort = null; renderBuilder(); } },
    [[1, "Latest only"], [5, "Latest 5"], [12, "Latest 12"], [0, "All"]].map(([v, t]) => el("option", { value: v, selected: v === s.span }, t)));
  const filters = el("div", { class: "filters" },
    el("div", { class: "f" }, "Frequency", freqSel),
    multiSelect("geo", "Geography"), multiSelect("seg", "Segment"), multiSelect("ind", "Indicator"), multiSelect("ds", "Dataset"),
    el("div", { class: "f" }, "Periods", spanSel),
    el("button", { type: "button", onclick: () => { s.geo = []; s.seg = []; s.ind = []; s.ds = []; V.preset = null; V.sort = null; renderBuilder(); } }, "Reset"));

  const { periods, rows } = pivot();
  host.append(el("div", { class: "card-h" }, el("h2", null, "Build a table")), presets, filters);
  if (!rows.length) {
    host.append(el("p", { class: "empty" }, "No data for this combination. " + (G.focus ? G.focus + " may not be covered by this dataset. " : "") + "Try removing a filter."));
    return;
  }
  const c = chart(periods, rows, s.freq);
  if (c) host.append(c);

  const cols = labelCols(rows);
  const head = el("tr", null, cols.map(([k, t]) => el("th", {
    onclick: k === "unit" ? null : () => sortBy(k),
  }, t + arrow(k))), periods.map((p) => el("th", { class: "n", onclick: () => sortBy(p) }, periodLabel(p, s.freq) + arrow(p))));
  const body = el("tbody", null, rows.slice(0, MAX_ROWS).map((r) => el("tr", null,
    cols.map(([k]) => el("td", { class: k === "seg" || k === "ind" ? "seg" : "" }, r[k])),
    periods.map((p) => el("td", { class: "n" }, r.vals[p] == null ? "–" : fmt(r.vals[p]))))));
  host.append(el("div", { class: "tablebox" }, el("table", null, el("thead", null, head), body)));

  const cite = citation(rows);
  const csv = el("button", { type: "button", onclick: () => download("india-dashboard-" + V.page + ".csv", delimited(",")) }, "Download CSV");
  const xl = el("button", { type: "button", onclick: (e) => copy(delimited("\t"), e.target) }, "Copy for Excel");
  const link = el("button", { type: "button", onclick: (e) => copy(location.href, e.target) }, "Copy link");
  const src = el("button", { type: "button", onclick: (e) => copy(cite, e.target) }, "Copy source line");
  host.append(el("div", { class: "tfoot" },
    el("span", { class: "muted" }, rows.length > MAX_ROWS ? "Showing " + MAX_ROWS + " of " + rows.length + " rows. Exports include all." : rows.length + (rows.length === 1 ? " row" : " rows")),
    el("div", { class: "actions" }, c && c._chart ? chartButtons(c, rows) : null, csv, xl, src, link)));
  host.append(el("p", { class: "cite" }, cite));
  const notes = uniq(rows.map((r) => r.ds)).map((d) => (G.meta.datasets[d] || {}).note).filter(Boolean);
  if (notes.length) host.append(el("p", { class: "cite" }, "Notes: " + notes.join(" ")));
}
function arrow(k) { return V.sort && V.sort.col === k ? (V.sort.dir < 0 ? " ↓" : " ↑") : ""; }
function sortBy(col) {
  const text = ["geo", "seg", "ind"].includes(col);
  V.sort = V.sort && V.sort.col === col ? { col, dir: -V.sort.dir } : { col, dir: text ? 1 : -1 };
  renderBuilder();
}

/* ---------- developments ---------- */
const isOutlet = (r) => r.type === "News outlet";
function newsItems() {
  const n = V.news, sector = PAGES[V.page].news;
  const t = n.q.toLowerCase();
  const cutoff = n.days ? new Date(Date.now() - n.days * 864e5).toISOString().slice(0, 10) : "";
  return G.news.items.filter((r) => {
    if (sector && ![].concat(sector).some((x) => r.sectors.includes(x))) return false;
    if (n.scope !== "All" && r.scope !== n.scope) return false;
    if (n.scope === "State" && G.focus && !r.states.includes(G.focus)) return false;
    if (n.src === "Official" && isOutlet(r)) return false;
    if (n.src === "News" && !isOutlet(r)) return false;
    if (cutoff && r.date < cutoff) return false;
    return !t || (r.title + " " + r.publisher + " " + r.snippet).toLowerCase().includes(t);
  });
}
function renderNews() {
  const host = V.newsHost, n = V.news;
  host.replaceChildren();
  const items = newsItems();
  const scopes = el("div", { class: "seg-btns" }, ["All", "International", "National", "State"].map((sc) =>
    el("button", { type: "button", class: n.scope === sc ? "on" : "", onclick: () => { n.scope = sc; renderNews(); } }, sc)));
  const srcSel = el("select", { "aria-label": "Sources", onchange: (e) => { n.src = e.target.value; renderNews(); } },
    [["All", "Official and news"], ["Official", "Official only"], ["News", "News outlets only"]].map(([v, t]) => el("option", { value: v, selected: v === n.src }, t)));
  const search = el("input", { type: "search", placeholder: "Search developments", value: n.q, "aria-label": "Search developments", oninput: (e) => { n.q = e.target.value; drawList(); } });
  const days = el("select", { "aria-label": "Time window", onchange: (e) => { n.days = +e.target.value; renderNews(); } },
    [[7, "Last 7 days"], [30, "Last 30 days"], [90, "Last 90 days"], [0, "All dates"]].map(([v, t]) => el("option", { value: v, selected: v === n.days }, t)));
  const list = el("ul", { class: "news" });
  const count = el("span", { class: "muted" });
  const copyBtn = el("button", { type: "button", onclick: (e) => copy(newsItems().map((r) => [r.date, r.title, r.publisher, r.url].join("\t")).join("\n"), e.target) }, "Copy list");
  function drawList() {
    const rows = newsItems();
    count.textContent = rows.length + (rows.length === 1 ? " item" : " items");
    list.replaceChildren();
    if (!rows.length) list.append(el("li", { class: "muted" }, "Nothing here for these filters. History builds up daily, so try a wider time window."));
    for (const r of rows.slice(0, 200)) {
      const place = r.states.length ? " · " + r.states.slice(0, 3).join(", ") : "";
      list.append(el("li", null, el("a", { href: r.url, target: "_blank", rel: "noopener" }, tidy(r.title)),
        el("small", null, dateLabel(r.date) + " · " + r.publisher + place)));
    }
  }
  host.append(el("div", { class: "card-h" }, el("h2", null, "Developments"), count),
    el("div", { class: "news-tools" }, scopes, search, el("div", { class: "actions" }, srcSel, days, copyBtn)), list);
  drawList();
}

/* Some releases arrive in capitals; show them in sentence case. */
function tidy(t) {
  const letters = t.replace(/[^A-Za-z]/g, "");
  if (letters.length < 12 || letters !== letters.toUpperCase()) return t;
  const keep = /^(GDP|CPI|WPI|IIP|RBI|SEBI|GST|MSME|PLI|FDI|US|UK|EU|UAE|PIB|ISRO|AI|IT|NITI|DPIIT|DGFT|PM|MOU|FY\d*)$/;
  const proper = /^(india|indian|january|february|march|april|may|june|july|august|september|october|november|december|union|minister|ministry)$/;
  const low = t.toLowerCase().replace(/\b[a-z][a-z0-9-]*\b/g, (w) =>
    keep.test(w.toUpperCase()) ? w.toUpperCase() : proper.test(w) ? w.charAt(0).toUpperCase() + w.slice(1) : w);
  return low.charAt(0).toUpperCase() + low.slice(1);
}

/* ---------- headline tiles ---------- */
const TILE_DEFS = [
  ["GDP growth, quarterly", (r) => /GDP Growth Rate \(constant/.test(r.ind) && r.f === "Quarterly", "%", "Quarterly GDP growth"],
  ["GDP growth, annual", (r) => /GDP Growth Rate \(constant/.test(r.ind) && r.f === "Annual", "%", "GDP growth"],
  ["CPI inflation", (r) => r.ind.startsWith("CPI inflation") && r.seg === "CPI (General)", "%", "CPI inflation"],
  ["IIP growth", (r) => r.ind.startsWith("IIP growth") && r.seg === "General", "%", "IIP growth"],
  ["Unemployment rate", (r) => r.ind === "Unemployment rate", "%", null],
  ["Goods trade balance", (r) => /balance/i.test(r.ind) && r.ds === "rbi_trade", "usd_m", "Trade"],
];

/* Tiny trend line for a tile: last 12 values, no axes. */
function spark(vals) {
  if (vals.length < 3) return null;
  const NS = "http://www.w3.org/2000/svg", W = 120, H = 28;
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (lo === hi) { lo -= 1; hi += 1; }
  const pts = vals.map((v, i) => (i * W / (vals.length - 1)).toFixed(1) + "," + (2 + (hi - v) * (H - 4) / (hi - lo)).toFixed(1));
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 " + W + " " + H);
  svg.setAttribute("class", "spark");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");
  const line = document.createElementNS(NS, "polyline");
  line.setAttribute("points", pts.join(" "));
  svg.append(line);
  const [lx, ly] = pts[pts.length - 1].split(",");
  const dot = document.createElementNS(NS, "circle");
  dot.setAttribute("cx", lx); dot.setAttribute("cy", ly); dot.setAttribute("r", 2.5);
  svg.append(dot);
  return svg;
}

function tiles(rows, linked, defs, page) {
  const out = [];
  for (const [label, test, suffix, preset] of defs || TILE_DEFS) {
    // Survey rows are labelled Urban / Rural rather than All India.
    const series = rows.filter((r) => (r.geo === "All India" || r.ds.startsWith("ccs_")) && test(r)).sort((a, b) => a.p < b.p ? -1 : 1);
    const r = series[series.length - 1];
    if (!r) continue;
    const big = suffix === "usd_m" ? (r.v < 0 ? "−" : "") + "$" + fmt(Math.round(Math.abs(r.v) / 100) / 10) + " bn" : fmt(r.v) + suffix;
    const sp = page ? spark(series.slice(-12).map((x) => x.v)) : null;
    const kids = [el("b", null, big), el("span", null, label),
      linked ? spark(series.slice(-12).map((x) => x.v)) : sp,
      el("small", null, periodLabel(r.p, r.f) + " · " + (G.meta.datasets[r.ds] || {}).publisher)];
    if (page) {
      // On a sector page a tile opens the matching table in the builder below.
      const p = PAGES[page].presets.find(([n]) => n === preset);
      out.push(p ? el("a", { class: "tile", href: "#/" + page, title: "Show in the table builder", onclick: (e) => {
        e.preventDefault(); V.preset = p[0]; applyPreset(p[1]); renderBuilder(); V.builder.scrollIntoView({ behavior: "smooth", block: "start" });
      } }, kids) : el("div", { class: "tile" }, kids));
    } else out.push(linked
      ? el("a", { class: "tile", href: "#/macro", title: "Open India macro", onclick: () => { if (preset) G.pendingPreset = preset; } }, kids)
      : el("div", { class: "tile" }, kids));
  }
  return out.length ? el("section", { class: "tiles", "aria-label": "Headline indicators" }, out) : null;
}

/* ---------- home: a snapshot of everything, with links into each page ---------- */
const MACRO_NEWS = ["macro", "finance"];

async function showHome() {
  const macro = await loadPage("macro");
  V = { page: "dashboard" };
  const picks = (G.picks && G.picks.items) || [];
  const today = localISO(new Date());
  const days = uniq(picks.map((r) => r.date)).sort();
  const day = days.includes(today) ? today : days[days.length - 1];
  const dayRows = picks.filter((r) => r.date === day);

  const more = (href, text) => el("a", { class: "more", href }, text + " →");

  // Daily picks
  const daily = el("section", { class: "card", "aria-label": "Daily updates" });
  const jump = el("input", { type: "search", placeholder: "Search all " + picks.length.toLocaleString("en-IN") + " picked articles", "aria-label": "Search picked articles" });
  jump.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && jump.value.trim()) location.hash = "#/daily?q=" + encodeURIComponent(jump.value.trim());
  });
  daily.append(el("div", { class: "card-h" },
    el("h2", null, "Daily updates"),
    day ? el("span", { class: "muted" }, (day === today ? "Today, " : "") + dateLabel(day) + " · " + dayRows.length + (dayRows.length === 1 ? " article" : " articles")) : null));
  if (!dayRows.length) {
    daily.append(el("p", { class: "empty" }, "No articles picked yet."));
  } else {
    if (day !== today) daily.append(el("p", { class: "note" }, "Nothing picked for today yet, so this is the latest day."));
    daily.append(el("ul", { class: "news picks" }, dayRows.slice(0, 8).map(pickLine)));
  }
  daily.append(el("div", { class: "card-f" }, jump,
    more("#/daily" + (day ? "?d=" + day : ""), dayRows.length > 8 ? "All " + dayRows.length + " for this day" : "Calendar and archive")));

  // Macro and finance developments
  const nat = G.news.items.filter((r) => r.sectors.some((x) => MACRO_NEWS.includes(x)) && r.scope !== "State" && !isOutlet(r)).slice(0, 8);
  const devs = el("aside", { class: "card", "aria-label": "Macro developments" },
    el("div", { class: "card-h" }, el("h2", null, "Macro developments"), el("span", { class: "muted" }, "Government and regulators")),
    nat.length
      ? el("ul", { class: "news flat" }, nat.map((r) => el("li", null,
          el("a", { href: r.url, target: "_blank", rel: "noopener" }, tidy(r.title)),
          el("small", null, dateLabel(r.date) + " · " + r.publisher))))
      : el("p", { class: "empty" }, "No recent macro developments."),
    el("div", { class: "card-f" }, more("#/macro", "All macro data and news"), more("#/finance", "Finance")));

  const updated = new Date(G.meta.updated).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  document.getElementById("app").replaceChildren(
    el("div", { class: "home-h" },
      el("h1", null, "Home"),
      el("p", { class: "muted" }, longDate(today) + ". Official data refreshed " + updated + ".")),
    // Three columns: macro figures down the left, daily updates in the middle,
    // chart of the day and macro developments on the right.
    el("div", { class: "dash" },
      el("div", { class: "dash-left" }, tiles(macro, true)),
      el("div", { class: "dash-main" }, daily),
      el("div", { class: "dash-right" }, await storyCard(), devs)));
}

/* ---------- pages ---------- */
function allStates() {
  const fromNews = G.news.items.flatMap((r) => r.states);
  return uniq([...V.rows.map((r) => r.geo), ...fromNews]).filter((g) => g !== "All India").sort();
}

async function showData(page, q) {
  const app = document.getElementById("app");
  const P = PAGES[page];
  const rows = await loadPage(page);
  if (q.get("focus") !== null) G.focus = q.get("focus");
  const freqs = uniq(rows.map((r) => r.f));
  V = { page, rows, preset: null, sort: null, dirty: false, sel: { freq: freqs[0], span: 12, ds: [], geo: [], seg: [], ind: [] }, news: { scope: "All", src: "All", q: "", days: 30 } };
  if (q.get("freq")) {
    const s = V.sel;
    s.freq = q.get("freq"); s.span = +(q.get("span") ?? 12);
    for (const k of ["ds", "geo", "seg", "ind"]) s[k] = q.get(k) ? q.get(k).split("|") : [];
  } else {
    const want = (G.pendingPreset && P.presets.find(([n]) => n === G.pendingPreset)) || P.presets[0];
    G.pendingPreset = null;
    V.preset = want[0];
    applyPreset(want[1]);
  }
  const focusSel = el("select", { id: "focus", onchange: (e) => {
    G.focus = e.target.value;
    V.news.scope = G.focus ? "State" : "All";
    const p = P.presets.find(([n]) => n === V.preset);
    if (p) applyPreset(p[1]);
    else V.sel.geo = G.focus ? [G.focus] : [];
    renderBuilder(); renderNews();
  } }, el("option", { value: "" }, "All India and all states"), allStates().map((g) => el("option", { value: g, selected: g === G.focus }, g)));
  if (G.focus) V.news.scope = "State";
  V.builder = el("section", { class: "card", "aria-label": "Table builder" });
  V.newsHost = el("aside", { class: "card", "aria-label": "Developments" });
  app.replaceChildren(...[
    el("h1", null, P.label), el("p", { class: "lede" }, P.lede),
    P.caveat ? el("p", { class: "caveat" }, P.caveat) : null,
    page === "states" ? stateEntryPanels() : null,
    page === "macro" ? tiles(rows, false) : P.tiles ? tiles(rows, false, P.tiles, page) : null,
    P.nonSector ? null : el("div", { class: "focus" }, el("label", { htmlFor: "focus" }, "Focus state"), focusSel,
      null),
    el("div", { class: "grid" }, V.builder, V.newsHost),
  ].filter(Boolean));
  renderBuilder(); renderNews();
}

function showSources() {
  V = null;
  const m = G.meta;
  const stat = (s, k) => k === "ipi_sdg" ? el("span", { class: "muted" }, "Static dataset") : !s ? el("span", { class: "muted" }, "Not run") : s.ok ? el("span", { class: "ok" }, "Updated") : el("span", { class: "fail", title: s.error || "" }, "Failed, showing last good data");
  const groups = { nas: "National accounts", gsdp: "State accounts", gsva: "State accounts", cpi: "CPI", iip: "IIP", wpi: "WPI", isp: "ISP", plfs: "PLFS", asi: "ASI", rbi_trade: "RBI", rbi_fx: "RBI", rbi_commodity: "RBI", ccs_urban: "RBI urban consumer confidence", ccs_rural: "RBI rural consumer confidence" };
  const data = el("table", { class: "src-table" }, el("thead", null, el("tr", null, ["Dataset", "Publisher", "Frequency", "Status", "Notes"].map((t) => el("th", null, t)))),
    el("tbody", null, Object.entries(m.datasets).map(([k, d]) => el("tr", null, el("td", null, el("a", { href: d.url, target: "_blank", rel: "noopener" }, d.title)), el("td", null, d.publisher), el("td", null, d.frequency), el("td", null, stat(m.status[groups[k]], k)), el("td", null, d.note)))));
  const feeds = el("table", { class: "src-table" }, el("thead", null, el("tr", null, ["Feed", "Type", "Status", "Items read"].map((t) => el("th", null, t)))),
    el("tbody", null, Object.entries(G.news.status).map(([k, s]) => el("tr", null, el("td", null, k), el("td", null, s.type || (k.startsWith("PIB") ? "Government" : "")), el("td", null, s.ok ? el("span", { class: "ok" }, "Read") : el("span", { class: "fail", title: s.error || "" }, "Failed")), el("td", { class: "n" }, s.items ?? "–")))));
  document.getElementById("app").replaceChildren(
    el("h1", null, "Sources"),
    el("p", { class: "lede" }, "Every number comes from a government body. Developments come from government bodies, regulators, trade associations and international bodies, plus headlines from news outlets, which link to the outlet's own page. Last data refresh: " + new Date(m.updated).toLocaleString("en-GB") + "."),
    el("section", { class: "card" }, el("div", { class: "card-h" }, el("h2", null, "Datasets")), el("div", { class: "tablebox" }, data)),
    el("p", null, " "),
    el("section", { class: "card" }, el("div", { class: "card-h" }, el("h2", null, "News feeds")), el("div", { class: "tablebox" }, feeds)));
}

/* ---------- daily updates: hand-picked articles, one list per day ---------- */
/* Only the pages that show picks download them. */
async function loadPicks() {
  if (!G.picks) G.picks = await getJSON("picks").catch(() => ({ items: [] }));
}
const localISO = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const longDate = (s) => new Date(s + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const safeUrl = (u) => /^https?:\/\//i.test(u || "") ? u : null;
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function pickLine(r) {
  const url = safeUrl(r.url);
  const extra = (r.more || []).filter((m) => safeUrl(m.url));
  const meta = el("small", null, [r.source, r.note].filter(Boolean).join(" · "));
  if (extra.length) {
    meta.append(r.source ? " · Also: " : "Also: ");
    extra.forEach((m, i) => {
      if (i) meta.append(", ");
      meta.append(el("a", { class: "also", href: m.url, target: "_blank", rel: "noopener" }, m.source || "link"));
    });
  }
  return el("li", null,
    url ? el("a", { href: url, target: "_blank", rel: "noopener" }, r.title) : el("span", { class: "t" }, r.title),
    meta.textContent ? meta : null);
}

/* Keep the document's own order and section headings within a day. */
function groupBySection(rows) {
  const out = new Map();
  for (const r of rows) {
    const k = r.section || "";
    if (!out.has(k)) out.set(k, []);
    out.get(k).push(r);
  }
  return out;
}

function showDaily(q) {
  const items = (G.picks && G.picks.items) || [];
  const byDate = new Map();
  for (const r of items) {
    if (!byDate.has(r.date)) byDate.set(r.date, []);
    byDate.get(r.date).push(r);
  }
  const dates = [...byDate.keys()].sort();
  const today = localISO(new Date());
  const fallback = byDate.has(today) || !dates.length ? today : dates[dates.length - 1];
  const D = { date: q.get("d") || fallback, q: q.get("q") || "", auto: !q.get("d") };
  D.month = D.date.slice(0, 7);
  V = { page: "daily" };

  const main = el("section", { class: "card", "aria-label": "Articles" });
  const side = el("aside", { class: "card side", "aria-label": "Search and calendar" });
  const search = el("input", { type: "search", placeholder: "Search all article titles", value: D.q, "aria-label": "Search all article titles" });
  const cal = el("div", { class: "cal" });
  let timer = null;
  search.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => { D.q = search.value.trim(); save(); drawMain(); }, 150);
  });

  function save() {
    const p = new URLSearchParams();
    if (!D.auto) p.set("d", D.date);
    if (D.q) p.set("q", D.q);
    history.replaceState(null, "", "#/daily" + (p.toString() ? "?" + p : ""));
  }
  function go(date) {
    D.date = date; D.month = date.slice(0, 7); D.auto = false; D.q = ""; search.value = "";
    save(); drawMain(); drawCal();
  }
  const adjacent = (dir) => dir < 0 ? dates.filter((d) => d < D.date).pop() : dates.find((d) => d > D.date);

  function copyRows(rows) {
    return rows.map((r) => [r.date, r.title, r.source || "", r.url || ""].join("\t")).join("\n");
  }

  function drawMain() {
    main.replaceChildren();
    if (!items.length) {
      main.append(el("p", { class: "empty" }, "No articles loaded yet. Once your daily updates document is imported, each day's picks appear here."));
      return;
    }
    if (D.q) {
      const t = D.q.toLowerCase();
      const hits = items.filter((r) => (r.title + " " + (r.source || "") + " " + (r.note || "")).toLowerCase().includes(t))
        .sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
      main.append(el("div", { class: "card-h" },
        el("h2", null, hits.length + (hits.length === 1 ? " article matches " : " articles match ") + "“" + D.q + "”"),
        el("div", { class: "actions" },
          el("button", { type: "button", onclick: (e) => copy(copyRows(hits), e.target) }, "Copy results"),
          el("button", { type: "button", onclick: () => { D.q = ""; search.value = ""; save(); drawMain(); } }, "Clear search"))));
      if (!hits.length) main.append(el("p", { class: "empty" }, "No titles match. Try a shorter word."));
      const groups = new Map();
      for (const r of hits.slice(0, 400)) {
        if (!groups.has(r.date)) groups.set(r.date, []);
        groups.get(r.date).push(r);
      }
      for (const [d, rows] of groups) {
        main.append(el("h3", { class: "day-h" }, el("button", { type: "button", class: "link", onclick: () => go(d) }, longDate(d))),
          el("ul", { class: "news picks" }, rows.map(pickLine)));
      }
      if (hits.length > 400) main.append(el("p", { class: "cite" }, "Showing the latest 400 matches. Narrow the search to see older ones."));
      return;
    }
    const rows = byDate.get(D.date) || [];
    const prev = adjacent(-1), next = adjacent(1);
    main.append(el("div", { class: "card-h" },
      el("h2", null, longDate(D.date)),
      el("div", { class: "actions" },
        el("button", { type: "button", disabled: !prev, title: prev ? dateLabel(prev) : "", onclick: () => go(prev) }, "← Earlier"),
        el("button", { type: "button", disabled: !next, title: next ? dateLabel(next) : "", onclick: () => go(next) }, "Later →"),
        D.date !== today ? el("button", { type: "button", onclick: () => go(today) }, "Today") : null,
        rows.length ? el("button", { type: "button", onclick: (e) => copy(copyRows(rows), e.target) }, "Copy list") : null)));
    if (D.auto && D.date !== today) {
      main.append(el("p", { class: "note" }, "Nothing picked for today yet, so this shows the latest day with articles."));
    }
    if (!rows.length) {
      main.append(el("p", { class: "empty" }, "No articles were picked on this day." + (prev ? " Use Earlier, or pick a marked day in the calendar." : "")));
      return;
    }
    main.append(el("p", { class: "muted count" }, rows.length + (rows.length === 1 ? " article" : " articles")));
    for (const [sec, list] of groupBySection(rows)) {
      if (sec) main.append(el("h3", { class: "sec-h" }, sec));
      main.append(el("ul", { class: "news picks" }, list.map(pickLine)));
    }
  }

  function drawCal() {
    const [y, m] = D.month.split("-").map(Number);
    const startDow = (new Date(y, m - 1, 1).getDay() + 6) % 7;
    const days = new Date(y, m, 0).getDate();
    const shift = (n) => {
      const d = new Date(y, m - 1 + n, 1);
      D.month = localISO(d).slice(0, 7);
      drawCal();
    };
    const first = dates[0], last = dates[dates.length - 1];
    // Weekdays only: picks are made Monday to Friday.
    const grid = el("div", { class: "cal-grid", role: "grid" },
      ["Mo", "Tu", "We", "Th", "Fr"].map((d) => el("span", { class: "dow", "aria-hidden": "true" }, d)));
    for (let i = 0; i < (startDow < 5 ? startDow : 0); i++) grid.append(el("span"));
    for (let d = 1; d <= days; d++) {
      if ((startDow + d - 1) % 7 >= 5) continue;  // Saturday or Sunday
      const iso = D.month + "-" + String(d).padStart(2, "0");
      const n = (byDate.get(iso) || []).length;
      const cls = ["day", n ? "has" : "", iso === D.date && !D.q ? "sel" : "", iso === today ? "today" : ""].filter(Boolean).join(" ");
      grid.append(el("button", { type: "button", class: cls, "aria-label": longDate(iso) + (n ? ", " + n + (n === 1 ? " article" : " articles") : ", no articles"), onclick: () => go(iso) }, String(d)));
    }
    const monthSel = el("select", { "aria-label": "Jump to month", onchange: (e) => { D.month = e.target.value; drawCal(); } },
      uniq(dates.map((d) => d.slice(0, 7)).concat([today.slice(0, 7), D.month])).sort().reverse().map((mo) =>
        el("option", { value: mo, selected: mo === D.month }, MONTHS_LONG[+mo.slice(5) - 1] + " " + mo.slice(0, 4))));
    cal.replaceChildren(
      el("div", { class: "cal-h" },
        el("button", { type: "button", "aria-label": "Previous month", onclick: () => shift(-1) }, "‹"),
        monthSel,
        el("button", { type: "button", "aria-label": "Next month", onclick: () => shift(1) }, "›")),
      grid,
      el("p", { class: "cite" }, items.length
        ? items.length.toLocaleString("en-IN") + " articles over " + dates.length + " days, " + dateLabel(first) + " to " + dateLabel(last) + ". Marked days have articles."
        : "Marked days will show where articles exist."));
  }

  side.append(el("div", { class: "card-h" }, el("h2", null, "Find articles")), search, cal);
  document.getElementById("app").replaceChildren(
    el("h1", null, "Daily updates"),
    el("p", { class: "lede" }, "News and policy updates picked each day. Pick a date for past days, or search every title."),
    el("div", { class: "grid daily" }, main, side));
  save(); drawMain(); drawCal();
}

/* ---------- dashboard easter egg, only with ?mitron in the address ---------- */
const PEEK_SVG = '<svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 170"><path d="M18 170 C20 138 40 124 70 122 C100 124 122 138 124 170 Z" fill="#33415f"/><path d="M56 123 L70 150 L84 123 C80 121 60 121 56 123 Z" fill="#f3ede1"/><path d="M62 123 L70 138 L78 123" fill="none" stroke="#d9cfbc" stroke-width="1.5"/><path d="M58 108 L58 124 C64 128 76 128 82 124 L82 108 Z" fill="#d9a77c"/><ellipse cx="104" cy="70" rx="7" ry="11" fill="#d9a77c"/><ellipse cx="70" cy="66" rx="34" ry="40" fill="#e3b58b"/><path d="M37 58 C36 34 52 22 72 22 C92 22 106 34 105 60 C100 46 92 38 78 36 C64 34 48 40 37 58 Z" fill="#f4f4f1"/><path d="M44 44 C56 34 76 32 92 38" fill="none" stroke="#dcdcd6" stroke-width="1.5"/><path d="M37 68 C38 92 50 112 70 114 C90 112 102 92 103 68 C99 80 94 86 88 88 C82 82 58 82 52 88 C46 86 41 80 37 68 Z" fill="#f4f4f1"/><path d="M52 88 C58 82 82 82 88 88" fill="none" stroke="#dcdcd6" stroke-width="1.2"/><path d="M54 84 C60 78 66 79 70 82 C74 79 80 78 86 84 C80 85 74 85 70 84 C66 85 60 85 54 84 Z" fill="#ffffff" stroke="#dcdcd6" stroke-width="1"/><path d="M63 91 C67 94 73 94 77 91" fill="none" stroke="#b9826a" stroke-width="1.6" stroke-linecap="round"/><path d="M70 62 C68 70 66 74 69 76 C71 77 73 76 74 75" fill="none" stroke="#c48e66" stroke-width="1.6" stroke-linecap="round"/><path d="M48 52 C53 49 59 49 63 51" fill="none" stroke="#e8e8e3" stroke-width="3" stroke-linecap="round"/><path d="M77 51 C81 49 87 49 92 52" fill="none" stroke="#e8e8e3" stroke-width="3" stroke-linecap="round"/><ellipse cx="56" cy="61" rx="2.6" ry="2.2" fill="#2b2420"/><ellipse cx="84" cy="61" rx="2.6" ry="2.2" fill="#2b2420"/><rect x="45" y="54" width="22" height="15" rx="6" fill="none" stroke="#a08a5c" stroke-width="1.4"/><rect x="73" y="54" width="22" height="15" rx="6" fill="none" stroke="#a08a5c" stroke-width="1.4"/><path d="M67 60 C69 58 71 58 73 60" fill="none" stroke="#a08a5c" stroke-width="1.4"/></svg>';
const PEEK = { el: null };
/* Only for visitors who open the site with ?mitron (before or after the #). */
const peekWanted = () => new URLSearchParams(location.search).has("mitron") || readHash().q.has("mitron");
function peekShow() {
  if (PEEK.el || !V || V.page !== "dashboard") return;
  const b = el("button", { type: "button", class: "peek", "aria-label": "A visitor is peeking in. Click to shoo him away.", title: "Click to shoo" });
  b.innerHTML = PEEK_SVG + '<span class="peek-say">Mitron…</span>';  // fixed markup, no data
  b.addEventListener("click", () => {
    b.classList.add("shoo");
    setTimeout(() => b.remove(), 600);
    PEEK.el = null;
  });
  document.body.append(b);
  PEEK.el = b;
  requestAnimationFrame(() => requestAnimationFrame(() => b.classList.add("in")));
}
function peekStart() {
  if (peekWanted()) setTimeout(peekShow, 400);
}
function peekStop() {
  if (PEEK.el) { PEEK.el.remove(); PEEK.el = null; }
}

/* ---------- editor: paste the day's picks and publish them to the repository ---------- */
/* No server: the editor signs in with a GitHub fine-grained token limited to this
   repository's contents. It is kept only in this browser, and is sent only to
   api.github.com. Publishing writes a small file to picks/inbox/, which the next
   workflow run merges into the archive and deploys. */
const REPO = "shivamkmani/in-master-tracker";
const TOKEN_KEY = "imt-editor-token";
const store = {
  get() { try { return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; } },
  set(t, remember) { try { (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, t); } catch (e) { /* storage blocked: token lives for this page only */ } },
  clear() { try { localStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(TOKEN_KEY); } catch (e) { /* ignore */ } },
};
let editorToken = "";
async function gh(path, opts = {}) {
  const r = await fetch("https://api.github.com/repos/" + REPO + path, Object.assign({}, opts, {
    headers: Object.assign({ Authorization: "Bearer " + editorToken, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" }, opts.headers || {}),
  }));
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((body && body.message) || ("HTTP " + r.status));
  return body;
}

const PICK_DATE = /^(?:(?:mon|tues?|wed(?:nes)?|thu(?:rs?)?|fri|sat(?:ur)?|sun)(?:day)?,?\s+)?(?:(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,9})|([a-z]{3,9})\s+(\d{1,2})(?:st|nd|rd|th)?)(?:,?\s+(\d{4}))?$/i;
function lineDate(text, fallbackYear) {
  const m = text.trim().replace(/[:.]$/, "").match(PICK_DATE);
  if (!m) return null;
  const mon = MON.findIndex((x) => x.toLowerCase() === (m[2] || m[3]).slice(0, 3).toLowerCase());
  if (mon < 0) return null;
  const day = +(m[1] || m[4]), year = +(m[5] || fallbackYear);
  const d = new Date(year, mon, day);
  return d.getDate() === day ? localISO(d) : null;
}

/* Turn pasted Word/Docs/email content (HTML) or plain text into items. The
   clipboard HTML is parsed in a detached document and never inserted into the page. */
function parsePaste(html, text, defaultDate) {
  const units = [];
  if (html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    let blocks = [...doc.querySelectorAll("li")];
    if (!blocks.length) blocks = [...doc.querySelectorAll("p, div, h1, h2, h3, h4, tr")].filter((b) => !b.querySelector("p, div, tr"));
    if (!blocks.length) blocks = [doc.body];
    for (const b of blocks) {
      // A block with line breaks may hold several items (e.g. pasted from email).
      const parts = b.innerHTML.split(/<br\s*\/?>/i);
      for (const part of parts) {
        const frag = new DOMParser().parseFromString("<div>" + part + "</div>", "text/html").body;
        units.push({ text: frag.textContent, links: [...frag.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")) });
      }
    }
  } else {
    for (const line of (text || "").split(/\r?\n/)) units.push({ text: line, links: [] });
  }
  const out = [];
  let date = defaultDate;
  for (const u of units) {
    let t = (u.text || "").replace(/\s+/g, " ").trim();
    if (!t) continue;
    const d = lineDate(t, defaultDate.slice(0, 4));
    if (d && !u.links.length) { date = d; continue; }
    const bare = t.match(/https?:\/\/[^\s<>"')\]]+/g) || [];
    const links = [...new Set([...u.links, ...bare].map((x) => x.replace(/[.,;]+$/, "")).filter((x) => /^https?:\/\//i.test(x)))];
    t = t.replace(/https?:\/\/[^\s<>"')\]]+/g, " ")
      .replace(/^\s*(?:\d{1,3}[.)]|[-•*·▪●])\s*/, "")
      .replace(/\s*[-–—:|]?\s*\(?\b(?:links?|here|source|read more)\b\)?(?:\s*[,;&/]\s*(?:links?|here))*\s*[.;]?\s*$/i, "")
      .replace(/\s+/g, " ").replace(/\s*[-–—|:(\[]+\s*$/, "").trim();
    if (t.length < 8) continue;
    out.push({ date, title: t, url: links[0] || "", more: links.slice(1) });
  }
  return out;
}
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return ""; } };

function showEditor() {
  V = { page: "editor" };
  editorToken = editorToken || store.get();
  const app = document.getElementById("app");
  if (!editorToken) return editorSignIn(app);
  const today = localISO(new Date());
  const E = { date: today, items: [], removes: [], busy: false };
  const known = new Map();
  for (const r of (G.picks && G.picks.items) || []) if (r.url) known.set(r.url, r.date);

  const dateIn = el("input", { type: "date", value: E.date, "aria-label": "Date for these articles" });
  const box = el("textarea", { class: "paste", rows: 9, placeholder: "Paste the day's list here (from Word, Google Docs or email). Hyperlinks on “link” are kept; full URLs work too." });
  const preview = el("div");
  const existing = el("div");
  const status = el("p", { class: "cite", role: "status" });
  const publish = el("button", { type: "button", class: "primary" }, "Publish");

  function draw() {
    preview.replaceChildren();
    const n = E.items.length, noLink = E.items.filter((r) => !r.url).length;
    publish.textContent = E.removes.length && !n ? "Remove " + E.removes.length : "Publish " + n + (n === 1 ? " article" : " articles") + (E.removes.length ? " and remove " + E.removes.length : "");
    publish.disabled = E.busy || (!n && !E.removes.length);
    if (!n) { preview.append(el("p", { class: "muted" }, "Nothing to publish yet. Paste a list above.")); return; }
    preview.append(el("p", { class: "muted count" }, n + (n === 1 ? " article" : " articles") + " ready" + (noLink ? " · " + noLink + " without a link" : "") + ". Edit a title by clicking it."));
    const ul = el("ul", { class: "edit-list" });
    E.items.forEach((r, i) => {
      const t = el("input", { class: "edit-title", value: r.title, "aria-label": "Title " + (i + 1) });
      t.addEventListener("input", () => { r.title = t.value; });
      const d = el("input", { type: "date", value: r.date, class: "edit-date", "aria-label": "Date " + (i + 1) });
      d.addEventListener("change", () => { r.date = d.value || E.date; });
      const dup = r.url && known.get(r.url);
      const meta = el("small", null, r.url ? hostOf(r.url) : "No link", r.more.length ? " · +" + r.more.length + " more" : "",
        dup ? el("b", { class: "warn-txt" }, " · Already on the site (" + dateLabel(dup) + ")") : null);
      ul.append(el("li", null, el("div", { class: "edit-row" }, t, d,
        el("button", { type: "button", class: "x", "aria-label": "Drop article " + (i + 1), onclick: () => { E.items.splice(i, 1); draw(); } }, "✕")), meta));
    });
    preview.append(ul);
  }
  function drawExisting() {
    existing.replaceChildren();
    const rows = ((G.picks && G.picks.items) || []).filter((r) => r.date === E.date);
    existing.append(el("h3", { class: "sec-h" }, "Already on the site for " + dateLabel(E.date) + " (" + rows.length + ")"));
    if (!rows.length) { existing.append(el("p", { class: "muted" }, "None yet.")); return; }
    const ul = el("ul", { class: "edit-list" });
    for (const r of rows) {
      const k = { date: r.date, url: r.url || "", title: r.title };
      const marked = () => E.removes.some((x) => x.date === k.date && (x.url || x.title) === (k.url || k.title));
      const btn = el("button", { type: "button", class: "x" }, marked() ? "Undo" : "Remove");
      btn.addEventListener("click", () => {
        E.removes = marked() ? E.removes.filter((x) => !(x.date === k.date && (x.url || x.title) === (k.url || k.title))) : [...E.removes, k];
        drawExisting(); draw();
      });
      ul.append(el("li", { class: marked() ? "struck" : "" }, el("div", { class: "edit-row" }, el("span", { class: "edit-title ro" }, r.title), btn), el("small", null, r.source || hostOf(r.url))));
    }
    existing.append(ul);
  }
  box.addEventListener("paste", (e) => {
    const html = e.clipboardData.getData("text/html"), text = e.clipboardData.getData("text/plain");
    if (!html && !text) return;
    e.preventDefault();
    box.value = text;
    E.items = parsePaste(html, text, E.date);
    draw();
  });
  box.addEventListener("input", () => { E.items = parsePaste("", box.value, E.date); draw(); });
  dateIn.addEventListener("change", () => {
    const old = E.date; E.date = dateIn.value || today;
    E.items.forEach((r) => { if (r.date === old) r.date = E.date; });
    draw(); drawExisting();
  });
  publish.addEventListener("click", async () => {
    E.busy = true; draw();
    status.textContent = "Publishing…";
    const add = E.items.filter((r) => r.title.trim()).map((r) => ({ date: r.date, title: r.title.trim(), url: r.url, more: r.more }));
    const payload = JSON.stringify({ add, remove: E.removes }, null, 1);
    const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15);
    const bytes = new TextEncoder().encode(payload);
    let bin = ""; bytes.forEach((b) => { bin += String.fromCharCode(b); });
    try {
      await gh("/contents/picks/inbox/" + E.date + "-" + stamp + ".json", { method: "PUT", body: JSON.stringify({
        message: "Editor: " + (add.length ? "add " + add.length + " picks" : "") + (add.length && E.removes.length ? ", " : "") + (E.removes.length ? "remove " + E.removes.length : "") + " for " + E.date,
        content: btoa(bin), branch: "main" }) });
      // Show them straight away on this device; the published site catches up in a couple of minutes.
      if (G.picks) {
        const gone = (r) => E.removes.some((x) => x.date === r.date && (x.url || x.title) === (r.url || r.title));
        G.picks.items = [...add.map((r) => ({ ...r, source: hostOf(r.url), more: r.more.map((u) => ({ url: u, source: hostOf(u) })) })), ...G.picks.items.filter((r) => !gone(r))];
      }
      status.replaceChildren("Published. The site updates in about 2 minutes. ",
        el("a", { href: "https://github.com/" + REPO + "/actions", target: "_blank", rel: "noopener" }, "Watch progress"), " · ",
        el("a", { href: "#/daily?d=" + E.date }, "View the day"));
      E.items = []; E.removes = []; box.value = "";
      for (const r of add) if (r.url) known.set(r.url, r.date);
    } catch (err) {
      status.textContent = "Couldn't publish: " + err.message + (/credentials|401|403|Not Found/i.test(err.message) ? ". The token may have expired or lack Contents: Read and write on this repository." : "");
    }
    E.busy = false; draw(); drawExisting();
  });

  app.replaceChildren(
    el("div", { class: "home-h" }, el("h1", null, "Editor"),
      el("button", { type: "button", onclick: () => { store.clear(); editorToken = ""; showEditor(); } }, "Sign out")),
    el("p", { class: "lede" }, "Paste the day's news and policy updates, check the preview, and publish. They join the Daily updates archive and calendar."),
    el("div", { class: "grid" },
      el("section", { class: "card" },
        el("div", { class: "card-h" }, el("h2", null, "New articles"), el("label", { class: "f inline" }, "Date ", dateIn)),
        box, preview,
        el("div", { class: "tfoot" }, status, el("div", { class: "actions" }, publish))),
      el("aside", { class: "card" }, existing)));
  draw(); drawExisting();
}

function editorSignIn(app) {
  const tok = el("input", { type: "password", class: "tok", placeholder: "github_pat_…", autocomplete: "off", "aria-label": "GitHub token" });
  const remember = el("input", { type: "checkbox", checked: true });
  const msg = el("p", { class: "cite", role: "status" });
  const go = el("button", { type: "button", class: "primary" }, "Sign in");
  go.addEventListener("click", async () => {
    editorToken = tok.value.trim();
    if (!editorToken) return;
    msg.textContent = "Checking…";
    try {
      const repo = await gh("");
      if (!repo.permissions || !repo.permissions.push) throw new Error("this token can read the repository but not write to it");
      store.set(editorToken, remember.checked);
      showEditor();
    } catch (err) {
      editorToken = "";
      msg.textContent = "Sign-in failed: " + err.message + ".";
    }
  });
  tok.addEventListener("keydown", (e) => { if (e.key === "Enter") go.click(); });
  app.replaceChildren(el("h1", null, "Editor sign-in"),
    el("section", { class: "card narrow" },
      el("p", null, "Sign in with a GitHub token that can edit this site's repository. It stays in this browser and is only sent to GitHub."),
      el("div", { class: "f" }, "GitHub token", tok),
      el("label", { class: "check" }, remember, " Remember on this device"),
      el("div", { class: "actions" }, go), msg,
      el("details", { class: "how" }, el("summary", null, "How to get a token (once, about 2 minutes)"),
        el("ol", null,
          el("li", null, "On GitHub, open Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token."),
          el("li", null, "Repository access: Only select repositories → in-master-tracker."),
          el("li", null, "Permissions → Repository permissions → Contents: Read and write. Nothing else is needed."),
          el("li", null, "Pick an expiry (up to a year), generate, and paste the token here.")))));
  tok.focus();
}

/* Copy / Download buttons for any chart element carrying wrap._chart. */
function chartButtonsFor(wrap, title, cite, name) {
  name = name || "india-dashboard-" + V.page + "-chart.png";
  const save = (blob) => {
    const a = el("a", { href: URL.createObjectURL(blob), download: name });
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const copyBtn = el("button", { type: "button" }, "Copy chart");
  copyBtn.addEventListener("click", async () => {
    const old = copyBtn.textContent;
    copyBtn.textContent = "Copying…";
    const blob = chartPng(wrap, title, cite);  // a promise, so Safari keeps the click's permission
    try {
      if (!window.ClipboardItem || !navigator.clipboard || !navigator.clipboard.write) throw new Error("unsupported");
      // Some browsers can leave the write pending; don't let the button hang.
      await Promise.race([navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]),
        new Promise((_, no) => setTimeout(() => no(new Error("timed out")), 4000))]);
      copyBtn.textContent = "Copied";
    } catch (e) {
      save(await blob);
      copyBtn.textContent = "Downloaded instead";
    }
    setTimeout(() => { copyBtn.textContent = old; }, 1600);
  });
  const dlBtn = el("button", { type: "button", onclick: async () => save(await chartPng(wrap, title, cite)) }, "Download chart");
  return [copyBtn, dlBtn];
}

/* ---------- Human development: India Policy Insights (Harvard) SDG estimates ---------- */
const HD_METRICS = { mean: "Average", met: "Villages meeting the 2030 SDG target", sd: "Variation between villages (SD)" };
async function loadHd() {
  if (!G.hd) G.hd = await getJSON("hd").catch(() => null);
  return G.hd;
}
function hdBars(items, ind, metric, indiaVal) {
  // items: [{label, v}] already sorted; horizontal bars, one unit.
  const NS = "http://www.w3.org/2000/svg";
  const s = (t, a, txt) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (txt != null) n.textContent = txt; return n; };
  const W = 860, rowH = 20, L = 230, R = 64, T = 24, B = 22;
  const H = T + items.length * rowH + B;
  const vals = items.map((x) => x.v).filter((v) => v != null);
  const hi = Math.max(...vals, indiaVal ?? 0) * 1.05 || 1;
  const x = (v) => L + (v / hi) * (W - L - R);
  const svg = s("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Bar chart: " + ind.name });
  for (let i = 0; i <= 4; i++) {
    const v = (hi * i) / 4;
    svg.append(s("line", { x1: x(v), x2: x(v), y1: T, y2: H - B, stroke: "var(--line2)" }));
    svg.append(s("text", { x: x(v), y: H - 6, "text-anchor": "middle", "font-size": 11, fill: "var(--ink3)" }, fmt(Math.round(v * 10) / 10)));
  }
  items.forEach((it, i) => {
    const y = T + i * rowH;
    svg.append(s("text", { x: L - 8, y: y + 14, "text-anchor": "end", "font-size": 12, fill: "var(--ink2)" }, it.label.length > 34 ? it.label.slice(0, 33) + "…" : it.label));
    if (it.v == null) { if (!it.gap) svg.append(s("text", { x: L + 4, y: y + 14, "font-size": 11, fill: "var(--ink3)" }, "no estimate")); return; }
    const bar = s("rect", { x: L, y: y + 3, width: Math.max(1, x(it.v) - L), height: rowH - 6, rx: 2, fill: it.hl ? "var(--s2)" : "var(--s1)", class: "grow", style: "animation-delay:" + Math.min(i * 18, 500) + "ms" });
    bar.append(s("title", null, it.label + ": " + fmt(it.v)));
    svg.append(bar);
    svg.append(s("text", { x: x(it.v) + 5, y: y + 14, "font-size": 11, fill: "var(--ink2)" }, fmt(it.v)));
  });
  if (indiaVal != null) {
    svg.append(s("line", { x1: x(indiaVal), x2: x(indiaVal), y1: T - 4, y2: H - B, stroke: "var(--ink)", "stroke-dasharray": "4 3" }));
    svg.append(s("text", { x: x(indiaVal), y: 13, "text-anchor": "middle", "font-size": 11, "font-weight": 700, fill: "var(--ink)" }, "India " + fmt(indiaVal)));
  }
  const wrap = el("div", { class: "chart" }, svg);
  wrap._chart = { svg, series: [{ name: ind.name, color: "var(--s1)" }], W, H };
  return wrap;
}

async function showHd(q) {
  const app = document.getElementById("app");
  const D = await loadHd();
  V = { page: "hd" };
  if (!D) {
    app.replaceChildren(el("h1", null, "Human development"), el("p", { class: "empty" }, "The SDG dataset hasn't been loaded yet. It is built on GitHub with the workflow's “Human development” option."));
    return;
  }
  const inds = D.indicators, stateName = Object.fromEntries(D.states.map((s) => [s.id, s.name]));
  const H = { ind: +(q.get("ind") ?? 0), lvl: q.get("lvl") || "s", st: q.get("st") || "", m: q.get("m") || "mean", all: false,
    d: q.get("d") ? +q.get("d") : null, vq: "" };
  if (!(H.ind >= 0 && H.ind < inds.length)) H.ind = 0;
  const save = () => {
    const p = new URLSearchParams({ ind: H.ind, lvl: H.lvl, m: H.m });
    if (H.st) p.set("st", H.st);
    if (H.d != null) p.set("d", H.d);
    history.replaceState(null, "", "#/hd?" + p);
  };
  const better = (i, a, b) => inds[i].higher_better == null || a == null || b == null ? 0 : (inds[i].higher_better ? a - b : b - a);
  const valOf = (row, i, m) => row[m] ? row[m][i] : null;
  const distLabel = (d) => d.name + (H.st ? "" : ", " + (stateName[d.state] || ""));

  const main = el("section", { class: "card", "aria-label": "Ranking" });
  const side = el("aside", { class: "card", "aria-label": "District profile" });

  function rankRows() {
    const i = H.ind, m = H.lvl === "s" && H.m === "sd" ? "mean" : H.m;
    let rows = H.lvl === "s" ? D.states.map((s) => ({ label: s.name, v: valOf(s, i, m), id: s.id }))
      : D.districts.filter((d) => !H.st || String(d.state) === H.st).map((d) => ({ label: distLabel(d), v: valOf(d, i, m), id: d.id, hl: d.id === H.d }));
    const hb = inds[i].higher_better;
    // "Best first": for spread (sd) less variation is better; for target share more is better.
    const dir = m === "sd" ? -1 : m === "met" ? 1 : hb === false ? -1 : 1;
    rows.sort((a, b) => a.v == null ? 1 : b.v == null ? -1 : dir * (b.v - a.v));
    return { rows, m };
  }

  function drawMain() {
    main.replaceChildren();
    const ind = inds[H.ind];
    const sel = el("select", { "aria-label": "Indicator", onchange: (e) => { H.ind = +e.target.value; save(); drawMain(); drawSide(); } });
    for (const g of uniq(inds.map((x) => x.group))) {
      sel.append(el("optgroup", { label: g }, inds.map((x, i) => [x, i]).filter(([x]) => x.group === g)
        .map(([x, i]) => el("option", { value: i, selected: i === H.ind }, x.name))));
    }
    const lvl = el("div", { class: "seg-btns" }, [["s", "States"], ["d", "Districts"]].map(([k, t]) =>
      el("button", { type: "button", class: H.lvl === k ? "on" : "", onclick: () => { H.lvl = k; H.all = false; save(); drawMain(); } }, t)));
    const stSel = el("select", { "aria-label": "State", onchange: (e) => { H.st = e.target.value; H.all = false; save(); drawMain(); } },
      el("option", { value: "" }, "All states"), D.states.map((s) => el("option", { value: s.id, selected: String(s.id) === H.st }, s.name)));
    const mSel = el("select", { "aria-label": "Measure", onchange: (e) => { H.m = e.target.value; save(); drawMain(); } },
      Object.entries(HD_METRICS).filter(([k]) => k !== "sd" || H.lvl === "d").map(([k, t]) => el("option", { value: k, selected: k === H.m }, t)));
    main.append(el("div", { class: "card-h" }, el("h2", null, "Rank states and districts")),
      el("div", { class: "filters" }, el("div", { class: "f" }, "Indicator", sel), el("div", { class: "f" }, "Show", lvl),
        H.lvl === "d" ? el("div", { class: "f" }, "Within", stSel) : null, el("div", { class: "f" }, "Measure", mSel)));

    const { rows, m } = rankRows();
    const dirTxt = m === "sd" ? "Less variation first." : m === "met" ? "Highest share first." : ind.higher_better === false ? "Lower is better, so the lowest comes first." : ind.higher_better ? "Higher is better, so the highest comes first." : "";
    const LIMIT = 15;
    let shown = rows;
    if (!H.all && rows.length > LIMIT * 2) shown = [...rows.slice(0, LIMIT), { label: "· · · " + (rows.length - LIMIT * 2) + " more · · ·", v: null, gap: true }, ...rows.slice(-LIMIT)];
    const indiaVal = m === "sd" ? null : D.india[m] ? D.india[m][H.ind] : null;
    const chartEl = hdBars(shown.filter((r) => !r.gap).length === shown.length ? shown : shown.map((r) => r.gap ? { label: r.label, v: null, gap: true } : r), ind, m, indiaVal);
    const title = ind.name + " (" + (m === "mean" ? ind.unit : m === "met" ? "% of villages meeting the 2030 target" : "SD across villages") + ") · " +
      (H.lvl === "s" ? "States" : H.st ? stateName[H.st] + " districts" : "All districts") + " · 2021";
    const cite = "Source: " + D.source.publisher + ", " + D.source.title + " (" + D.source.licence + ").";
    const csvText = (sep) => [["Rank", H.lvl === "s" ? "State" : "District", title].join(sep),
      ...rows.map((r, k) => [k + 1, r.label, r.v ?? ""].map((x) => sep === "," && /[",]/.test(String(x)) ? '"' + String(x).replace(/"/g, '""') + '"' : x).join(sep))].join("\n");
    main.append(el("p", { class: "muted count" }, title + ". " + dirTxt), chartEl,
      el("div", { class: "tfoot" },
        el("span", { class: "muted" }, rows.length + (H.lvl === "s" ? " states" : " districts") + (shown !== rows ? " · showing best and worst " + LIMIT : "")),
        el("div", { class: "actions" },
          rows.length > LIMIT * 2 ? el("button", { type: "button", onclick: () => { H.all = !H.all; drawMain(); } }, H.all ? "Best and worst only" : "Show all " + rows.length) : null,
          chartButtonsFor(chartEl, title, cite),
          el("button", { type: "button", onclick: () => download("india-dashboard-sdg-ranking.csv", csvText(",")) }, "Download CSV"),
          el("button", { type: "button", onclick: (e) => copy(csvText("\t"), e.target) }, "Copy for Excel"))),
      el("p", { class: "cite" }, cite + " " + D.source.note));
    if (H.lvl === "d") chartEl.addEventListener("click", (e) => {
      const t = e.target.closest("rect"); if (!t) return;
      const label = t.querySelector("title").textContent.split(":")[0];
      const d = D.districts.find((x) => distLabel(x) === label);
      if (d) { H.d = d.id; save(); drawMain(); drawSide(); side.scrollIntoView({ behavior: "smooth", block: "start" }); }
    });
  }

  function drawSide() {
    side.replaceChildren();
    const opts = [el("option", { value: "" }, "Choose a district")];
    for (const s of D.states) {
      opts.push(el("optgroup", { label: s.name }, D.districts.filter((d) => d.state === s.id).sort((a, b) => a.name.localeCompare(b.name))
        .map((d) => el("option", { value: d.id, selected: d.id === H.d }, d.name))));
    }
    const dSel = el("select", { "aria-label": "District", onchange: (e) => { H.d = e.target.value ? +e.target.value : null; save(); drawSide(); if (H.lvl === "d") drawMain(); } }, opts);
    side.append(el("div", { class: "card-h" }, el("h2", null, "District profile")), dSel);
    const d = D.districts.find((x) => x.id === H.d);
    if (!d) { side.append(el("p", { class: "muted" }, "Pick a district to compare all " + inds.length + " indicators with its state and India, and to look up its villages. You can also click a district's bar in the ranking.")); return; }
    const st = D.states.find((s) => s.id === d.state);
    side.append(el("p", { class: "muted count" }, (st ? st.name + " · " : "") + d.villages.toLocaleString("en-IN") + " villages estimated"));
    const ul = el("ul", { class: "hd-prof" });
    inds.forEach((ind, i) => {
      const dv = d.mean ? d.mean[i] : null, sv = st && st.mean ? st.mean[i] : null, nv = D.india.mean ? D.india.mean[i] : null;
      const b = better(i, dv, nv);
      ul.append(el("li", { class: i === H.ind ? "on" : "", onclick: () => { H.ind = i; save(); drawMain(); drawSide(); } },
        el("span", { class: "n" }, ind.name),
        el("b", { class: b > 0 ? "good" : b < 0 ? "bad" : "" }, dv == null ? "–" : fmt(dv)),
        el("small", null, "State " + (sv == null ? "–" : fmt(sv)) + " · India " + (nv == null ? "–" : fmt(nv)) +
          (d.met && d.met[i] != null ? " · " + fmt(d.met[i]) + "% of villages meet target" : ""))));
    });
    side.append(el("p", { class: "cite" }, "Green: better than the India average. Red: worse. Click an indicator to rank it."), ul);
    const vbox = el("div");
    side.append(el("h3", { class: "sec-h" }, "Villages"), vbox);
    vbox.append(el("button", { type: "button", onclick: () => drawVillages(d, vbox) }, "Look up " + d.villages.toLocaleString("en-IN") + " villages"));
  }

  async function drawVillages(d, box) {
    box.replaceChildren(el("p", { class: "muted" }, "Loading villages…"));
    let vs;
    try { vs = await getJSON("hd/v/" + d.id); } catch (e) { box.replaceChildren(el("p", { class: "empty" }, "Couldn't load villages: " + e.message)); return; }
    const i = H.ind, ind = inds[i], col = 2 + i;
    const meets = (v) => v == null || ind.target_approx == null || ind.higher_better == null ? null : ind.higher_better ? v >= ind.target_approx : v <= ind.target_approx;
    const search = el("input", { type: "search", placeholder: "Search " + vs.length + " villages", "aria-label": "Search villages" });
    const table = el("div", { class: "tablebox" });
    const draw = () => {
      const t = search.value.trim().toLowerCase();
      const rows = vs.filter((v) => !t || v[1].toLowerCase().includes(t))
        .sort((a, b) => a[col] == null ? 1 : b[col] == null ? -1 : (ind.higher_better === false ? a[col] - b[col] : b[col] - a[col]));
      table.replaceChildren(el("table", null,
        el("thead", null, el("tr", null, el("th", null, "Village"), el("th", { class: "n" }, ind.name + " (" + ind.unit + ")"), el("th", null, "2030 target"))),
        el("tbody", null, rows.slice(0, 300).map((v) => el("tr", null, el("td", null, v[1]), el("td", { class: "n" }, v[col] == null ? "–" : fmt(v[col])),
          el("td", null, meets(v[col]) == null ? "" : meets(v[col]) ? "Met" : "Not yet"))))));
      if (rows.length > 300) table.append(el("p", { class: "cite" }, "Showing 300 of " + rows.length + ". Search to narrow, or download all."));
    };
    search.addEventListener("input", draw);
    const csv = () => [["Village ID", "Village", ...inds.map((x) => x.name + " (" + x.unit + ")")].join(","),
      ...vs.map((v) => [v[0], '"' + v[1].replace(/"/g, '""') + '"', ...v.slice(2).map((x) => x ?? "")].join(","))].join("\n");
    box.replaceChildren(el("p", { class: "muted count" }, "Sorted by " + ind.name + (ind.higher_better === false ? ", lowest first" : ", highest first") + ". Target status uses the dataset's 2030 SDG target."),
      search, table, el("div", { class: "actions", style: "margin-top:8px" },
        el("button", { type: "button", onclick: () => download("villages-" + d.name.replace(/\W+/g, "-").toLowerCase() + ".csv", csv()) }, "Download all indicators (CSV)")));
    draw();
  }

  app.replaceChildren(el("h1", null, "Human development"),
    el("p", { class: "lede" }, "Thirty-five SDG indicators for every state, district and rural village: poverty, health coverage, nutrition, maternal and child health, women and girls, and water, sanitation and fuel."),
    el("p", { class: "caveat" }, "Model-based estimates for 2021 from Harvard's India Policy Insights, built from NFHS-5 (2019-21) and the 2011 Census. They describe rural villages, so district figures can differ from official NFHS district reports. State and India figures are simple averages of village estimates."),
    el("div", { class: "grid" }, main, side));
  save(); drawMain(); drawSide();
}

/* ---------- state metrics shared by profiles and rankings ---------- */
const normState = (s) => String(s || "").toLowerCase().replace(/^nct of /, "").replace(/&/g, "and").replace(/[^a-z]/g, "");
const latestOf = (rows) => rows.reduce((a, r) => (!a || r.p > a.p ? r : a), null);

async function stateData() {
  if (G.stateData) return G.stateData;
  const [st, macro, hd] = await Promise.all([loadPage("states"), loadPage("macro"), loadHd()]);
  const by = new Map();
  for (const r of st) { if (r.geo === "All India") continue; if (!by.has(r.geo)) by.set(r.geo, []); by.get(r.geo).push(r); }
  const hdState = new Map(((hd && hd.states) || []).map((s) => [normState(s.name), s]));
  const hdInd = (re) => hd ? hd.indicators.findIndex((i) => re.test(i.name)) : -1;
  const pick = (rows, test) => latestOf(rows.filter(test));
  // India comparators from the national files
  const india = {
    gdpGrowth: latestOf(macro.filter((r) => /GDP Growth Rate \(constant/.test(r.ind) && r.f === "Annual")),
    cpi: latestOf(macro.filter((r) => r.ind.startsWith("CPI inflation") && r.seg === "CPI (General)" && r.geo === "All India")),
    unemp: latestOf(macro.filter((r) => r.ind === "Unemployment rate" && r.geo === "All India")),
    lfpr: latestOf(macro.filter((r) => r.ind === "Labour force participation rate" && r.geo === "All India")),
  };
  const hdMetric = (key, label, re, better) => {
    const i = hdInd(re);
    return { key, label, unit: "%", better, group: "Human development (rural, 2021)", src: "Harvard India Policy Insights",
      get: (name) => { const s = hdState.get(normState(name)); return s && i >= 0 && s.mean[i] != null ? { v: s.mean[i], p: "2021" } : null; },
      india: hd && i >= 0 && hd.india.mean[i] != null ? { v: hd.india.mean[i], p: "2021" } : null };
  };
  const metrics = [
    { key: "gsdp", label: "GSDP, current prices", unit: "₹ crore", better: "high", group: "Economy", src: "MoSPI state accounts",
      get: (n) => pick(by.get(n) || [], (r) => r.ind === "Gross State Domestic Product (current prices)") },
    { key: "growth", label: "GSDP growth, real", unit: "%", better: "high", group: "Economy", src: "MoSPI state accounts",
      get: (n) => pick(by.get(n) || [], (r) => r.ind === "GSDP Growth Rate (constant prices)"), india: india.gdpGrowth && { v: india.gdpGrowth.v, p: india.gdpGrowth.p, note: "national GDP, 2022-23 base" } },
    { key: "pcnsdp", label: "Per capita income (NSDP), current prices", unit: "₹", better: "high", group: "Economy", src: "MoSPI state accounts",
      get: (n) => pick(by.get(n) || [], (r) => r.ind === "Per Capita Net State Domestic Product (current prices)") },
    { key: "mfg", label: "Manufacturing share of GSVA", unit: "%", better: null, group: "Economy", src: "MoSPI state accounts",
      get: (n) => {
        const rows = (by.get(n) || []).filter((r) => r.ind === "Gross State Value Added (current prices)");
        const yr = (latestOf(rows.filter((r) => r.seg === "Manufacturing")) || {}).p;
        const m = rows.find((r) => r.p === yr && r.seg === "Manufacturing"), t = rows.find((r) => r.p === yr && r.seg === "Total Gross State Value Added");
        return m && t && t.v ? { v: Math.round(1000 * m.v / t.v) / 10, p: yr } : null;
      } },
    { key: "unemp", label: "Unemployment rate", unit: "%", better: "low", group: "Jobs and prices", src: "MoSPI PLFS",
      get: (n) => pick(by.get(n) || [], (r) => r.ind === "Unemployment rate"), india: india.unemp },
    { key: "lfpr", label: "Labour force participation", unit: "%", better: "high", group: "Jobs and prices", src: "MoSPI PLFS",
      get: (n) => pick(by.get(n) || [], (r) => r.ind === "Labour force participation rate"), india: india.lfpr },
    { key: "cpi", label: "CPI inflation", unit: "%", better: "low", group: "Jobs and prices", src: "MoSPI CPI",
      get: (n) => pick(by.get(n) || [], (r) => r.ind === "CPI inflation (y/y)" && r.seg === "CPI (General)"), india: india.cpi },
    hdMetric("poverty", "Multidimensional poverty", /^Multidimensional Poverty/, "low"),
    hdMetric("stunting", "Child stunting", /^Stunting/, "low"),
    hdMetric("anaemia", "Anaemia among women", /^Anaemia \(Women\)/, "low"),
    hdMetric("sanitation", "Improved sanitation", /^Improved Sanitation/, "high"),
    hdMetric("fuel", "Clean cooking fuel", /^Clean Fuel/, "high"),
    hdMetric("internet", "Internet use", /^Internet Use/, "high"),
    hdMetric("phone", "Women owning a mobile phone", /^Own Mobile Phone \(Women\)/, "high"),
  ];
  const states = [...by.keys()].sort();
  // ranks per metric (1 = best, or largest where direction is neutral)
  const ranks = {};
  for (const m of metrics) {
    const vals = states.map((s) => [s, m.get(s)]).filter(([, x]) => x && x.v != null);
    vals.sort((a, b) => m.better === "low" ? a[1].v - b[1].v : b[1].v - a[1].v);
    ranks[m.key] = { n: vals.length, of: new Map(vals.map(([s], i) => [s, i + 1])) };
  }
  G.stateData = { states, by, metrics, ranks, india, hd, hdState };
  return G.stateData;
}
const fmtMetric = (m, v) => v == null ? "–" : m.unit === "₹ crore" ? "₹" + fmt(Math.round(v / 1000) / 100) + " lakh cr" : m.unit === "₹" ? "₹" + fmt(Math.round(v)) : fmt(v) + (m.unit === "%" ? "%" : "");
const pLabel = (p) => /^\d{4}-\d{2}$/.test(p) && +p.slice(5) <= 12 && !/^\d{4}-(1[3-9]|[2-9]\d)$/.test(p) && p.slice(0, 4) >= "2020" && /-(0\d|1[0-2])$/.test(p) && !/^\d{4}-\d{2}$/.test(p.replace(/-(0[1-9]|1[0-2])$/, "")) ? MON[+p.slice(5) - 1] + " " + p.slice(0, 4) : p;
const poss = (n) => n + (/s$/i.test(n) ? "'" : "'s");  // "Islands'", "Punjab's"
const ordinal = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th");
const betterThan = (m, a, b) => m.better == null || a == null || b == null ? 0 : (m.better === "high" ? a - b : b - a);

/* Two clear ways into state profiles and rankings from the States page. */
function stateEntryPanels() {
  const states = uniq(((G.cache.states) || []).map((r) => r.geo)).filter((g) => g !== "All India").sort();
  const pick = el("select", { "aria-label": "Choose a state for its profile" },
    states.map((s) => el("option", { value: s, selected: s === (G.focus || "Tamil Nadu") }, s)));
  const open = () => { location.hash = "#/state?n=" + encodeURIComponent(pick.value); };
  return el("section", { class: "entry-panels", "aria-label": "State profiles and rankings" },
    el("div", { class: "entry" },
      el("div", null, el("b", null, "State profiles"), el("p", null, "One page per state: economy, jobs, prices, human development and the latest news, with its rank among states.")),
      el("div", { class: "entry-do" }, pick, el("button", { type: "button", class: "primary", onclick: open }, "Open profile →"))),
    el("a", { class: "entry", href: "#/rankings" + (G.focus ? "?s=" + encodeURIComponent(G.focus) : "") },
      el("div", null, el("b", null, "State rankings"), el("p", null, "Rank every state on 14 indicators, from growth and income to jobs and human development, and compare any two.")),
      el("div", { class: "entry-do" }, el("span", { class: "btn-like" }, "Open rankings →"))));
}

/* ---------- Rankings ---------- */
async function showRankings(q) {
  const S = await stateData();
  V = { page: "rankings" };
  const R = { m: q.get("m") || "growth", hl: q.get("s") || "", a: q.get("a") || "", b: q.get("b") || "" };
  if (!S.metrics.find((m) => m.key === R.m)) R.m = "growth";
  const save = () => { const p = new URLSearchParams({ m: R.m }); if (R.hl) p.set("s", R.hl); if (R.a) p.set("a", R.a); if (R.b) p.set("b", R.b); history.replaceState(null, "", "#/rankings?" + p); };
  const main = el("section", { class: "card" }), side = el("aside", { class: "card" });
  const stateOpts = (sel, blank) => [el("option", { value: "" }, blank), ...S.states.map((s) => el("option", { value: s, selected: s === sel }, s))];

  function drawMain() {
    const m = S.metrics.find((x) => x.key === R.m);
    const sel = el("select", { "aria-label": "Indicator", onchange: (e) => { R.m = e.target.value; save(); drawMain(); } },
      uniq(S.metrics.map((x) => x.group)).map((g) => el("optgroup", { label: g }, S.metrics.filter((x) => x.group === g).map((x) => el("option", { value: x.key, selected: x.key === R.m }, x.label)))));
    const hl = el("select", { "aria-label": "Highlight a state", onchange: (e) => { R.hl = e.target.value; save(); drawMain(); } }, stateOpts(R.hl, "None"));
    const items = S.states.map((s) => ({ s, x: m.get(s) })).filter((o) => o.x && o.x.v != null)
      .sort((a, b) => m.better === "low" ? a.x.v - b.x.v : b.x.v - a.x.v)
      .map((o, i) => ({ label: (i + 1) + ". " + o.s, v: m.unit === "₹ crore" ? Math.round(o.x.v / 1000) / 100 : o.x.v, hl: o.s === R.hl, p: o.x.p, state: o.s }));
    const unitTxt = m.unit === "₹ crore" ? "₹ lakh crore" : m.unit;
    const periods = uniq(items.map((i) => i.p)).sort();
    const chartEl = hdBars(items, { name: m.label }, "mean", m.india ? m.india.v : null);
    const dir = m.better === "low" ? "Lower is better, so the lowest is ranked first." : m.better === "high" ? "Higher is better, so the highest is ranked first." : "Ranked from highest to lowest.";
    const title = m.label + " (" + unitTxt + ") · States · " + (periods.length === 1 ? periods[0] : periods[0] + " to " + periods[periods.length - 1]);
    const cite = "Source: " + m.src + ". India Dashboard rankings.";
    chartEl.addEventListener("click", (e) => { const t = e.target.closest("rect"); if (!t) return; const s = t.querySelector("title").textContent.split(":")[0].replace(/^\d+\.\s*/, ""); location.hash = "#/state?n=" + encodeURIComponent(s); });
    main.replaceChildren(el("div", { class: "card-h" }, el("h2", null, "State rankings"), el("span", { class: "muted" }, items.length + " states and union territories")),
      el("div", { class: "filters" }, el("div", { class: "f" }, "Indicator", sel), el("div", { class: "f" }, "Highlight", hl)),
      el("p", { class: "muted count" }, title + ". " + dir + (m.india ? " Dashed line: India" + (m.india.note ? " (" + m.india.note + ")" : "") + "." : "") + (periods.length > 1 ? " Latest year differs by state." : "")),
      chartEl,
      el("div", { class: "tfoot" }, el("span", { class: "muted" }, "Click a bar to open that state's profile."), el("div", { class: "actions" }, chartButtonsFor(chartEl, title, cite))),
      el("p", { class: "cite" }, cite + (m.group.startsWith("Human") ? " Rural village averages from model estimates, not official NFHS state figures." : "")));
  }

  function drawSide() {
    const a = el("select", { "aria-label": "First state", onchange: (e) => { R.a = e.target.value; save(); drawSide(); } }, stateOpts(R.a, "Choose a state"));
    const b = el("select", { "aria-label": "Second state", onchange: (e) => { R.b = e.target.value; save(); drawSide(); } }, stateOpts(R.b, "Choose a state"));
    side.replaceChildren(el("div", { class: "card-h" }, el("h2", null, "Compare two states")), el("div", { class: "cmp-pick" }, a, el("span", { class: "muted" }, "vs"), b));
    if (!R.a || !R.b) { side.append(el("p", { class: "muted" }, "Pick two states to see every ranked indicator side by side, with each state's rank and India's figure.")); return; }
    const tb = el("tbody");
    let group = "";
    for (const m of S.metrics) {
      if (m.group !== group) { group = m.group; tb.append(el("tr", { class: "grp" }, el("td", { colspan: 4 }, group))); }
      const xa = m.get(R.a), xb = m.get(R.b), ra = S.ranks[m.key].of.get(R.a), rb = S.ranks[m.key].of.get(R.b);
      const d = betterThan(m, xa && xa.v, xb && xb.v);
      const cell = (x, r, win) => el("td", { class: "n" + (win ? " win" : "") }, el("b", null, fmtMetric(m, x && x.v)), r ? el("small", null, ordinal(r) + " of " + S.ranks[m.key].n) : null);
      tb.append(el("tr", { onclick: () => { R.m = m.key; save(); drawMain(); }, title: "Rank all states on this" },
        el("td", null, m.label), cell(xa, ra, d > 0), cell(xb, rb, d < 0), el("td", { class: "n muted" }, m.india ? fmtMetric(m, m.india.v) : "–")));
    }
    side.append(el("div", { class: "tablebox" }, el("table", { class: "cmp" }, el("thead", null, el("tr", null, el("th", null, ""), el("th", { class: "n" }, R.a), el("th", { class: "n" }, R.b), el("th", { class: "n" }, "India"))), tb)),
      el("p", { class: "cite" }, "Highlighted: the better of the two where the direction is clear. Click a row to rank all states on it."),
      el("div", { class: "actions" }, el("a", { class: "more", href: "#/state?n=" + encodeURIComponent(R.a) }, R.a + " profile →"), el("a", { class: "more", href: "#/state?n=" + encodeURIComponent(R.b) }, R.b + " profile →")));
  }

  document.getElementById("app").replaceChildren(el("h1", null, "State rankings"),
    el("div", { class: "crumbs" }, el("a", { href: "#/states" }, "← State data"), el("a", { href: "#/state" + (R.hl ? "?n=" + encodeURIComponent(R.hl) : "") }, "State profiles →")),
    el("p", { class: "lede" }, "Rank every state on growth, income, jobs, prices and human development, and compare any two side by side."),
    el("div", { class: "grid" }, main, side));
  save(); drawMain(); drawSide();
}

/* ---------- State profile ---------- */
async function showStateProfile(q) {
  const S = await stateData();
  const name = S.states.includes(q.get("n")) ? q.get("n") : (S.states.includes("Tamil Nadu") ? "Tamil Nadu" : S.states[0]);
  V = { page: "state", state: name };
  history.replaceState(null, "", "#/state?n=" + encodeURIComponent(name));
  const rows = S.by.get(name) || [];
  const M = (k) => S.metrics.find((m) => m.key === k);
  const rk = (k) => S.ranks[k].of.get(name);
  const sel = el("select", { "aria-label": "State", class: "state-pick", onchange: (e) => { location.hash = "#/state?n=" + encodeURIComponent(e.target.value); } },
    S.states.map((s) => el("option", { value: s, selected: s === name }, s)));

  // headline tiles
  const tile = (k, extra) => {
    const m = M(k), x = m.get(name); if (!x) return null;
    const r = rk(k);
    return el("a", { class: "tile", href: "#/rankings?m=" + k + "&s=" + encodeURIComponent(name), title: "See all states ranked" },
      el("b", null, fmtMetric(m, x.v)), el("span", null, m.label), el("small", null, pLabel(x.p) + (r ? " · " + ordinal(r) + " of " + S.ranks[k].n : "") + (extra ? " · " + extra(x) : "")));
  };
  const vsIndia = (k) => (x) => { const m = M(k); return m.india ? "India " + fmtMetric(m, m.india.v) : ""; };
  const tiles = el("section", { class: "tiles" }, [tile("gsdp"), tile("growth", vsIndia("growth")), tile("pcnsdp"), tile("unemp", vsIndia("unemp")), tile("cpi", vsIndia("cpi")), tile("mfg")].filter(Boolean));

  // growth over time: state vs India
  const g = rows.filter((r) => r.ind === "GSDP Growth Rate (constant prices)");
  const periods = uniq(g.map((r) => r.p)).sort().slice(-10);
  const series = [{ geo: name, seg: "", ind: "GSDP growth, real", unit: "%", ds: "gsdp", vals: Object.fromEntries(g.map((r) => [r.p, r.v])) }];
  const ig = (await loadPage("macro")).filter((r) => /GDP Growth Rate \(constant/.test(r.ind) && r.f === "Annual");
  if (ig.length) series.push({ geo: "India (GDP, 2022-23 base)", seg: "", ind: "GSDP growth, real", unit: "%", ds: "nas", vals: Object.fromEntries(ig.map((r) => [r.p, r.v])) });
  const growthChart = chart(periods, series, "Annual");
  const growthCard = el("section", { class: "card" }, el("div", { class: "card-h" }, el("h2", null, "Growth over time"), el("span", { class: "muted" }, "Real GSDP growth, %")), growthChart || el("p", { class: "muted" }, "No growth series for this state."),
    growthChart ? el("div", { class: "tfoot" }, el("span", { class: "cite" }, "State series on a 2011-12 base; India's GDP on 2022-23, so compare direction rather than levels."), el("div", { class: "actions" }, chartButtonsFor(growthChart, name + ": real GSDP growth (%)", "Source: MoSPI state and national accounts."))) : null);

  // economy structure: GSVA shares, latest year
  const gv = rows.filter((r) => r.ind === "Gross State Value Added (current prices)");
  const yr = (latestOf(gv.filter((r) => r.seg === "Manufacturing")) || {}).p;
  const tot = (gv.find((r) => r.p === yr && r.seg === "Total Gross State Value Added") || {}).v;
  const shares = gv.filter((r) => r.p === yr && r.seg !== "Total Gross State Value Added" && tot).map((r) => ({ label: r.seg.replace(/, Ownership of Dwelling & Professional Services/, " & professional").replace(/Transport, Storage, Communication & Services Related to Broadcasting/, "Transport & communication").replace(/Electricity, Gas, Water Supply & Other Utility Services/, "Utilities").replace(/Agriculture, Livestock, Forestry and Fishing/, "Agriculture"), v: Math.round(1000 * r.v / tot) / 10 })).sort((a, b) => b.v - a.v);
  const structChart = shares.length ? hdBars(shares, { name: "Share of GSVA" }, "mean", null) : null;
  const structCard = el("section", { class: "card" }, el("div", { class: "card-h" }, el("h2", null, "Economy profile"), el("span", { class: "muted" }, "Share of GSVA, " + (yr || "") + ", %")), structChart || el("p", { class: "muted" }, "No industry breakdown for this state."),
    structChart ? el("div", { class: "tfoot" }, el("span", null), el("div", { class: "actions" }, chartButtonsFor(structChart, name + ": share of gross state value added by industry, " + yr + " (%)", "Source: MoSPI state accounts, current prices."))) : null);

  // human development
  const hdList = el("ul", { class: "hd-prof" });
  for (const m of S.metrics.filter((x) => x.group.startsWith("Human"))) {
    const x = m.get(name); if (!x) continue;
    const d = betterThan(m, x.v, m.india && m.india.v);
    hdList.append(el("li", { onclick: () => { location.hash = "#/rankings?m=" + m.key + "&s=" + encodeURIComponent(name); } }, el("span", { class: "n" }, m.label),
      el("b", { class: d > 0 ? "good" : d < 0 ? "bad" : "" }, fmtMetric(m, x.v)), el("small", null, "India " + fmtMetric(m, m.india && m.india.v) + " · " + ordinal(rk(m.key)) + " of " + S.ranks[m.key].n)));
  }
  const hdS = S.hdState.get(normState(name));
  const hdCard = el("section", { class: "card" }, el("div", { class: "card-h" }, el("h2", null, "Human development"), el("span", { class: "muted" }, "Rural, 2021")),
    hdList.children.length ? hdList : el("p", { class: "muted" }, "No estimates for this state."),
    el("p", { class: "cite" }, "Green: better than India. Harvard India Policy Insights village estimates. ", hdS ? el("a", { href: "#/hd?lvl=d&st=" + hdS.id }, "Rank this state's districts →") : null));

  // developments and picks
  const nn = normState(name);
  const news = G.news.items.filter((r) => r.states.some((s) => normState(s) === nn)).slice(0, 8);
  await loadPicks();
  const picks = ((G.picks && G.picks.items) || []).filter((r) => normState(r.title).includes(nn)).slice(0, 6);
  const side = el("aside", { class: "card" },
    el("div", { class: "card-h" }, el("h2", null, "Developments"), el("span", { class: "muted" }, news.length ? "Tagged to " + name : "")),
    news.length ? el("ul", { class: "news flat" }, news.map((r) => el("li", null, el("a", { href: r.url, target: "_blank", rel: "noopener" }, tidy(r.title)), el("small", null, dateLabel(r.date) + " · " + r.publisher)))) : el("p", { class: "muted" }, "No recent developments tagged to this state."),
    el("h3", { class: "sec-h" }, "In your daily picks"),
    picks.length ? el("ul", { class: "news flat" }, picks.map(pickLine)) : el("p", { class: "muted" }, "No picked articles mention " + name + "."),
    el("div", { class: "card-f" }, el("a", { class: "more", href: "#/states?focus=" + encodeURIComponent(name) }, "All data for " + name), el("a", { class: "more", href: "#/rankings?a=" + encodeURIComponent(name) }, "Compare →")));

  document.getElementById("app").replaceChildren(
    el("div", { class: "home-h" }, el("h1", null, name), el("div", { class: "f inline" }, "Switch state", sel)),
    el("div", { class: "crumbs" }, el("a", { href: "#/states?focus=" + encodeURIComponent(name) }, "← State data"), el("a", { href: "#/rankings?s=" + encodeURIComponent(name) + "&a=" + encodeURIComponent(name) }, "State rankings →")),
    el("p", { class: "lede" }, "Economy, jobs, prices and human development for " + name + ", with its rank among states and recent developments."),
    tiles,
    el("div", { class: "grid" }, el("div", { class: "stack" }, growthCard, structCard, hdCard), side));
}

/* ---------- Chart of the day: a short, data-written story on the Dashboard ---------- */
const sinceLabel = (series, i, higher) => {
  // the most recent earlier point at least as extreme as series[i]
  for (let k = i - 1; k >= 0; k--) if (higher ? series[k].v >= series[i].v : series[k].v <= series[i].v) return series[k];
  return null;
};
async function buildStories() {
  const macro = await loadPage("macro");
  const out = [];
  const ser = (test, rows) => (rows || macro).filter(test).sort((a, b) => a.p < b.p ? -1 : 1);
  // 1. CPI inflation
  const cpi = ser((r) => r.ind.startsWith("CPI inflation") && r.seg === "CPI (General)" && r.geo === "All India");
  if (cpi.length > 3) {
    const i = cpi.length - 1, l = cpi[i], p = cpi[i - 1], hi = sinceLabel(cpi, i, true), lo = sinceLabel(cpi, i, false);
    const ext = l.v > p.v ? (hi ? "the highest since " + periodLabel(hi.p, "Monthly") : "the highest in this series") : (lo ? "the lowest since " + periodLabel(lo.p, "Monthly") : "the lowest in this series");
    out.push({ kicker: "Prices", rows: cpi.slice(-12), unit: "%", page: "macro", preset: "CPI inflation",
      title: "Retail inflation " + (l.v > p.v ? "rose" : "eased") + " to " + fmt(l.v) + "% in " + periodLabel(l.p, "Monthly"),
      text: "Consumer prices were " + fmt(l.v) + "% higher than a year earlier, " + (l.v > p.v ? "up" : "down") + " from " + fmt(p.v) + "% the month before and " + ext + ". RBI's tolerance band is 2% to 6%.",
      src: "MoSPI, Consumer Price Index (base 2024)" });
  }
  // 2. Industrial production
  const iip = ser((r) => r.ind.startsWith("IIP growth") && r.seg === "General");
  if (iip.length > 6) {
    const l = iip[iip.length - 1], avg = iip.slice(-13, -1).reduce((s, r) => s + r.v, 0) / Math.min(12, iip.length - 1);
    out.push({ kicker: "Industry", rows: iip.slice(-12), unit: "%", page: "macro", preset: "IIP growth",
      title: "Factory output grew " + fmt(l.v) + "% in " + periodLabel(l.p, "Monthly"),
      text: "Industrial production was " + fmt(l.v) + "% higher than a year earlier, " + (l.v > avg ? "above" : "below") + " its 12-month average of " + fmt(Math.round(avg * 10) / 10) + "%.",
      src: "MoSPI, Index of Industrial Production" });
  }
  // 3. Fastest-growing state
  const st = await loadPage("states");
  const gr = st.filter((r) => r.ind === "GSDP Growth Rate (constant prices)" && r.geo !== "All India");
  const yrs = uniq(gr.map((r) => r.p)).sort();
  const yr = yrs.find((y, k) => gr.filter((r) => r.p === yrs[yrs.length - 1 - k]).length >= 20) ? yrs.slice().reverse().find((y) => gr.filter((r) => r.p === y).length >= 20) : null;
  if (yr) {
    const ranked = gr.filter((r) => r.p === yr).sort((a, b) => b.v - a.v);
    const top = ranked.slice(0, 8).map((r) => ({ geo: r.geo, v: r.v }));
    out.push({ kicker: "States", bars: top.map((r) => ({ label: r.geo, v: r.v })), unit: "%", page: "rankings", href: "#/rankings?m=growth",
      title: ranked[0].geo + " grew fastest in " + yr,
      text: poss(ranked[0].geo) + " economy grew " + fmt(ranked[0].v) + "% in real terms in " + yr + ", ahead of " + ranked[1].geo + " (" + fmt(ranked[1].v) + "%) and " + ranked[2].geo + " (" + fmt(ranked[2].v) + "%). " + ranked.length + " states reported for that year.",
      src: "MoSPI, state domestic product (base 2011-12)" });
  }
  // 4. Jobs: unemployment across states (latest PLFS year)
  const ur = st.filter((r) => r.ind === "Unemployment rate" && r.geo !== "All India");
  const uy = uniq(ur.map((r) => r.p)).sort().pop();
  const iu = latestOf(macro.filter((r) => r.ind === "Unemployment rate" && r.geo === "All India"));
  if (uy) {
    const rk = ur.filter((r) => r.p === uy).sort((a, b) => b.v - a.v);
    if (rk.length > 5) {
      const hi = rk[0], lo = rk[rk.length - 1];
      out.push({ kicker: "Jobs", bars: rk.slice(0, 8).map((r) => ({ label: r.geo, v: r.v })), unit: "%", page: "states", preset: "Unemployment",
        title: hi.geo + " had the highest unemployment rate in " + uy,
        text: fmt(hi.v) + "% of " + poss(hi.geo) + " labour force was unemployed in " + uy + ", against " + (iu ? fmt(iu.v) + "% nationally" : "the national rate") + " and " + fmt(lo.v) + "% in " + lo.geo + ", the lowest. Figures are for people aged 15 and over, by usual status.",
        src: "MoSPI, Periodic Labour Force Survey" });
    }
  }
  // 5. Energy: power output and the renewable share of its growth
  try {
    const en = await loadPage("energy");
    const pw = ser((r) => r.ds === "iip" && /growth/.test(r.ind) && r.seg === "Electricity", en);
    const re = ser((r) => r.ds === "iip" && /growth/.test(r.ind) && r.seg === "Renewable Electricity", en);
    const nr = ser((r) => r.ds === "iip" && /growth/.test(r.ind) && r.seg === "Non-Renewable Electricity", en);
    if (pw.length > 3) {
      const l = pw[pw.length - 1], lr = re.find((r) => r.p === l.p), ln = nr.find((r) => r.p === l.p);
      const avg = pw.slice(-13, -1).reduce((t, r) => t + r.v, 0) / Math.min(12, pw.length - 1);
      out.push({ kicker: "Energy", rows: pw.slice(-12), unit: "%", page: "energy", preset: "Power output growth",
        title: "Power generation " + (l.v >= 0 ? "grew " : "fell ") + fmt(Math.abs(l.v)) + "% in " + periodLabel(l.p, "Monthly"),
        text: "Electricity output was " + fmt(Math.abs(l.v)) + "% " + (l.v >= 0 ? "higher" : "lower") + " than a year earlier, " + (l.v > avg ? "above" : "below") + " its 12-month average of " + fmt(Math.round(avg * 10) / 10) + "%." +
          (lr && ln ? " Renewable generation " + (lr.v >= 0 ? "rose " : "fell ") + fmt(Math.abs(lr.v)) + "%, against " + (ln.v >= 0 ? "a rise of " : "a fall of ") + fmt(Math.abs(ln.v)) + "% for coal, gas and other sources." : ""),
        src: "MoSPI, Index of Industrial Production" });
    }
  } catch (e) { /* energy file unavailable */ }
  // 6. State spotlight: a different state each day
  try {
    const S = await stateData();
    const pool = S.states.filter((n) => S.metrics.find((m) => m.key === "growth").get(n) && S.metrics.find((m) => m.key === "pcnsdp").get(n));
    if (pool.length) {
      const n = pool[Math.floor(Date.now() / 864e5) % pool.length];
      const M = (k) => S.metrics.find((m) => m.key === k);
      const g = M("growth").get(n), pc = M("pcnsdp").get(n), gr = S.ranks.growth, pr = S.ranks.pcnsdp;
      const rows = (S.by.get(n) || []).filter((r) => r.ind === "GSDP Growth Rate (constant prices)").sort((a, b) => a.p < b.p ? -1 : 1).slice(-10);
      // the human development indicator where the state does best relative to others
      const hdBest = S.metrics.filter((m) => m.group.startsWith("Human") && S.ranks[m.key].of.get(n)).sort((a, b) => S.ranks[a.key].of.get(n) / S.ranks[a.key].n - S.ranks[b.key].of.get(n) / S.ranks[b.key].n)[0];
      const hdTxt = hdBest ? " On human development it does best on " + hdBest.label.toLowerCase() + " (" + fmtMetric(hdBest, hdBest.get(n).v) + ", " + ordinal(S.ranks[hdBest.key].of.get(n)) + " of " + S.ranks[hdBest.key].n + ")." : "";
      out.push({ kicker: "State spotlight", rows: rows.map((r) => ({ ...r, f: "Annual" })), unit: "%", page: "state", href: "#/state?n=" + encodeURIComponent(n),
        title: n + ": " + fmt(g.v) + "% growth, " + ordinal(gr.of.get(n)) + " of " + gr.n + " states",
        text: poss(n) + " economy grew " + fmt(g.v) + "% in real terms in " + g.p + ". Its per capita income of " + fmtMetric(M("pcnsdp"), pc.v) + " ranks " + ordinal(pr.of.get(n)) + " of " + pr.n + "." + hdTxt,
        src: "MoSPI state accounts; Harvard India Policy Insights" });
    }
  } catch (e) { /* state data unavailable */ }
  // 7. Rural consumer confidence
  try {
    const sv = await loadPage("surveys");
    const csi = ser((r) => r.ds === "ccs_rural" && r.ind === "Current Situation Index", sv);
    if (csi.length > 3) {
      const i = csi.length - 1, l = csi[i], yAgo = csi[Math.max(0, i - 6)], lo = sinceLabel(csi, i, false);
      out.push({ kicker: "Households", rows: csi, unit: "", page: "surveys", preset: "Rural confidence indices",
        title: "Rural households feel worse off than a year ago",
        text: "RBI's rural current situation index was " + fmt(l.v) + " in " + periodLabel(l.p, "Monthly") + ", down from " + fmt(yAgo.v) + " a year earlier and " + (lo ? "the lowest since " + periodLabel(lo.p, "Monthly") : "the lowest in this series") + ". Below 100 means more households say things have worsened than improved.",
        src: "RBI, Rural Consumer Confidence Survey" });
      if (l.v >= yAgo.v) out[out.length - 1].title = "Rural households feel better off than a year ago";
    }
  } catch (e) { /* surveys not available */ }
  return out;
}
function storyChart(s) {
  if (s.bars) return hdBars(s.bars, { name: s.title }, "mean", null);
  const periods = s.rows.map((r) => r.p);
  return chart(periods, [{ geo: s.kicker, seg: "", ind: s.title, unit: s.unit, ds: s.rows[0].ds, vals: Object.fromEntries(s.rows.map((r) => [r.p, r.v])) }], s.rows[0].f || "Monthly");
}
async function storyCard() {
  const stories = await buildStories();
  if (!stories.length) return null;
  const day = Math.floor(Date.now() / 864e5);
  let k = day % stories.length;
  const card = el("section", { class: "card story", "aria-label": "Chart of the day" });
  const draw = () => {
    const s = stories[k];
    const c = storyChart(s);
    const href = s.href || "#/" + s.page;
    card.replaceChildren(
      el("div", { class: "story-text" },
        el("div", { class: "story-kick" }, el("span", null, "Chart of the day · " + s.kicker), el("span", { class: "story-nav" },
          el("button", { type: "button", "aria-label": "Previous chart", onclick: () => { k = (k - 1 + stories.length) % stories.length; draw(); } }, "‹"),
          el("span", { class: "muted" }, (k + 1) + " / " + stories.length),
          el("button", { type: "button", "aria-label": "Next chart", onclick: () => { k = (k + 1) % stories.length; draw(); } }, "›"))),
        el("h2", null, s.title), el("p", null, s.text),
        el("p", { class: "cite" }, "Source: " + s.src + "."),
        el("div", { class: "actions" }, el("a", { class: "more", href, onclick: () => { if (s.preset) G.pendingPreset = s.preset; } }, "Explore the data →"), c ? chartButtonsFor(c, s.title, "Source: " + s.src + ".") : null)),
      el("div", { class: "story-chart" }, c));
  };
  draw();
  return card;
}

/* ---------- "Sectors" dropdown in the tab bar ---------- */
const SECTOR_KEYS = Object.keys(PAGES).filter((k) => k !== "macro" && k !== "states" && !PAGES[k].nonSector);
function closeSectors() {
  const m = document.querySelector(".sec-menu");
  if (m) m.remove();
  const b = document.getElementById("sectors-btn");
  if (b) b.setAttribute("aria-expanded", "false");
}
function sectorsButton() {
  const btn = el("button", { type: "button", id: "sectors-btn", class: "tab-btn", "aria-haspopup": "true", "aria-expanded": "false", "aria-controls": "sec-menu" }, "Sectors");
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (document.querySelector(".sec-menu")) { closeSectors(); return; }
    btn.scrollIntoView({ block: "nearest", inline: "nearest" });
    const name = readHash().page;
    const menu = el("div", { class: "sec-menu", id: "sec-menu", role: "menu", onclick: (ev) => ev.stopPropagation() },
      SECTOR_KEYS.map((k) => {
        const a = el("a", { href: "#/" + k, role: "menuitem", onclick: () => closeSectors() }, PAGES[k].label);
        a.dataset.p = k;
        if (k === name) a.setAttribute("aria-current", "page");
        return a;
      }));
    // Fixed position so the tab bar's sideways scrolling on phones can't clip it.
    const r = btn.getBoundingClientRect();
    menu.style.top = Math.round(r.bottom) + "px";
    menu.style.left = Math.round(Math.max(8, Math.min(r.left, innerWidth - 228))) + "px";
    document.body.append(menu);
    secOpened = Date.now();
    btn.setAttribute("aria-expanded", "true");
    menu.querySelector("a").focus();
  });
  btn.addEventListener("keydown", (e) => { if (e.key === "ArrowDown" && !document.querySelector(".sec-menu")) { e.preventDefault(); btn.click(); } });
  return btn;
}
document.addEventListener("click", closeSectors);
document.addEventListener("keydown", (e) => {
  const m = document.querySelector(".sec-menu");
  if (!m) return;
  const items = [...m.querySelectorAll("a")], i = items.indexOf(document.activeElement);
  if (e.key === "Escape") { closeSectors(); document.getElementById("sectors-btn").focus(); }
  else if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length].focus(); }
  else if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
});
window.addEventListener("resize", closeSectors);
// Close if the tab bar is scrolled, but not from the scroll that brought the button into view.
let secOpened = 0;
document.getElementById("nav").addEventListener("scroll", () => { if (Date.now() - secOpened > 400) closeSectors(); }, { passive: true });

async function route() {
  peekStop();
  const { page, q } = readHash();
  const name = PAGES[page] || ["sources", "daily", "dashboard", "editor", "hd", "rankings", "state"].includes(page) ? page : "dashboard";
  closeSectors();
  document.querySelectorAll("nav a, .sec-menu a").forEach((a) => {
    if (a.dataset.p === name || (a.dataset.p === "states" && (name === "state" || name === "rankings"))) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  const sb = document.getElementById("sectors-btn");
  if (sb) sb.classList.toggle("current", SECTOR_KEYS.includes(name));
  const cur = SECTOR_KEYS.includes(name) ? sb : document.querySelector('#nav a[aria-current="page"]');
  if (cur) { const bar = document.getElementById("nav"); bar.scrollLeft = Math.max(0, cur.offsetLeft - (bar.clientWidth - cur.offsetWidth) / 2); }
  try {
    if (name === "sources") showSources();
    else if (name === "daily") { await loadPicks(); showDaily(q); }
    else if (name === "editor") { await loadPicks(); showEditor(); }
    else if (name === "hd") await showHd(q);
    else if (name === "rankings") await showRankings(q);
    else if (name === "state") await showStateProfile(q);
    else if (name === "dashboard") { await loadPicks(); await showHome(); peekStart(); }
    else await showData(name, q);
  } catch (e) {
    document.getElementById("app").replaceChildren(el("p", { class: "empty" }, "Couldn't load this page: " + e.message));
  }
  // Replay the page's entrance: sections ease in one after another.
  const app = document.getElementById("app");
  app.classList.remove("enter"); void app.offsetWidth; app.classList.add("enter");
}

/* Secret mission control view: ?houston (before or after the #) opens it. */
function houstonWanted() {
  return new URLSearchParams(location.search).has("houston") || readHash().q.has("houston");
}

async function start() {
  if (houstonWanted()) { location.replace("houston.html"); return; }
  const nav = document.getElementById("nav");
  const link = (k, label) => { const a = el("a", { href: "#/" + k }, label); a.dataset.p = k; return a; };
  nav.append(link("daily", "Daily updates"), link("macro", PAGES.macro.label),
    link("states", PAGES.states.label), link("hd", "Human development"), link("surveys", "Surveys"), sectorsButton(), link("sources", "Sources"));
  try {
    [G.meta, G.news] = await Promise.all([getJSON("meta"), getJSON("news")]);
  } catch (e) {
    document.getElementById("app").replaceChildren(el("p", { class: "empty" }, "Data files are missing. Run the pipeline first. (" + e.message + ")"));
    return;
  }
  document.getElementById("stamp").textContent = "Refreshed " + new Date(G.news.updated).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  window.addEventListener("hashchange", () => {
    const h = readHash();
    // Profiles and rankings are one page each, so a new state or setting needs a redraw.
    if (!V || h.page !== V.page || (V.page === "state" && h.q.get("n") !== V.state)) route();
    else if (V.page === "dashboard" && peekWanted()) peekShow();  // ?mitron added without a reload
    if (houstonWanted()) location.replace("houston.html");
  });
  route();
}
start();
