export function normalizeTitle(input: string): string {
  return input
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[\p{M}]/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function movieKey(title: string, year?: number, tmdbId?: string | number): string {
  if (tmdbId !== undefined && tmdbId !== "") return `tmdb:${tmdbId}`;
  return `title:${normalizeTitle(title)}:year:${year ?? "unknown"}`;
}
