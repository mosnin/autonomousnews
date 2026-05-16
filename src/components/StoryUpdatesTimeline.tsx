type Update = { id: number; summary: string; created_at: string };

export default function StoryUpdatesTimeline({ updates }: { updates: Update[] }) {
  if (updates.length === 0) return null;
  return (
    <section aria-labelledby="story-updates-heading" className="mt-10 border-t border-rule pt-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="kicker text-ink">Story updates</span>
        <span className="text-[10px] uppercase tracking-kicker font-sans text-muted">
          {updates.length} entr{updates.length === 1 ? "y" : "ies"}
        </span>
      </div>
      <ol className="relative border-l-2 pl-5 space-y-5" style={{ borderColor: "var(--section)" }}>
        {updates.map((u) => (
          <li key={u.id} className="relative">
            <span
              className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full"
              style={{ background: "var(--section)" }}
              aria-hidden
            />
            <div className="byline text-[11px] uppercase tracking-kicker mb-1">
              {new Date(u.created_at).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </div>
            <p className="font-sans text-sm text-ink">{u.summary}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
