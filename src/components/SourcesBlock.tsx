export default function SourcesBlock({ urls }: { urls: string[] }) {
  if (!urls || urls.length === 0) return null;
  return (
    <section className="mt-10 border-t border-rule pt-6">
      <div className="kicker text-muted mb-3">Sources</div>
      <ol className="list-decimal pl-5 space-y-1.5 font-sans text-sm">
        {urls.map((u) => {
          let host = u;
          try {
            host = new URL(u).host.replace(/^www\./, "");
          } catch {
            /* keep raw */
          }
          return (
            <li key={u}>
              <a
                href={u}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-accent underline break-all"
              >
                {host}
              </a>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
