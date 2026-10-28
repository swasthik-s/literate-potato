import Link from "next/link";

type Movie = {
  movieKey: string; title: string; originalTitle?: string | null;
  overview?: string | null; posterPath?: string | null; releaseDate?: string | null;
  releaseCountry?: string | null; originalLanguage?: string | null;
};

async function getMovies(): Promise<Movie[]> {
  const uri = process.env.MONGODB_URI;
  if (!uri) return [];
  try {
    const { getDb } = await import("@/lib/mongodb");
    const db = await getDb();
    return await db.collection("movies").find({}, {
      projection: { _id: 0, movieKey: 1, title: 1, originalTitle: 1, overview: 1, posterPath: 1, releaseDate: 1, releaseCountry: 1, originalLanguage: 1 }
    }).sort({ releaseDate: 1 }).limit(18).toArray() as Movie[];
  } catch {
    return [];
  }
}

export default async function Home() {
  const movies = await getMovies();
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link href="/" className="text-xl font-black tracking-tight">REEL<span className="text-red-400">RADAR</span></Link>
        <nav className="flex gap-5 text-sm text-zinc-300"><Link href="/api/movies">API</Link><a href="#upcoming">Upcoming</a></nav>
      </header>
      <section className="mx-auto max-w-7xl px-6 pb-16 pt-14">
        <div className="max-w-3xl">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.28em] text-red-400">One world. Every screen.</p>
          <h1 className="text-5xl font-black leading-tight tracking-tight sm:text-7xl">Every release.<br/><span className="text-zinc-500">Everywhere.</span></h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-400">Track theatrical premieres, upcoming films and streaming releases across languages and countries. Find out where to watch when availability data is connected.</p>
          <form action="/" className="mt-8 flex max-w-xl gap-2">
            <input name="q" placeholder="Search movies, languages, countries…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-red-400"/>
            <button className="rounded-xl bg-red-400 px-5 font-bold text-black">Search</button>
          </form>
        </div>
      </section>
      <section id="upcoming" className="mx-auto max-w-7xl px-6 pb-20">
        <div className="mb-6 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.24em] text-red-400">The global calendar</p><h2 className="mt-2 text-3xl font-bold">Upcoming movies</h2></div><span className="text-sm text-zinc-500">{movies.length} titles loaded</span></div>
        {movies.length ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {movies.map((movie) => <article key={movie.movieKey} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
            <div className="aspect-[2/3] bg-zinc-900">{movie.posterPath ? <img src={`https://image.tmdb.org/t/p/w500${movie.posterPath}`} alt={movie.title} className="h-full w-full object-cover"/> : <div className="flex h-full items-center justify-center p-4 text-center text-zinc-600">Poster unavailable</div>}</div>
            <div className="p-3"><h3 className="line-clamp-2 font-semibold">{movie.title}</h3><p className="mt-2 text-xs text-zinc-500">{movie.releaseDate || "Date unannounced"}{movie.releaseCountry ? ` · ${movie.releaseCountry}` : ""}</p></div>
          </article>)}
        </div> : <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center"><h3 className="text-xl font-semibold">Your worldwide release catalog starts here</h3><p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-zinc-400">Configure MongoDB Atlas and the TMDB token, then run the protected ingestion cron to import the first upcoming titles. OTT availability requires a separate provider integration.</p></div>}
      </section>
      <footer className="border-t border-white/10 px-6 py-8 text-center text-xs text-zinc-600">ReelRadar · Movie metadata and regional availability depend on configured sources.</footer>
    </main>
  );
}
