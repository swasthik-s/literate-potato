from __future__ import annotations
import json
from datetime import datetime, timezone
from urllib.parse import urlparse
import feedparser
import httpx
from bs4 import BeautifulSoup
from .config import REQUEST_TIMEOUT_SECONDS, USER_AGENT, TMDB_READ_ACCESS_TOKEN

def fetch(client: httpx.Client, url: str, headers: dict | None = None) -> httpx.Response:
    response = client.get(url, headers=headers or {})
    response.raise_for_status()
    return response

def tmdb_upcoming(client: httpx.Client, source: dict) -> list[dict]:
    if not TMDB_READ_ACCESS_TOKEN:
        raise RuntimeError("TMDB_READ_ACCESS_TOKEN is required for TMDB sources")
    headers = {"Authorization": f"Bearer {TMDB_READ_ACCESS_TOKEN}", "accept": "application/json"}
    records, page = [], 1
    # Bound each run; the next poll continues to refresh recent upcoming pages.
    while page <= int(source.get("max_pages_per_run", 3)):
        url = "https://api.themoviedb.org/3/movie/upcoming"
        response = client.get(url, params={"region": source.get("region", "US"),
            "language": source.get("language", "en-US"), "page": page}, headers=headers)
        response.raise_for_status()
        payload = response.json()
        for item in payload.get("results", []):
            title = item.get("title") or item.get("original_title")
            if not title:
                continue
            records.append({
                "external_ids": {"tmdb": str(item["id"])},
                "title": title,
                "original_title": item.get("original_title"),
                "original_language": item.get("original_language"),
                "overview": item.get("overview"),
                "poster_path": item.get("poster_path"),
                "release_date": item.get("release_date") or None,
                "release_country": source.get("region"),
                "media_type": "movie",
                "source_id": source["id"],
                "source_url": f"https://www.themoviedb.org/movie/{item['id']}",
                "source_type": "api",
                "source_priority": int(source.get("priority", 70)),
                "observed_at": datetime.now(timezone.utc),
                "date_status": "reported",
            })
        if page >= int(payload.get("total_pages", 1)):
            break
        page += 1
    return records

def rss_items(client: httpx.Client, source: dict) -> list[dict]:
    url = source.get("url", "")
    if not url.startswith("https://"):
        raise ValueError("RSS source must use HTTPS")
    response = fetch(client, url)
    parsed = feedparser.parse(response.text)
    output = []
    for entry in parsed.entries:
        title = (entry.get("title") or "").strip()
        link = entry.get("link")
        if not title or not link:
            continue
        output.append({
            "title": title, "release_date": None, "media_type": "unknown",
            "source_id": source["id"], "source_url": link, "source_type": "rss",
            "source_priority": int(source.get("priority", 30)),
            "observed_at": datetime.now(timezone.utc), "date_status": "unconfirmed",
            "summary": BeautifulSoup(entry.get("summary", ""), "html.parser").get_text(" ", strip=True)[:2000],
        })
    return output

def json_api_items(client: httpx.Client, source: dict) -> list[dict]:
    url = source.get("url", "")
    if not url.startswith("https://"):
        raise ValueError("JSON API source must use HTTPS")
    response = fetch(client, url)
    payload = response.json()
    path = source.get("items_path", "results").split(".")
    for key in path:
        payload = payload.get(key, []) if isinstance(payload, dict) else []
    if not isinstance(payload, list):
        raise ValueError("JSON items_path must resolve to a list")
    output = []
    for item in payload:
        title = item.get(source.get("title_field", "title"))
        if not title:
            continue
        output.append({
            "title": str(title),
            "release_date": item.get(source.get("date_field", "release_date")) or None,
            "media_type": item.get("media_type", "unknown"),
            "source_id": source["id"], "source_url": item.get("url") or url,
            "source_type": "json_api", "source_priority": int(source.get("priority", 40)),
            "observed_at": datetime.now(timezone.utc),
            "date_status": "reported" if item.get(source.get("date_field", "release_date")) else "unconfirmed",
        })
    return output

def html_items(client: httpx.Client, source: dict) -> list[dict]:
    url = source.get("url", "")
    if not url.startswith("https://"):
        raise ValueError("HTML source must use HTTPS")
    response = fetch(client, url)
    soup = BeautifulSoup(response.text, "html.parser")
    output = []
    for node in soup.select(source.get("item_selector", "article")):
        title_node = node.select_one(source.get("title_selector", "h2"))
        if not title_node:
            continue
        date_node = node.select_one(source.get("date_selector", "time"))
        date_value = None
        if date_node:
            date_value = date_node.get("datetime") or date_node.get_text(" ", strip=True) or None
        link_node = node.select_one("a[href]")
        link = link_node.get("href") if link_node else url
        if link.startswith("/"):
            parsed = urlparse(url)
            link = f"{parsed.scheme}://{parsed.netloc}{link}"
        output.append({
            "title": title_node.get_text(" ", strip=True), "release_date": date_value,
            "media_type": "unknown", "source_id": source["id"], "source_url": link,
            "source_type": "html", "source_priority": int(source.get("priority", 20)),
            "observed_at": datetime.now(timezone.utc),
            "date_status": "reported" if date_value else "unconfirmed",
        })
    return output

def collect(client: httpx.Client, source: dict) -> list[dict]:
    kind = source.get("type")
    if kind == "tmdb_upcoming":
        return tmdb_upcoming(client, source)
    if kind == "rss":
        return rss_items(client, source)
    if kind == "json_api":
        return json_api_items(client, source)
    if kind == "html":
        return html_items(client, source)
    raise ValueError(f"Unsupported source type: {kind}")
