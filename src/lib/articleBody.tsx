import type { ReactNode } from "react";
import Link from "next/link";
import { CATEGORIES } from "./taxonomy";
import { AUTHORS } from "./authors";

export type LinkTarget = {
  text: string;
  href: string;
  weight: number;
};

function buildTargets(): LinkTarget[] {
  const targets: LinkTarget[] = [];
  for (const a of AUTHORS) {
    targets.push({ text: a.name, href: `/by/${a.slug}`, weight: a.name.length * 10 });
  }
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
};

function autoLinkParagraph(
  text: string,
  state: { used: Set<string>; linksLeft: number; exclude: Set<string> }
): ReactNode[] {
  if (state.linksLeft <= 0) return [text];

  let nodes: (string | ReactNode)[] = [text];

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
