# ReelRadar — Global Movie & OTT Tracker

Next.js + TypeScript on Vercel, with MongoDB Atlas. No Python or Streamlit runtime.

## Included in this starter
- Next.js App Router homepage and movie listing.
- MongoDB Atlas connection and indexes.
- Protected `GET /api/cron/ingest` route for scheduled ingestion.
- TMDB upcoming API adapter for multiple regions.
- RSS/Atom and permitted HTML adapters that can be configured in code.
- Unicode-aware title normalization, idempotent upserts, source evidence and change-event history.
- `GET /api/movies?q=...` JSON endpoint.
- Vercel Cron configuration.

## Local development
1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and fill in secrets.
4. Run `npm run dev`.
5. Run `npm run typecheck` and `npm run build`.

## Environment variables
- `MONGODB_URI`: MongoDB Atlas connection string.
- `MONGODB_DATABASE`: database name (defaults to `movie_tracker`).
- `TMDB_READ_ACCESS_TOKEN`: TMDB API read token.
- `CRON_SECRET`: long random secret used to protect the ingestion route.
- `MOVIE_REGIONS`: documented for region configuration; edit `src/lib/sources/registry.ts` to change sources.

## Vercel deployment
1. Import this GitHub repository into Vercel.
2. Add the environment variables above in Project Settings.
3. Deploy. Vercel Cron calls `/api/cron/ingest` using the configured cron authorization mechanism where supported; the route also checks `Authorization: Bearer $CRON_SECRET`.
4. Verify the first run in Vercel function logs and MongoDB Atlas.

The repository currently configures a 15-minute Cron schedule. Availability of frequent schedules depends on the Vercel plan. If the plan does not permit this schedule, change `vercel.json` to an allowed interval or use an external scheduler that calls the protected endpoint.

## Data integrity notes
- TMDB's upcoming endpoint is regional discovery, not a complete worldwide release feed.
- TMDB dates are stored as reported data; they are not automatically called officially confirmed.
- RSS and HTML adapters are generic examples and must be configured for each source's real structure. They are not enabled by default.
- OTT availability and direct watch URLs are not yet integrated; use a licensed provider or authorized official source.
- This starter uses TMDB IDs for authoritative movie identity. Items without IDs need stronger entity resolution and human review before they are merged into canonical movie records.
- Respect source terms, applicable robots directives, rate limits, copyright, attribution and licensing.

## Collections
- `movies`: canonical title and release records.
- `changeEvents`: discovery and field-change audit log.
- `sourceRuns`: last run status, timestamps and errors.

## Next production tasks
Add a licensed OTT availability provider, provider deep links by country, robust article-to-title matching, review queue for conflicting date claims, integration tests, alerting and pagination/search indexes for scale.
