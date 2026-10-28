# Global Movie & OTT Tracker — Scraper

Python ingestion worker for a multilingual worldwide movie and OTT release tracker, using MongoDB Atlas.

## Included
- TMDB upcoming-movie API adapter, configured for US, India and UK.
- RSS/Atom, JSON API and permitted public HTML adapters, configurable in `source_registry.json`.
- Unicode-aware title normalization for multilingual scripts.
- Idempotent MongoDB upserts, source evidence and change-event history.
- Source-specific polling intervals, exponential retry backoff and per-source health records.
- Dockerfile and unit tests.

## Quick start
1. Copy `.env.example` to `.env`.
2. Set `MONGODB_URI` and `TMDB_READ_ACCESS_TOKEN`.
3. Install dependencies: `pip install -r requirements.txt`.
4. Run tests: `pytest -q`.
5. Run a single pass: `python -m movie_scraper.worker --once`.
6. Run continuous polling: `python -m movie_scraper.worker`.

## Data-source setup
Edit `source_registry.json`. RSS, JSON and HTML examples are disabled until replaced with sources you are authorized to access. Configure each source's actual schema and CSS selectors. Avoid scraping login-gated or access-controlled content. Follow applicable terms, robots directives, rate limits, copyright restrictions and attribution requirements.

TMDB needs a Read Access Token from its developer settings. API coverage is not exhaustive; OTT availability and direct watch links require a separately licensed provider or official source adapters. This worker does not claim complete worldwide coverage.

## Data quality
- TMDB dates are stored as reported source data, not automatically labeled as officially confirmed.
- Non-API sources are stored with source URL and observation time.
- Conflicting dates need source-specific policies and, for high-impact changes, a review queue before public display.
- Multilingual normalization is conservative; similar names can still be distinct films. External IDs are preferred when available.

## MongoDB collections
- `movies`: normalized movie records and source evidence.
- `changeEvents`: discoveries and observed field changes.
- `sourceRuns`: last status and health of each source.

## Deployment
Run as a long-lived container/worker (Dockerfile included). Keep the Next.js frontend on Vercel. Vercel Cron can invoke bounded jobs, but a continuously polling worker should run on a worker/container service. Store secrets only in environment variables; never commit `.env`.

## Important limitations
This is a foundation, not a finished global data product. Production hardening should add per-provider schemas, regional OTT availability integration, stronger entity resolution using original-language titles and release years, a review queue, source health alerts, link validation, retention controls, and integration tests against a staging MongoDB database.
