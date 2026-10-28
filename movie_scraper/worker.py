from __future__ import annotations
import argparse
import json
import logging
import random
import time
from datetime import datetime, timezone
from pathlib import Path
import httpx
from . import config
from .adapters import collect
from .store import Store

logging.basicConfig(level=getattr(logging, config.LOG_LEVEL.upper(), logging.INFO),
                    format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("movie_scraper")

def load_registry() -> list[dict]:
    with open(config.REGISTRY_PATH, encoding="utf-8") as f:
        return json.load(f).get("sources", [])

def run_source(client: httpx.Client, store: Store, source: dict) -> int:
    started = datetime.now(timezone.utc)
    try:
        records = collect(client, source)
        counts = {"inserted": 0, "updated": 0, "seen": 0, "skipped": 0}
        for record in records:
            status = store.upsert(record)
            counts[status] = counts.get(status, 0) + 1
        store.mark_source_run(source["id"], status="ok", last_success_at=started,
                              last_error=None, fetched=len(records), counts=counts)
        log.info("source=%s fetched=%d counts=%s", source["id"], len(records), counts)
        return 0
    except Exception as exc:
        store.mark_source_run(source["id"], status="error", last_attempt_at=started,
                              last_error=str(exc)[:1000])
        log.exception("source=%s failed", source.get("id"))
        return 1

def main():
    parser = argparse.ArgumentParser(description="Global movie release ingestion worker")
    parser.add_argument("--once", action="store_true", help="run each enabled source once")
    args = parser.parse_args()
    store = Store(config.MONGODB_URI, config.MONGODB_DATABASE)
    last_run: dict[str, float] = {}
    try:
        with httpx.Client(timeout=config.REQUEST_TIMEOUT_SECONDS,
                          headers={"User-Agent": config.USER_AGENT},
                          follow_redirects=True) as client:
            while True:
                now = time.monotonic()
                for source in load_registry():
                    if not source.get("enabled", False):
                        continue
                    interval = max(60, int(source.get("interval_seconds", config.DEFAULT_POLL_SECONDS)))
                    if args.once or now - last_run.get(source["id"], 0) >= interval:
                        # Bounded retries with exponential backoff and jitter.
                        for attempt in range(config.MAX_RETRIES):
                            if run_source(client, store, source) == 0:
                                break
                            if attempt + 1 < config.MAX_RETRIES:
                                delay = min(60 * (2 ** attempt), 900) + random.random()
                                log.warning("retrying source=%s in %.1fs", source["id"], delay)
                                time.sleep(delay)
                        last_run[source["id"]] = time.monotonic()
                if args.once:
                    break
                time.sleep(5)
    finally:
        store.close()

if __name__ == "__main__":
    main()
