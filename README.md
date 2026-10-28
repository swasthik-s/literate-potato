# Global Movie & OTT Tracker — Scraper

Python ingestion worker for a multilingual, worldwide movie and streaming availability tracker. Stores normalized records and evidence in MongoDB Atlas.

## Current capabilities
- TMDB upcoming-movie ingestion across configured regions.
- RSS/Atom, JSON API and permitted public HTML adapters.
- Multilingual title normalization and conservative duplicate matching.
- Evidence-backed release claims, change history and idempotent MongoDB upserts.
- Source-specific polling intervals, retry handling and request pacing.

## Quick start
1. Copy `.env.example` to `.env`.
2. Set `MONGODB_URI` and `TMDB_READ_ACCESS_TOKEN`.
3. Install dependencies: `pip install -r requirements.txt`.
4. Run one pass: `python -m movie_scraper.worker --once`.
5. Run scheduled polling: `python -m movie_scraper.worker`.

Only configure sources that you are authorized to access. Respect source terms, robots policies where applicable, rate limits, and API attribution/licensing requirements. Never treat an unverified report as an official release date.

See the repository files and deployment notes for configuration.