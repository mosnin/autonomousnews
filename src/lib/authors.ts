// Single-editor masthead.
//
// Techno Times no longer maintains a roster of fictional reporter personas.
// Every article is researched and drafted by autonomous AI agents; one human
// editor on duty reviews the post-publish audit queue. That editor is
// described here.
//
// All fields are env-driven so an operator can identify themselves without
// editing source. When no NEXT_PUBLIC_EDITOR_* vars are set, the site renders
// with neutral placeholder copy — never a TODO and never an un-consented name.

export type Editor = {
  name: string;
  title: string;
  bio: string;
  link_x: string | null;
  link_linkedin: string | null;
  link_web: string | null;
};

export const EDITOR: Editor = {
  name: process.env.NEXT_PUBLIC_EDITOR_NAME ?? "Editor on Duty",
  title: process.env.NEXT_PUBLIC_EDITOR_TITLE ?? "Editor, Techno Times",
  bio:
    process.env.NEXT_PUBLIC_EDITOR_BIO ??
    "Reviews the post-publish audit queue and decides which articles need corrections or retractions.",
  link_x: process.env.NEXT_PUBLIC_EDITOR_LINK_X ?? null,
  link_linkedin: process.env.NEXT_PUBLIC_EDITOR_LINK_LINKEDIN ?? null,
  link_web: process.env.NEXT_PUBLIC_EDITOR_LINK_WEB ?? null,
};

// Short org byline for tight slots (OG cards, structured-data author).
export const ORG_BYLINE = "Techno Times Agents";

// The single byline string carried by every article and card on the site.
// Agents do the reporting and publishing; the editor reviews after the fact.
export const ARTICLE_BYLINE = `Reported by ${ORG_BYLINE} · Edited by ${EDITOR.name}`;
