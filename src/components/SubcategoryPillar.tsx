import type { SubcategoryPillar as PillarRow } from "@/lib/supabase/types";
import { renderArticleBody } from "@/lib/articleBody";
import ArticleFAQ from "./ArticleFAQ";

type Props = {
  pillar: PillarRow;
  excludeHrefs: Set<string>;
};

// Evergreen 'everything you need to know about X' content rendered above
// the article grid on /<category>/<subcategory> pages.
//
// Lives in a collapsible <details> so the article grid stays close to the
// fold, but search engines see all the content unconditionally — Google
// crawls <details> contents fine.
export default function SubcategoryPillar({ pillar, excludeHrefs }: Props) {
  const hasKeyTerms = (pillar.key_terms ?? []).length > 0;
  const hasTimeline = (pillar.timeline ?? []).length > 0;
  const hasFAQ = (pillar.faq ?? []).length > 0;

  return (
    <section
      aria-labelledby="pillar-heading"
      className="mb-16 border border-rule bg-paper"
    >
      <div className="px-5 md:px-8 py-6 md:py-8 rule-bottom">
        <div className="section-ribbon" />
        <div className="kicker mb-2">Topic guide</div>
        <h2 id="pillar-heading" className="headline text-2xl md:text-4xl mb-3">
          {pillar.title}
        </h2>
        {pillar.dek ? (
          <p className="dek text-base md:text-lg max-w-3xl">{pillar.dek}</p>
        ) : null}
        {pillar.why_it_matters ? (
          <div className="mt-5 pt-5 border-t border-rule">
            <div className="kicker text-muted mb-1.5">Why it matters</div>
            <p className="font-serif text-base leading-relaxed">
              {pillar.why_it_matters}
            </p>
          </div>
        ) : null}
      </div>

      <details className="group">
        <summary className="px-5 md:px-8 py-4 cursor-pointer list-none flex items-center justify-between font-sans text-sm uppercase tracking-kicker hover:bg-wash">
          <span>Read the full guide</span>
          <span
            aria-hidden
            className="text-muted transition-transform group-open:rotate-45 text-2xl leading-none"
          >
            +
          </span>
        </summary>

        <div className="px-5 md:px-8 pb-8 pt-2">
          <div className="prose-article max-w-prose">
            <p className="lead">{pillar.overview}</p>
            {renderArticleBody(pillar.body, { excludeHrefs, maxLinks: 6 })}
          </div>

          {hasKeyTerms ? (
            <div className="max-w-prose mt-10 pt-6 border-t border-rule">
              <h3 className="font-display font-bold text-xl mb-4">Key terms</h3>
              <dl className="space-y-3">
                {(pillar.key_terms ?? []).map((kt) => (
                  <div key={kt.term}>
                    <dt className="font-display font-bold">{kt.term}</dt>
                    <dd className="font-serif text-sm leading-relaxed ml-0 mt-0.5">
                      {kt.definition}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

          {hasTimeline ? (
            <div className="max-w-prose mt-10 pt-6 border-t border-rule">
              <h3 className="font-display font-bold text-xl mb-4">Timeline</h3>
              <ol
                className="relative border-l-2 pl-5 space-y-4"
                style={{ borderColor: "var(--section)" }}
              >
                {(pillar.timeline ?? []).map((t, i) => (
                  <li key={i} className="relative">
                    <span
                      aria-hidden
                      className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full"
                      style={{ background: "var(--section)" }}
                    />
                    <div className="byline text-[11px] uppercase tracking-kicker mb-1">
                      {t.year}
                    </div>
                    <p className="font-serif text-sm">{t.event}</p>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          {hasFAQ ? (
            <div className="max-w-prose">
              <ArticleFAQ items={pillar.faq ?? []} />
            </div>
          ) : null}

          <div className="text-xs font-sans text-muted mt-10 pt-4 border-t border-rule">
            This topic guide is reviewed and refreshed weekly. Last updated{" "}
            {new Date(pillar.updated_at).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}.
          </div>
        </div>
      </details>
    </section>
  );
}
