import Link from "next/link";

export default function TopicChips({ tags }: { tags: string[] }) {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="mt-10">
      <div className="kicker text-muted mb-2">Related topics</div>
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <Link
            key={t}
            href={`/topic/${encodeURIComponent(t.toLowerCase().replace(/\s+/g, "-"))}`}
            className="text-xs font-sans border border-rule px-2.5 py-1 hover:bg-wash hover:border-ink"
          >
            {t}
          </Link>
        ))}
      </div>
    </div>
  );
}
