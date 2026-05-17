import Link from "next/link";
import { CATEGORIES } from "@/lib/taxonomy";

const POPULAR_SLUGS = ["technology", "business", "science", "climate", "policy"];

export default function NotFound() {
  const popular = POPULAR_SLUGS
    .map((slug) => CATEGORIES.find((c) => c.slug === slug))
    .filter((c): c is (typeof CATEGORIES)[number] => Boolean(c));

  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <div className="kicker text-muted mb-3">404</div>
      <h1 className="headline text-4xl md:text-5xl mb-4">Page not found</h1>
      <p className="dek mb-8">
        The story you were looking for may have moved, expired, or never
        existed.
      </p>

      <form
        action="/search"
        method="get"
        className="flex items-stretch gap-2 max-w-md mx-auto mb-10"
        role="search"
      >
        <label htmlFor="not-found-search" className="sr-only">
          Search Techno Times
        </label>
        <input
          id="not-found-search"
          type="search"
          name="q"
          placeholder="Search Techno Times"
          className="flex-1 border border-rule px-3 py-2 text-sm bg-paper"
        />
        <button
          type="submit"
          className="bg-ink text-white text-sm px-4 py-2 hover:opacity-90"
        >
          Search
        </button>
      </form>

      <div className="border-t border-rule pt-6">
        <div className="kicker text-muted mb-3">Popular sections</div>
        <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 mb-6">
          {popular.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/${c.slug}`}
                className="text-accent underline underline-offset-4"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/" className="text-sm text-muted hover:text-ink">
          ← Return to the homepage
        </Link>
      </div>
    </div>
  );
}
