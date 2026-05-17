const COLORS: Record<string, string> = {
  queued: "bg-gray-100 text-gray-700",
  running: "bg-blue-100 text-blue-800",
  succeeded: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-gray-200 text-gray-700",
  draft: "bg-gray-100 text-gray-700",
  scheduled: "bg-yellow-100 text-yellow-800",
  published: "bg-green-100 text-green-800",
  archived: "bg-gray-200 text-gray-700",
  breaking: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
  featured: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200",
};

export default function StatusPill({ status }: { status: string }) {
  const cls = COLORS[status] ?? "bg-gray-100 text-gray-700";
  return (
    <span
      className={`inline-block text-[10px] uppercase tracking-widest px-2 py-0.5 font-bold ${cls}`}
    >
      {status}
    </span>
  );
}
