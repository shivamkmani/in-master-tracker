/* India Tracker: static front end. All text from data files is set with
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
    ],
  },
  energy: {
    label: "Energy", news: "energy",
    lede: "Oil, gas, coal and power: production and price indices, trade, value added by state, and developments in India and abroad.",
    caveat: "Physical volumes (crude and gas output, refinery throughput, power generation in units, installed capacity) aren't included yet: PPAC and CEA publish them outside MoSPI, so the IIP electricity and fuel-mineral indices are the closest monthly measures. State figures use a 2011-12 base. Refinery and power-plant factory data (ASI NIC 19 and 35) appears after the next full ASI run.",
    presets: [
      ["Power output growth", { ds: ["iip"], ind: /IIP growth/, seg: /Electricity/, freq: "Monthly" }],
      ["Renewable vs other power", { ds: ["iip"], ind: /IIP index/, seg: /Renewable Electricity$/, freq: "Monthly" }],
      ["Fuel and power prices", { ds: ["wpi"], seg: /^(Fuel & Power|Mineral Oils|Coal and Lignite|Electricity)$/, freq: "Monthly" }],
      ["Oil and coal trade", { ds: ["rbi_commodity"], freq: "Annual" }],
      ["Utilities GVA by state", { ds: ["gsva"], ind: /constant/, seg: /^Electricity/, freq: "Annual" }],
      ["Mining GVA by state", { ds: ["gsva"], ind: /constant/, seg: /^Mining/, freq: "Annual" }],
      ["Household fuel inflation", { ds: ["cpi"], ind: /CPI inflation/, freq: "Monthly" }],
      ["Refining GVA by state", { ds: ["asi"], ind: /^Gross Value Added$/, seg: /^NIC 19:/, freq: "Annual" }],
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

const MONTHLY = new Set(["cpi", "wpi", "iip", "isp", "rbi_trade", "rbi_fx"]);
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
  const r = await fetch("data/" + name + ".json");
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
    svg.append(s("path", { d, fill: "none", stroke: se.color, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }));
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
  return wrap;
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
  const csv = el("button", { type: "button", onclick: () => download("india-tracker-" + V.page + ".csv", delimited(",")) }, "Download CSV");
  const xl = el("button", { type: "button", onclick: (e) => copy(delimited("\t"), e.target) }, "Copy for Excel");
  const link = el("button", { type: "button", onclick: (e) => copy(location.href, e.target) }, "Copy link");
  const src = el("button", { type: "button", onclick: (e) => copy(cite, e.target) }, "Copy source line");
  host.append(el("div", { class: "tfoot" },
    el("span", { class: "muted" }, rows.length > MAX_ROWS ? "Showing " + MAX_ROWS + " of " + rows.length + " rows. Exports include all." : rows.length + (rows.length === 1 ? " row" : " rows")),
    el("div", { class: "actions" }, csv, xl, src, link)));
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
function newsItems() {
  const n = V.news, sector = PAGES[V.page].news;
  const t = n.q.toLowerCase();
  const cutoff = n.days ? new Date(Date.now() - n.days * 864e5).toISOString().slice(0, 10) : "";
  return G.news.items.filter((r) => {
    if (sector && ![].concat(sector).some((x) => r.sectors.includes(x))) return false;
    if (n.scope !== "All" && r.scope !== n.scope) return false;
    if (n.scope === "State" && G.focus && !r.states.includes(G.focus)) return false;
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
    el("div", { class: "news-tools" }, scopes, search, el("div", { class: "actions" }, days, copyBtn)), list);
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

function tiles(rows, linked) {
  const out = [];
  for (const [label, test, suffix, preset] of TILE_DEFS) {
    const series = rows.filter((r) => r.geo === "All India" && test(r)).sort((a, b) => a.p < b.p ? -1 : 1);
    const r = series[series.length - 1];
    if (!r) continue;
    const big = suffix === "usd_m" ? (r.v < 0 ? "−" : "") + "$" + fmt(Math.round(Math.abs(r.v) / 100) / 10) + " bn" : fmt(r.v) + suffix;
    const kids = [el("b", null, big), el("span", null, label),
      linked ? spark(series.slice(-12).map((x) => x.v)) : null,
      el("small", null, periodLabel(r.p, r.f) + " · " + (G.meta.datasets[r.ds] || {}).publisher)];
    out.push(linked
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
  const nat = G.news.items.filter((r) => r.sectors.some((x) => MACRO_NEWS.includes(x)) && r.scope !== "State").slice(0, 8);
  const devs = el("aside", { class: "card", "aria-label": "Macro developments" },
    el("div", { class: "card-h" }, el("h2", null, "Macro developments"), el("span", { class: "muted" }, "Government and regulators")),
    nat.length
      ? el("ul", { class: "news flat" }, nat.map((r) => el("li", null,
          el("a", { href: r.url, target: "_blank", rel: "noopener" }, tidy(r.title)),
          el("small", null, dateLabel(r.date) + " · " + r.publisher))))
      : el("p", { class: "empty" }, "No recent macro developments."),
    el("div", { class: "card-f" }, more("#/macro", "All macro data and news"), more("#/finance", "Finance")));

  // One card per section: what's new there this week
  const weekAgo = localISO(new Date(Date.now() - 7 * 864e5));
  const sections = Object.entries(PAGES).filter(([k]) => k !== "macro").map(([k, P]) => {
    const sectors = P.news ? [].concat(P.news) : null;
    const rel = G.news.items.filter((r) => sectors ? r.sectors.some((x) => sectors.includes(x)) : r.scope === "State");
    const week = rel.filter((r) => r.date >= weekAgo).length;
    const top = rel[0];
    return el("a", { class: "sec-card", href: "#/" + k },
      el("b", null, P.label),
      el("span", { class: "muted" }, week ? week + (week === 1 ? " development" : " developments") + " this week" : "No new developments this week"),
      top ? el("small", null, tidy(top.title)) : null);
  });

  const updated = new Date(G.meta.updated).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  document.getElementById("app").replaceChildren(
    el("div", { class: "home-h" },
      el("h1", null, "Dashboard"),
      el("p", { class: "muted" }, longDate(today) + ". Official data refreshed " + updated + ".")),
    tiles(macro, true),
    el("div", { class: "grid" }, daily, devs),
    el("h2", { class: "sec-title" }, "Sectors and states"),
    el("section", { class: "sec-cards", "aria-label": "Sections" }, sections));
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
  V = { page, rows, preset: null, sort: null, dirty: false, sel: { freq: freqs[0], span: 12, ds: [], geo: [], seg: [], ind: [] }, news: { scope: "All", q: "", days: 30 } };
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
    page === "macro" ? tiles(rows, false) : null,
    el("div", { class: "focus" }, el("label", { htmlFor: "focus" }, "Focus state"), focusSel),
    el("div", { class: "grid" }, V.builder, V.newsHost),
  ].filter(Boolean));
  renderBuilder(); renderNews();
}

function showSources() {
  V = null;
  const m = G.meta;
  const stat = (s) => !s ? el("span", { class: "muted" }, "Not run") : s.ok ? el("span", { class: "ok" }, "Updated") : el("span", { class: "fail", title: s.error || "" }, "Failed, showing last good data");
  const groups = { nas: "National accounts", gsdp: "State accounts", gsva: "State accounts", cpi: "CPI", iip: "IIP", wpi: "WPI", isp: "ISP", plfs: "PLFS", asi: "ASI", rbi_trade: "RBI", rbi_fx: "RBI", rbi_commodity: "RBI" };
  const data = el("table", { class: "src-table" }, el("thead", null, el("tr", null, ["Dataset", "Publisher", "Frequency", "Status", "Notes"].map((t) => el("th", null, t)))),
    el("tbody", null, Object.entries(m.datasets).map(([k, d]) => el("tr", null, el("td", null, el("a", { href: d.url, target: "_blank", rel: "noopener" }, d.title)), el("td", null, d.publisher), el("td", null, d.frequency), el("td", null, stat(m.status[groups[k]])), el("td", null, d.note)))));
  const feeds = el("table", { class: "src-table" }, el("thead", null, el("tr", null, ["Feed", "Status", "Items read"].map((t) => el("th", null, t)))),
    el("tbody", null, Object.entries(G.news.status).map(([k, s]) => el("tr", null, el("td", null, k), el("td", null, s.ok ? el("span", { class: "ok" }, "Read") : el("span", { class: "fail", title: s.error || "" }, "Failed")), el("td", { class: "n" }, s.items ?? "–")))));
  document.getElementById("app").replaceChildren(
    el("h1", null, "Sources"),
    el("p", { class: "lede" }, "Every number and development comes from a government body or trade association. Last data refresh: " + new Date(m.updated).toLocaleString("en-GB") + "."),
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
    const grid = el("div", { class: "cal-grid", role: "grid" },
      ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => el("span", { class: "dow", "aria-hidden": "true" }, d)));
    for (let i = 0; i < startDow; i++) grid.append(el("span"));
    for (let d = 1; d <= days; d++) {
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

async function route() {
  peekStop();
  const { page, q } = readHash();
  const name = PAGES[page] || ["sources", "daily", "dashboard"].includes(page) ? page : "dashboard";
  document.querySelectorAll("nav a").forEach((a) => {
    if (a.dataset.p === name) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  try {
    if (name === "sources") showSources();
    else if (name === "daily") { await loadPicks(); showDaily(q); }
    else if (name === "dashboard") { await loadPicks(); await showHome(); peekStart(); }
    else await showData(name, q);
  } catch (e) {
    document.getElementById("app").replaceChildren(el("p", { class: "empty" }, "Couldn't load this page: " + e.message));
  }
}

async function start() {
  const nav = document.getElementById("nav");
  for (const [k, p] of [["dashboard", { label: "Dashboard" }], ["daily", { label: "Daily updates" }], ...Object.entries(PAGES), ["sources", { label: "Sources" }]]) {
    nav.append(el("a", { href: "#/" + k, "data-p": k }, p.label));
    nav.lastChild.dataset.p = k;
  }
  try {
    [G.meta, G.news] = await Promise.all([getJSON("meta"), getJSON("news")]);
  } catch (e) {
    document.getElementById("app").replaceChildren(el("p", { class: "empty" }, "Data files are missing. Run the pipeline first. (" + e.message + ")"));
    return;
  }
  document.getElementById("stamp").textContent = "Refreshed " + new Date(G.news.updated).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  window.addEventListener("hashchange", () => {
    if (!V || readHash().page !== V.page) route();
  });
  route();
}
start();
