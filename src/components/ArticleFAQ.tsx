type QA = { q: string; a: string };

// FAQ block rendered at the bottom of the article. Comes with FAQPage
// JSON-LD so Google can show the questions in the result snippet.
//
// Rendered as a real <details>/<summary> for accessibility + keyboard nav.
export default function ArticleFAQ({ items }: { items: QA[] }) {
  if (!items || items.length === 0) return null;

  const ld = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };

  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="mt-12 pt-8 border-t border-rule"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
      />
      <h2
        id="faq-heading"
        className="font-display font-bold text-2xl md:text-3xl mb-5"
      >
        Frequently asked questions
      </h2>
      <ul className="divide-y divide-rule">
        {items.map((it, i) => (
          <li key={i} className="py-3">
            <details>
              <summary className="cursor-pointer list-none flex items-start justify-between gap-3 text-base md:text-lg font-display font-bold">
                <span>{it.q}</span>
                <span aria-hidden className="shrink-0 text-muted">
                  +
                </span>
              </summary>
              <p className="mt-3 font-serif text-base leading-relaxed text-ink">
                {it.a}
              </p>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
