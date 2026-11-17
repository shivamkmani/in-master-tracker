# India Master Tracker

A static site that brings together Indian macro, state and sector data with a daily list of developments. Data comes only from government bodies and trade associations.

## Sections

Human development (35 SDG indicators by state, district and village), Dashboard (the landing page: headline macro figures, the latest daily picks, recent macro developments and a card per section; the site title returns here), Daily updates, India macro, States, Semiconductors, Electronics, Logistics, Textiles, Pharma, Energy, Finance, and Sources.

Daily updates shows the articles hand-picked for the day, with a calendar for past days and a search across every title. It is filled from the running updates document (see `picks/README.md`).

Each data section has a table builder (filter, sort, chart, export) and a developments list filtered by international, national or state scope. Choosing a focus state filters both.

## How it works

| Part | What it does |
| --- | --- |
| `pipeline/fetch_data.py` | Pulls MoSPI and RBI series into `site/data/*.json`. Add `--skip-asi` to reuse ASI, which changes once a year. |
| `pipeline/fetch_news.py` | Reads PIB, RBI, trade association and international feeds, tags each item by sector and state. |
| `pipeline/backfill_news.py N` | Reads the PIB archive by ministry for the last N months. |
| `pipeline/fetch_sdg.py` | Builds the Human development page data from Harvard's India Policy Insights SDG estimates (CC0): `site/data/hd.json` plus one village file per district in `site/data/hd/v/`. Runs only when the workflow is started with "Human development only". |
| `pipeline/import_picks.py` | Reads the daily updates document (`.docx` in `picks/`) and editor submissions (`picks/inbox/*.json`, written by the site's `#/editor` page) into `site/data/picks.json`. `--dry-run` previews it. |
| `pipeline/retag_news.py` | Re-applies sector tags to stored developments after `config/news.json` keywords change. |
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

- Official developments come only from government, regulator, multilateral or trade association sources.
- News outlet feeds (`type: "News outlet"` in `config/news.json`) store only the headline, outlet, date and link. The feed summary is read to tag sectors and states but is never stored or shown, and items drop off after 90 days. Set `"enabled": false` on a feed to stop using it. Check each outlet's RSS terms before adding it.
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
- Finance has no bank credit, deposit or interest rate series yet. RBI publishes these on its own database (DBIE), which the pipeline does not read.
- ASI returns no data for power plants (NIC 35), so Energy has refinery (NIC 19) factory data only.
- IMF and OPEC block automated access to their news feeds.
- Energy has no physical volumes yet (crude and gas output, refinery throughput, power generation, capacity). PPAC and CEA publish these outside MoSPI.
