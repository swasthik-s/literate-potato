# ReelRadar — Global Movie & OTT Tracker

Next.js + TypeScript on Vercel, with MongoDB Atlas. No Python or Streamlit runtime.

## Included in this starter
- Next.js App Router homepage and movie listing.
- MongoDB Atlas connection and indexes.
- Protected `GET /api/cron/ingest` route for scheduled ingestion.
- Browser-based admin import console at `/admin/import`, protected by a separate `ADMIN_SECRET`.
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
- `CRON_SECRET`: long random secret used to protect the scheduled ingestion route.
- `ADMIN_SECRET`: a different long random secret for the browser admin import page.
- `MOVIE_REGIONS`: optional region list; edit `src/lib/sources/registry.ts` to change sources.

## Browser import
1. Add `ADMIN_SECRET` to Vercel Project Settings → Environment Variables for Production.
2. Generate a strong random secret, distinct from `CRON_SECRET`, MongoDB credentials and TMDB credentials.
3. Redeploy after saving environment variables.
4. Open `/admin/import` on your deployed domain, enter the admin secret, and click **Start movie import**.
5. Review each source's status and number of fetched records. The secret is posted to the server endpoint and is not included in the URL.

The existing scheduled route remains protected separately by `CRON_SECRET`. Do not commit real secrets to GitHub or paste them into public chats.

## Vercel deployment
1. Import this GitHub repository into Vercel.
2. Add the environment variables above in Project Settings.
3. Deploy. Vercel Cron calls `/api/cron/ingest` using the configured cron authorization mechanism where supported; the route also checks `Authorization: Bearer $CRON_SECRET`.
4. Verify the first run in Vercel function logs and MongoDB Atlas.

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
