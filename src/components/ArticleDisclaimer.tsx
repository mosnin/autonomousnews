import Link from "next/link";

type Props = {
  categorySlug: string;
  subcategorySlug: string | null;
  aiDisclosed: boolean;
};

// Categories where YMYL-style disclaimers are required.
const HEALTH = new Set(["health"]);
const FINANCE_CATS = new Set(["business"]);
const FINANCE_SUBS = new Set(["personal-finance", "markets"]);
const POLITICS = new Set(["politics"]);

function noticesFor(
  categorySlug: string,
  subcategorySlug: string | null
): string[] {
  const notices: string[] = [];
  if (HEALTH.has(categorySlug)) {
    notices.push(
      "This article is for general information only and is not a substitute for medical advice, diagnosis or treatment. Always consult a qualified healthcare professional with questions about your health."
    );
  }
  if (
    FINANCE_CATS.has(categorySlug) &&
    subcategorySlug != null &&
    FINANCE_SUBS.has(subcategorySlug)
  ) {
    notices.push(
      "This article is reporting, not financial advice. Markets are volatile and the value of investments can fall as well as rise. Consult a licensed financial professional before making investment decisions."
    );
  }
  if (POLITICS.has(categorySlug)) {
    notices.push(
      "We aim to cover politics neutrally. Where opinions appear they are attributed; they do not represent the views of Techno Times."
    );
  }
  return notices;
}

export default function ArticleDisclaimer({
  categorySlug,
  subcategorySlug,
  aiDisclosed,
}: Props) {
  const notices = noticesFor(categorySlug, subcategorySlug);
  if (notices.length === 0 && !aiDisclosed) return null;

  return (
    <aside className="mt-8 border-t border-rule pt-4 text-xs text-muted space-y-2">
      {notices.map((n) => (
        <p key={n}>{n}</p>
      ))}
      {aiDisclosed ? (
        <p>
          This article was drafted with the assistance of AI and reviewed before
          publication.{" "}
          <Link href="/about-our-ai" className="underline">
            Read about how we work.
          </Link>
        </p>
      ) : null}
    </aside>
  );
}
