type QA = { q: string; a: string };

// FAQ block rendered at the bottom of the article.
//
// FAQPage JSON-LD is emitted by the article page itself (see
// src/app/[category]/[slug]/page.tsx) so it isn't duplicated here — Google
// flags repeated structured data on the same page.
//
// Rendered as a real <details>/<summary> for accessibility + keyboard nav.
export default function ArticleFAQ({ items }: { items: QA[] }) {
  if (!items || items.length === 0) return null;

  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="mt-12 pt-8 border-t border-rule"
    >
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
