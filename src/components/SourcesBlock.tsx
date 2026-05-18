type StructuredSource = {
  title: string;
  publication: string;
  author?: string | null;
  url: string;
};

type Props = {
  // Legacy: flat list of URLs (older articles only have this).
  urls?: string[] | null;
  // Phase 8: structured citations from the writer pipeline.
  sources?: StructuredSource[] | null;
};

/**
 * Renders the "Sources" block at the end of an article.
 *
 * Prefers the structured `sources` (title + publication + url) when the
 * writer pipeline supplied it; falls back to the flat `urls` list (older
 * articles produced before the phase-8 writer rewrite).
 *
 * Rendered on the article page after the body and FAQ, before the
 * story-updates timeline.
 */
export default function SourcesBlock({ urls, sources }: Props) {
  const structured = (sources ?? []).filter((s) => s && s.url);
  const flat = (urls ?? []).filter(Boolean);

  if (structured.length === 0 && flat.length === 0) return null;

  return (
    <section className="mt-10 border-t border-rule pt-6">
      <div className="kicker text-muted mb-3">Sources</div>
      {structured.length > 0 ? (
        <ol className="list-decimal pl-5 space-y-2 font-sans text-sm">
          {structured.map((s) => (
            <li key={s.url}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-accent underline"
              >
                {s.publication || hostOf(s.url)}
              </a>
              {s.author ? (
                <span className="text-muted font-sans tracking-kicker text-xs uppercase ml-1">
                  {" "}— by {s.author}
                </span>
              ) : null}
              {s.title ? (
                <span className="text-muted"> — {s.title}</span>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <ol className="list-decimal pl-5 space-y-1.5 font-sans text-sm">
          {flat.map((u) => (
            <li key={u}>
              <a
                href={u}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-accent underline break-all"
              >
                {hostOf(u)}
              </a>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function hostOf(u: string) {
  try {
    return new URL(u).host.replace(/^www\./, "");
  } catch {
    return u;
  }
}
