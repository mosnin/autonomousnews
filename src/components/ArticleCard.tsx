import Link from "next/link";
import type { ArticleSummary } from "@/lib/articles";
import { findCategory } from "@/lib/taxonomy";
import { sectionColor } from "@/lib/sectionColors";
import LiveBadge from "./LiveBadge";
import type { CSSProperties } from "react";

type Variant = "hero" | "lead" | "default" | "compact" | "headline-only" | "river";

type Props = {
  article: ArticleSummary;
  variant?: Variant;
  showImage?: boolean;
  priority?: boolean;
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

function sectionVars(slug: string): CSSProperties {
  const c = sectionColor(slug);
  return {
    ["--section" as never]: c.bg,
    ["--section-text" as never]: c.fg,
  };
}

export default function ArticleCard({
  article,
  variant = "default",
  showImage = true,
  priority = false,
}: Props) {
  const href = articleHref(article);
  const kicker = kickerLabel(article);
  const css = sectionVars(article.category_slug);

  if (variant === "headline-only") {
    return (
      <Link href={href} style={css} className="story-link block py-3 rule-bottom">
        <div className="kicker mb-1">{kicker}</div>
        <h3 className="headline text-base md:text-lg">{article.title}</h3>
      </Link>
    );
  }

  if (variant === "compact") {
    return (
      <Link href={href} style={css} className="story-link block">
        <div className="kicker mb-1">{kicker}</div>
        <h3 className="headline text-lg md:text-xl mb-1">{article.title}</h3>
        {article.excerpt ? (
          <p className="dek text-sm hidden md:block">{article.excerpt}</p>
        ) : null}
        {article.read_minutes ? (
          <div className="byline mt-2">{article.read_minutes} min read</div>
        ) : null}
      </Link>
    );
  }

  if (variant === "river") {
    return (
      <Link href={href} style={css} className="story-link block grid grid-cols-[1fr_auto] md:grid-cols-[2fr_1fr] gap-4 md:gap-6 items-start">
        <div>
          <div className="kicker mb-2">{kicker}</div>
          <h3 className="headline text-xl md:text-2xl lg:text-3xl mb-2">{article.title}</h3>
          {article.dek ? (
            <p className="dek text-sm md:text-base md:line-clamp-2">{article.dek}</p>
          ) : null}
          <div className="byline mt-3 flex gap-3 uppercase tracking-kicker text-[11px]">
            <span>By {article.author_name}</span>
            {article.read_minutes ? <span>{article.read_minutes} min</span> : null}
          </div>
        </div>
        {showImage && article.cover_image_url ? (
          <div className="w-28 md:w-full aspect-square md:aspect-[4/3] overflow-hidden bg-wash">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.cover_image_url}
              alt={article.cover_image_alt ?? ""}
              className="w-full h-full object-cover"
              loading={priority ? "eager" : "lazy"}
            />
          </div>
        ) : null}
      </Link>
    );
  }

  if (variant === "hero") {
    return (
      <Link href={href} style={css} className="story-link block">
        {showImage && article.cover_image_url ? (
          <div className="aspect-[16/9] md:aspect-[21/9] overflow-hidden bg-wash mb-5 md:mb-7">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.cover_image_url}
              alt={article.cover_image_alt ?? ""}
              className="w-full h-full object-cover"
              loading={priority ? "eager" : "lazy"}
            />
          </div>
        ) : null}
        <div className="max-w-3xl">
          <div className="section-ribbon" />
          <div className="flex items-center gap-3 mb-3">
            <div className="kicker">{kicker}</div>
            {article.is_live ? <LiveBadge /> : null}
          </div>
          <h2 className="headline text-3xl sm:text-5xl md:text-6xl lg:text-7xl mb-4">
            {article.title}
          </h2>
          {article.dek ? (
            <p className="dek text-lg md:text-2xl mb-4 leading-snug">{article.dek}</p>
          ) : null}
          <div className="byline mt-2 flex flex-wrap gap-3 uppercase tracking-kicker text-[11px]">
            <span>By {article.author_name}</span>
            {article.read_minutes ? <span>{article.read_minutes} min read</span> : null}
          </div>
        </div>
      </Link>
    );
  }

  if (variant === "lead") {
    return (
      <Link href={href} style={css} className="story-link block">
        {showImage && article.cover_image_url ? (
          <div className="aspect-[16/9] overflow-hidden bg-wash mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={article.cover_image_url}
              alt={article.cover_image_alt ?? ""}
              className="w-full h-full object-cover"
              loading={priority ? "eager" : "lazy"}
            />
          </div>
        ) : null}
        <div className="section-ribbon" />
        <div className="kicker mb-2">{kicker}</div>
        <h2 className="headline text-2xl md:text-4xl mb-2">{article.title}</h2>
        {article.dek ? (
          <p className="dek text-base md:text-lg">{article.dek}</p>
        ) : null}
        <div className="byline mt-3 flex gap-3 uppercase tracking-kicker text-[11px]">
          <span>By {article.author_name}</span>
          {article.read_minutes ? <span>{article.read_minutes} min read</span> : null}
        </div>
      </Link>
    );
  }

  // default — image-forward card
  return (
    <Link href={href} style={css} className="story-link block group">
      {showImage && article.cover_image_url ? (
        <div className="aspect-[16/10] overflow-hidden bg-wash mb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={article.cover_image_url}
            alt={article.cover_image_alt ?? ""}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            loading={priority ? "eager" : "lazy"}
          />
        </div>
      ) : (
        <div className="section-ribbon" />
      )}
      <div className="flex items-center gap-2 mb-1.5">
        <div className="kicker">{kicker}</div>
        {article.is_live ? <LiveBadge size="sm" /> : null}
      </div>
      <h3 className="headline text-xl md:text-2xl mb-1.5">{article.title}</h3>
      {article.excerpt ? (
        <p className="dek text-sm md:text-base line-clamp-3">{article.excerpt}</p>
      ) : null}
      <div className="byline mt-3 flex gap-3 uppercase tracking-kicker text-[11px]">
        <span>By {article.author_name}</span>
        {article.read_minutes ? <span>{article.read_minutes} min</span> : null}
      </div>
    </Link>
  );
}
