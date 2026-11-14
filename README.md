# India Tracker

A static site that brings together Indian macro, state and sector data with a daily list of developments. Data comes only from government bodies and trade associations.

## Sections

India macro, States, Semiconductors, Electronics, Logistics, Textiles, and Sources. Each data section has a table builder (filter, sort, chart, export) and a developments list filtered by international, national or state scope. Choosing a focus state filters both.

## How it works

| Part | What it does |
| --- | --- |
| `pipeline/fetch_data.py` | Pulls MoSPI and RBI series into `site/data/*.json`. Add `--skip-asi` to reuse ASI, which changes once a year. |
| `pipeline/fetch_news.py` | Reads PIB, RBI, trade association and international feeds, tags each item by sector and state. |
| `pipeline/backfill_news.py N` | Reads the PIB archive by ministry for the last N months. |
| `config/news.json` | Feeds, sector keywords and state aliases. Edit this to change what gets picked up. |
| `site/` | The website. Plain HTML, CSS and JavaScript, no build step. |
| `.github/workflows/update.yml` | Refreshes daily at 07:00 IST and deploys to GitHub Pages. |

The pipeline needs Python 3.9+ and no packages.

## Run locally

```bash
python3 pipeline/fetch_news.py
python3 pipeline/fetch_data.py --skip-asi
python3 -m http.server 8765 --directory site
```

## Source rules

- Add only government, regulator, multilateral or trade association sources.
- Keep requests paced. MoSPI's API rate-limits bursts, so `pipeline/mospi.py` sends them one at a time.
- If a source fails, the last good data stays in place and the Sources page shows the failure.

## Known gaps

- No state-wise export data yet. NIRYAT wasn't reachable, so trade is national only.
- No state-wise FDI yet. DPIIT publishes it as PDFs.
- No port or air cargo volumes yet.
- SEMI blocks automated access and SIA has no feed, so neither is in the developments list.
- MoSPI's API has no GSDP or GSVA for Assam, Haryana or Nagaland.
- MoSPI's copy of RBI monthly trade and reserves data ended at June 2025 when this was built.
- India has no official semiconductor output series. NIC 261 is used as the closest proxy.
