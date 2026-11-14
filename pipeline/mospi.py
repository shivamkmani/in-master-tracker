"""Minimal client for MoSPI's public data server (mcp.mospi.gov.in) and REST API.

Standard library only so the pipeline runs anywhere without an install step.
Nothing about who is using this site is sent: the optional `user_query` field,
which MoSPI stores for reporting, is deliberately never populated.
"""
import json
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

UA = "Mozilla/5.0 (compatible; india-tracker/1.0)"
MCP_URL = "https://mcp.mospi.gov.in/"
REST_URL = "https://api.mospi.gov.in/api/"


# MoSPI's API is a shared public service and rate-limits bursts, so every
# request goes through one paced, sequential gate. Please keep this polite.
MIN_INTERVAL = 0.7
_gate = threading.Lock()
_last = [0.0]


class MospiError(RuntimeError):
    pass


def _pace():
    with _gate:
        wait = _last[0] + MIN_INTERVAL - time.time()
        if wait > 0:
            time.sleep(wait)
        _last[0] = time.time()


def _throttled(text):
    return any(s in text for s in ("too many", "Too Many", "429", "Max retries"))


def _post(body, timeout=90):
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        "User-Agent": UA,
    }
    req = urllib.request.Request(MCP_URL, json.dumps(body).encode(), headers)
    text = urllib.request.urlopen(req, timeout=timeout).read().decode()
    for line in text.splitlines():
        if line.startswith("data:"):
            return json.loads(line[5:])
    return json.loads(text) if text.strip() else None


def call(tool, retries=3, **arguments):
    """Call one tool on the MoSPI server and return its decoded result."""
    body = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {"name": tool, "arguments": arguments},
    }
    last = None
    for attempt in range(retries + 2):
        try:
            _pace()
            res = _post(body)
            text = res["result"]["content"][0]["text"]
            try:
                out = json.loads(text)
            except ValueError:
                out = {"error": text}
            if out.get("error") and _throttled(str(out["error"])):
                last = out["error"]
                time.sleep(20 * (attempt + 1))
                continue
            return out
        except (urllib.error.URLError, KeyError, TypeError, ValueError, OSError) as exc:
            last = exc
            time.sleep(2 * (attempt + 1))
    raise MospiError("%s failed: %s" % (tool, last))


def get_all(dataset, filters, page_size=200, max_pages=120):
    """Fetch every page for a filter set. Raises if the server reports an error."""
    rows, page = [], 1
    while page <= max_pages:
        q = {k: str(v) for k, v in filters.items()}
        q.update(limit=str(page_size), page=str(page))
        res = call("get_data", dataset=dataset, filters=q)
        if res.get("error"):
            raise MospiError("%s %s: %s" % (dataset, filters, str(res["error"])[:200]))
        batch = res.get("data") or []
        rows.extend(batch)
        meta = res.get("meta_data") or {}
        if page >= int(meta.get("totalPages") or 1) or not batch:
            return rows
        page += 1
    raise MospiError("%s %s: exceeded %d pages" % (dataset, filters, max_pages))


def rest(path, **query):
    """GET a REST endpoint directly; used for high-volume ASI pulls."""
    url = REST_URL + path + "?" + urllib.parse.urlencode(query)
    last = None
    for attempt in range(4):
        try:
            _pace()
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            return json.loads(urllib.request.urlopen(req, timeout=60).read())
        except (urllib.error.URLError, ValueError, OSError) as exc:
            last = exc
            time.sleep(15 * (attempt + 1))
    raise MospiError("%s failed: %s" % (url, last))
