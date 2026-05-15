"use client";

import { useEffect, useRef } from "react";
import { ADSENSE_CLIENT_ID } from "@/lib/site";

type Props = {
  slot: string;
  format?: "auto" | "fluid" | "rectangle" | "horizontal" | "vertical";
  layout?: string;
  responsive?: boolean;
  className?: string;
  label?: boolean;
};

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export default function AdSlot({
  slot,
  format = "auto",
  layout,
  responsive = true,
  className = "",
  label = true,
}: Props) {
  const ref = useRef<HTMLModElement>(null);

  useEffect(() => {
    if (!ADSENSE_CLIENT_ID) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // ignore
    }
  }, []);

  if (!ADSENSE_CLIENT_ID) {
    return (
      <div
        className={`my-6 border border-dashed border-rule text-center text-[11px] uppercase tracking-widest text-muted py-8 ${className}`}
      >
        Advertisement
      </div>
    );
  }

  return (
    <div className={`my-6 ${className}`}>
      {label ? (
        <div className="text-center text-[10px] uppercase tracking-widest text-muted mb-1">
          Advertisement
        </div>
      ) : null}
      <ins
        ref={ref}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={slot}
        data-ad-format={format}
        data-ad-layout={layout}
        data-full-width-responsive={responsive ? "true" : "false"}
      />
    </div>
  );
}
