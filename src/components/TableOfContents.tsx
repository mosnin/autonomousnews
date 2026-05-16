type Chapter = { id: string; text: string };

// Inline table of contents rendered above the article body. Lists every
// H2 (and the FAQ section when present). Anchors are slugified ids that
// match what renderArticleBody assigns to its <h2> elements.
//
// Showing a real, visible TOC also feeds Google's understanding of the
// article structure — it tends to appear in the result snippet as
// jump-to-section links when one of the chapters matches the query.
export default function TableOfContents({
  chapters,
  hasFAQ,
}: {
  chapters: Chapter[];
  hasFAQ: boolean;
}) {
  if (chapters.length === 0 && !hasFAQ) return null;

  const items = [
    ...chapters,
    ...(hasFAQ ? [{ id: "faq", text: "Frequently asked questions" }] : []),
  ];

  return (
    <nav
      aria-labelledby="toc-heading"
      className="my-8 border border-rule bg-wash px-5 py-4 font-sans"
    >
      <h2
        id="toc-heading"
        className="text-[11px] uppercase tracking-kicker font-bold mb-3"
        style={{ color: "var(--section)" }}
      >
        In this article
      </h2>
      <ol className="space-y-1.5 list-decimal list-inside marker:text-muted">
        {items.map((c) => (
          <li key={c.id}>
            <a
              href={`#${c.id}`}
              className="text-sm text-ink hover:text-accent underline-offset-2 hover:underline"
            >
              {c.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
