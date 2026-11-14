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
};

const MONTHLY = new Set(["cpi", "wpi", "iip", "isp", "rbi_trade", "rbi_fx"]);
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MAX_ROWS = 300;
const MAX_SERIES = 6;

const G = { meta: null, news: null, cache: {}, focus: "" };
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
  return { page: path || "macro", q: new URLSearchParams(query || "") };
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
      list.append(el("li", null, el("a", { href: r.url, target: "_blank", rel: "noopener" }, r.title),
        el("small", null, dateLabel(r.date) + " · " + r.publisher + place)));
    }
  }
  host.append(el("div", { class: "card-h" }, el("h2", null, "Developments"), count),
    el("div", { class: "news-tools" }, scopes, search, el("div", { class: "actions" }, days, copyBtn)), list);
  drawList();
}

/* ---------- headline tiles ---------- */
function latest(test) {
  const rows = V.rows.filter(test).sort((a, b) => a.p < b.p ? 1 : -1);
  return rows[0];
}
function tiles() {
  const defs = [
    ["GDP growth, real", (r) => /GDP Growth Rate \(constant/.test(r.ind) && r.f === "Annual", "%"],
    ["CPI inflation", (r) => r.ind.startsWith("CPI inflation") && r.seg === "CPI (General)", "%"],
    ["IIP growth", (r) => r.ind.startsWith("IIP growth") && r.seg === "General", "%"],
    ["Unemployment rate", (r) => r.ind === "Unemployment rate", "%"],
    ["Goods trade balance", (r) => /balance/i.test(r.ind) && r.ds === "rbi_trade", " US$ m"],
  ];
  const out = [];
  for (const [label, test, suffix] of defs) {
    const r = latest(test);
    if (r) out.push(el("div", { class: "tile" }, el("b", null, fmt(r.v) + suffix), el("span", null, label), el("small", null, periodLabel(r.p, r.f) + " · " + (G.meta.datasets[r.ds] || {}).publisher)));
  }
  return out.length ? el("section", { class: "tiles", "aria-label": "Headline indicators" }, out) : null;
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
    V.preset = P.presets[0][0];
    applyPreset(P.presets[0][1]);
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
    page === "macro" ? tiles() : null,
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

async function route() {
  const { page, q } = readHash();
  const name = PAGES[page] || page === "sources" ? page : "macro";
  document.querySelectorAll("nav a").forEach((a) => {
    if (a.dataset.p === name) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  try {
    if (name === "sources") showSources();
    else await showData(name, q);
  } catch (e) {
    document.getElementById("app").replaceChildren(el("p", { class: "empty" }, "Couldn't load this page: " + e.message));
  }
}

async function start() {
  const nav = document.getElementById("nav");
  for (const [k, p] of [...Object.entries(PAGES), ["sources", { label: "Sources" }]]) {
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
