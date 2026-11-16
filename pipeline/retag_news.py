#!/usr/bin/env python3
"""Re-apply sector tagging to stored developments after keywords change.

Feed exclusions drop items; otherwise tags are only added, never removed: stored items keep just a short snippet,
so the full release text that earned an existing tag is no longer available.
Feed default sectors are applied too, so a feed newly given a sector picks up
its history.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fetch_news as fn  # noqa: E402


def main():
    data = json.load(open(fn.OUT, encoding="utf8"))
    defaults = {f["name"]: f["default_sectors"] for f in fn.CFG["feeds"]}
    feeds = {f["name"]: f for f in fn.CFG["feeds"]}
    before = len(data["items"])
    data["items"] = [r for r in data["items"]
                     if not (r["publisher"] in feeds and fn.feed_excluded(feeds[r["publisher"]], r["title"]))]
    print("retag: dropped %d items now excluded by their feed" % (before - len(data["items"])))
    changed = 0
    for r in data["items"]:
        found = set(fn.classify(r["title"], r.get("snippet", ""))) | set(defaults.get(r["publisher"], []))
        if r["scope"] == "International":
            found.discard("macro")
        new = sorted(set(r["sectors"]) | found)
        if new != sorted(r["sectors"]):
            r["sectors"] = new
            changed += 1
    with open(fn.OUT, "w", encoding="utf8") as fh:
        json.dump(data, fh, ensure_ascii=False, separators=(",", ":"))
    print("retag: %d of %d items changed" % (changed, len(data["items"])))


if __name__ == "__main__":
    main()
