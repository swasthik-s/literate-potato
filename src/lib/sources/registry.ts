export type SourceConfig =
  | { id: string; type: "tmdb_upcoming"; enabled: boolean; intervalSeconds: number; region: string; language: string; priority: number; maxPages?: number }
  | { id: string; type: "rss"; enabled: boolean; intervalSeconds: number; url: string; priority: number }
  | { id: string; type: "html"; enabled: boolean; intervalSeconds: number; url: string; itemSelector: string; titleSelector: string; dateSelector?: string; priority: number };

export const sourceRegistry: SourceConfig[] = [
  ...["US", "IN", "GB", "CA", "AU"].map((region): SourceConfig => ({
    id: `tmdb-upcoming-${region.toLowerCase()}`,
    type: "tmdb_upcoming",
    enabled: true,
    intervalSeconds: region === "US" ? 900 : 1800,
    region,
    language: "en-US",
    priority: 70,
    maxPages: 3
  })),
  // Add RSS/HTML sources only when you have permission to collect them.
  // { id: "studio-feed", type: "rss", enabled: false, intervalSeconds: 900, url: "https://example.com/feed.xml", priority: 90 }
];
