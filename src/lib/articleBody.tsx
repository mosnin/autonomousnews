import type { ReactNode } from "react";
import Link from "next/link";
import { CATEGORIES } from "./taxonomy";

export type LinkTarget = {
  text: string;
  href: string;
  weight: number;
};

function buildTargets(): LinkTarget[] {
  const targets: LinkTarget[] = [];
  for (const c of CATEGORIES) {
    for (const s of c.subcategories) {
      targets.push({
        text: s.name,
        href: `/${c.slug}/${s.slug}`,
        weight: s.name.length * 5,
      });
    }
    targets.push({
      text: c.name,
      href: `/${c.slug}`,
      weight: c.name.length * 3,
    });
  }
  return targets.sort((a, b) => b.weight - a.weight);
}

const TARGETS = buildTargets();

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export type AutoLinkOptions = {
  excludeHrefs?: Set<string>;
  maxLinks?: number;
  // Body-image allow-list. If provided, an inline `![alt](url)` image is
  // only rendered when `url` is in the set; otherwise we drop the image
  // and keep just the alt text. This mirrors the link-validator policy on
  // the writer side: no surprise third-party images.
  //
  // When omitted (e.g. pillar rendering), all images are allowed through.
  allowedImageUrls?: Set<string>;
};

// Match inline markdown images of the form `![alt](url)`. Captured before
// the link renderer so we can policy-filter the URL against the article's
// allow-list.
const MD_IMAGE_RE = /!\[([^\]]*)\]\(([^)\s]+)\)/g;

// Match inline markdown links of the form `[label](href)`. Used to peel
// pre-authored links out of the paragraph text before the keyword auto-linker
// runs, so we can render them with the appropriate affordance:
//   - internal (href starts with "/") → next/Link, plain underline
//   - external (href starts with "http") → <a target="_blank">, plus ↗ glyph
//
// The keyword auto-linker only operates on the remaining string fragments,
// so it can never wrap text that's already inside a link.
const MD_LINK_RE = /\[([^\]]+)\]\(([^)\s]+)\)/g;

function renderMarkdownLinks(text: string): (string | ReactNode)[] {
  const out: (string | ReactNode)[] = [];
  const re = new RegExp(MD_LINK_RE.source, "g");
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const label = m[1];
    const href = m[2];
    if (href.startsWith("/")) {
      out.push(
        <Link
          key={`mdlink-${i}`}
          href={href}
          className="text-accent underline underline-offset-2 hover:opacity-80"
        >
          {label}
        </Link>
      );
    } else if (href.startsWith("http")) {
      out.push(
        <a
          key={`mdlink-${i}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline underline-offset-2 hover:opacity-80"
        >
          {label}
          <span aria-hidden="true">↗</span>
        </a>
      );
    } else {
      // Unknown scheme (mailto:, anchor, etc.) — render as a plain anchor
      // without external decoration.
      out.push(
        <a
          key={`mdlink-${i}`}
          href={href}
          className="text-accent underline underline-offset-2 hover:opacity-80"
        >
          {label}
        </a>
      );
    }
    last = m.index + m[0].length;
    i += 1;
  }
  if (last < text.length) out.push(text.slice(last));
  return out.length === 0 ? [text] : out;
}

// Replace `![alt](url)` tokens inline before any link/keyword processing.
// - If `allowedImageUrls` is undefined, every URL is allowed through and the
//   image is rendered.
// - If defined, only URLs in the set are rendered; others are silently
//   dropped (we keep the alt text in the paragraph stream so the sentence
//   doesn't crater).
function applyImagePolicy(
  text: string,
  allowed: Set<string> | undefined
): string {
  if (!text.includes("![")) return text;
  return text.replace(MD_IMAGE_RE, (_match, alt: string, url: string) => {
    if (!allowed) return `![${alt}](${url})`;
    if (allowed.has(url)) return `![${alt}](${url})`;
    return alt || "";
  });
}

function renderImagesAndLinks(text: string): (string | ReactNode)[] {
  // Two passes: image markdown first (so its inner `[alt](url)` portion
  // can't be picked up by the link regex), then plain links.
  const out: (string | ReactNode)[] = [];
  const re = new RegExp(MD_IMAGE_RE.source, "g");
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      // Run plain-link rendering on the inter-image text fragments.
      out.push(...renderMarkdownLinks(text.slice(last, m.index)));
    }
    out.push(
      // eslint-disable-next-line @next/next/no-img-element
      <img
        key={`mdimg-${i}`}
        src={m[2]}
        alt={m[1] ?? ""}
        loading="lazy"
        className="my-6 w-full h-auto"
      />
    );
    last = m.index + m[0].length;
    i += 1;
  }
  if (last === 0) {
    // No images — fall through to the existing link-only path.
    return renderMarkdownLinks(text);
  }
  if (last < text.length) {
    out.push(...renderMarkdownLinks(text.slice(last)));
  }
  return out;
}

function autoLinkParagraph(
  text: string,
  state: {
    used: Set<string>;
    linksLeft: number;
    exclude: Set<string>;
    allowedImageUrls: Set<string> | undefined;
  }
): ReactNode[] {
  // Image policy first — disallowed URLs are stripped to alt text BEFORE we
  // render anything, so they can never leak through downstream renderers.
  const policed = applyImagePolicy(text, state.allowedImageUrls);
  // Then peel any explicit markdown images + links out so the keyword
  // auto-linker can't wrap text that's already linked.
  const seeded: (string | ReactNode)[] = renderImagesAndLinks(policed);

  if (state.linksLeft <= 0) return seeded;

  let nodes: (string | ReactNode)[] = seeded;

  for (const t of TARGETS) {
    if (state.linksLeft <= 0) break;
    if (state.used.has(t.href)) continue;
    if (state.exclude.has(t.href)) continue;

    const re = new RegExp(`\\b${escapeRegex(t.text)}\\b`);

    const next: (string | ReactNode)[] = [];
    let inserted = false;
    for (const piece of nodes) {
      if (inserted || typeof piece !== "string") {
        next.push(piece);
        continue;
      }
      const m = piece.match(re);
      if (!m || m.index === undefined) {
        next.push(piece);
        continue;
      }
      const before = piece.slice(0, m.index);
      const matched = piece.slice(m.index, m.index + m[0].length);
      const after = piece.slice(m.index + m[0].length);
      if (before) next.push(before);
      next.push(
        <Link
          key={`${t.href}-${m.index}`}
          href={t.href}
          className="text-accent underline underline-offset-2 hover:opacity-80"
        >
          {matched}
        </Link>
      );
      if (after) next.push(after);
      inserted = true;
      state.used.add(t.href);
      state.linksLeft -= 1;
    }
    nodes = next;
  }

  return nodes;
}

export type Chapter = { id: string; text: string };

export function extractChapters(body: string): Chapter[] {
  const chapters: Chapter[] = [];
  for (const block of body.split(/\n\n+/)) {
    const trimmed = block.trim();
    if (trimmed.startsWith("## ")) {
      const text = trimmed.slice(3).trim();
      chapters.push({ id: slugify(text), text });
    }
  }
  return chapters;
}

export function renderArticleBody(
  body: string,
  options: AutoLinkOptions = {}
): ReactNode {
  const state = {
    used: new Set<string>(),
    linksLeft: options.maxLinks ?? 6,
    exclude: options.excludeHrefs ?? new Set<string>(),
    allowedImageUrls: options.allowedImageUrls,
  };

  const blocks: ReactNode[] = body.split(/\n\n+/).map((para, i) => {
    const trimmed = para.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("## ")) {
      const text = trimmed.slice(3).trim();
      return (
        <h2 key={i} id={slugify(text)}>
          {text}
        </h2>
      );
    }
    if (trimmed.startsWith("### ")) {
      return <h3 key={i}>{trimmed.slice(4).trim()}</h3>;
    }
    if (trimmed.startsWith(">> ")) {
      return (
        <p key={i} className="pull-quote">
          {trimmed.slice(3).trim()}
        </p>
      );
    }
    if (trimmed.startsWith("> ")) {
      return <blockquote key={i}>{trimmed.slice(2).trim()}</blockquote>;
    }
    return <p key={i}>{autoLinkParagraph(trimmed, state)}</p>;
  });

  return <>{blocks.filter(Boolean)}</>;
}
