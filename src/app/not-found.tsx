import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-24 text-center">
      <div className="kicker text-muted mb-3">404</div>
      <h1 className="headline text-4xl md:text-5xl mb-4">Page not found</h1>
      <p className="dek mb-8">
        The story you&rsquo;re looking for may have been moved or never existed.
      </p>
      <Link href="/" className="underline text-accent">
        Return to the homepage
      </Link>
    </div>
  );
}
