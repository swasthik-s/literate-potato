from __future__ import annotations
from datetime import datetime, timezone
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import DuplicateKeyError
from .normalize import dedupe_key, normalize_title

class Store:
    def __init__(self, uri: str, database: str):
        if not uri:
            raise ValueError("MONGODB_URI is required")
        self.client = MongoClient(uri, serverSelectionTimeoutMS=10000, retryWrites=True)
        self.db = self.client[database]
        self.movies = self.db["movies"]
        self.events = self.db["changeEvents"]
        self.sources = self.db["sourceRuns"]
        self.movies.create_index([("dedupe_key", ASCENDING)], unique=True)
        self.movies.create_index([("title_normalized", ASCENDING)])
        self.movies.create_index([("release_date", ASCENDING), ("release_country", ASCENDING)])
        self.movies.create_index([("external_ids.tmdb", ASCENDING)], sparse=True)
        self.events.create_index([("movie_key", ASCENDING), ("observed_at", DESCENDING)])
        self.sources.create_index([("source_id", ASCENDING)], unique=True)

    def upsert(self, record: dict) -> str:
        title = (record.get("title") or "").strip()
        if not title:
            return "skipped"
        ext = record.get("external_ids") or {}
        year = None
        date = record.get("release_date")
        if isinstance(date, str) and len(date) >= 4 and date[:4].isdigit():
            year = int(date[:4])
        key = dedupe_key(title, year, ext.get("tmdb"))
        now = datetime.now(timezone.utc)
        existing = self.movies.find_one({"dedupe_key": key})
        payload = {
            **record, "dedupe_key": key, "title_normalized": normalize_title(title),
            "updated_at": now, "last_seen_at": now,
        }
        if existing is None:
            payload["created_at"] = now
            try:
                self.movies.insert_one(payload)
                self.events.insert_one({"movie_key": key, "event_type": "discovered",
                    "new_value": {"title": title, "release_date": date},
                    "source_id": record.get("source_id"), "source_url": record.get("source_url"),
                    "observed_at": now})
                return "inserted"
            except DuplicateKeyError:
                existing = self.movies.find_one({"dedupe_key": key})
        if existing:
            changed = {}
            for field in ("release_date", "release_country", "title", "date_status", "watch_url"):
                old, new = existing.get(field), record.get(field)
                if new is not None and new != old:
                    changed[field] = {"old": old, "new": new}
            # Do not replace a better-priority source's date with a lower-priority source.
            old_priority = int(existing.get("source_priority", 0))
            new_priority = int(record.get("source_priority", 0))
            if "release_date" in changed and new_priority < old_priority:
                payload.pop("release_date", None)
                changed.pop("release_date", None)
            if changed:
                self.events.insert_one({"movie_key": key, "event_type": "record_updated",
                    "changes": changed, "source_id": record.get("source_id"),
                    "source_url": record.get("source_url"), "observed_at": now})
            # Keep source evidence for each observation; never discard original IDs.
            old_sources = existing.get("source_evidence", [])
            evidence = {"source_id": record.get("source_id"), "source_url": record.get("source_url"),
                "source_type": record.get("source_type"), "priority": new_priority, "observed_at": now}
            update = {k: v for k, v in payload.items() if v is not None}
            update.pop("created_at", None)
            self.movies.update_one({"_id": existing["_id"]}, {"$set": update,
                "$addToSet": {"source_evidence": {"$each": [evidence]}}})
            return "updated" if changed else "seen"
        return "skipped"

    def mark_source_run(self, source_id: str, **fields):
        self.sources.update_one({"source_id": source_id},
            {"$set": {"source_id": source_id, "updated_at": datetime.now(timezone.utc), **fields}},
            upsert=True)

    def close(self):
        self.client.close()
