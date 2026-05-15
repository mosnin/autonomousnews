import Link from "next/link";
import type { ArticleSummary } from "@/lib/articles";
import { findCategory } from "@/lib/taxonomy";

type Variant = "lead" | "default" | "compact" | "headline-only";

type Props = {
  article: ArticleSummary;
  variant?: Variant;
  showImage?: boolean;
};

function articleHref(article: ArticleSummary) {
  return `/${article.category_slug}/${article.slug}`;
}

function kickerLabel(article: ArticleSummary) {
  if (article.is_breaking) return "Breaking";
  const category = findCategory(article.category_slug);
  if (article.subcategory_slug && category) {
    const sub = category.subcategories.find(
      (s) => s.slug === article.subcategory_slug
    );
    if (sub) return sub.name;
  }
  return category?.name ?? "News";
}

export default function ArticleCard({
  article,
  variant = "default",
  showImage = true,
}: Props) {
  const href = articleHref(article);
  const kicker = kickerLabel(article);

  if (variant === "headline-only") {
    return (
      <Link href={href} className="story-link block py-3 rule-bottom">
        <div className="kicker mb-1">{kicker}</div>
        <h3 className="headline text-base md:text-lg">{article.title}</h3>
      </Link>
    );
  }

  if (variant === "compact") {
    return (
      <Link href={href} className="story-link block group">
        <div className="kicker mb-1">{kicker}</div>
        <h3 className="headline text-lg md:text-xl mb-1">{article.title}</h3>
        {article.excerpt ? (
          <p className="dek text-sm hidden md:block">{article.excerpt}</p>
        ) : null}
        {article.read_minutes ? (
          <div className="byline mt-2">{article.read_minutes} Min Read</div>
        ) : null}
      </Link>
    );
  }

  if (variant === "lead") {
    return (
      <Link href={href} className="story-link block group">
        {showImage && article.cover_image_url ? (
          <div className="aspect-[16/9] overflow-hidden bg-wash mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.cover_image_url}
              alt={article.cover_image_alt ?? ""}
              className="w-full h-full object-cover"
            />
          </div>
        ) : null}
        <div className="kicker mb-2">{kicker}</div>
        <h2 className="headline text-2xl md:text-4xl mb-2">{article.title}</h2>
        {article.dek ? (
          <p className="dek text-base md:text-lg">{article.dek}</p>
        ) : null}
        <div className="byline mt-3 flex gap-3">
          <span>By {article.author_name}</span>
          {article.read_minutes ? (
            <span>{article.read_minutes} Min Read</span>
          ) : null}
        </div>
      </Link>
    );
  }

  return (
    <Link href={href} className="story-link block group">
      {showImage && article.cover_image_url ? (
        <div className="aspect-[4/3] overflow-hidden bg-wash mb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={article.cover_image_url}
            alt={article.cover_image_alt ?? ""}
            className="w-full h-full object-cover"
          />
        </div>
      ) : null}
      <div className="kicker mb-1">{kicker}</div>
      <h3 className="headline text-xl md:text-2xl mb-1">{article.title}</h3>
      {article.excerpt ? (
        <p className="dek text-sm md:text-base">{article.excerpt}</p>
      ) : null}
      <div className="byline mt-2 flex gap-3">
        <span>By {article.author_name}</span>
        {article.read_minutes ? (
          <span>{article.read_minutes} Min Read</span>
        ) : null}
      </div>
    </Link>
  );
}
