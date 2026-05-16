// Pulsing red 'LIVE' chip used on cards + headers for developing stories.
export default function LiveBadge({ size = "md" }: { size?: "sm" | "md" }) {
  const padding = size === "sm" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]";
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${padding} bg-red-600 text-white font-sans font-bold uppercase tracking-kicker rounded-sm`}
      aria-label="Live story"
    >
      <span className="relative inline-flex">
        <span className="absolute inline-flex h-2 w-2 rounded-full bg-white opacity-75 animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
      </span>
      Live
    </span>
  );
}
