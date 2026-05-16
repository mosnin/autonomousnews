"use client";

import { useState } from "react";

type Props = {
  source: string;
  compact?: boolean;
  title?: string;
  blurb?: string;
};

export default function NewsletterSignup({
  source,
  compact = false,
  title = "Get the daily brief",
  blurb = "The top stories from Techno Times, delivered each morning.",
}: Props) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setMsg(null);
    try {
      const r = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      if (r.ok) {
        setState("ok");
        setMsg("Thanks — we'll be in touch.");
        setEmail("");
      } else {
        const j = await r.json().catch(() => ({}));
        setState("err");
        setMsg(j?.error ?? "Couldn't sign you up.");
      }
    } catch {
      setState("err");
      setMsg("Couldn't sign you up.");
    }
  }

  if (compact) {
    return (
      <form onSubmit={onSubmit} className="flex gap-2 font-sans">
        <label htmlFor="newsletter-email-compact" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email-compact"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          aria-label="Email address"
          className="flex-1 border border-rule bg-paper px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={state === "loading"}
          className="bg-ink text-paper px-4 py-2 text-sm uppercase tracking-kicker disabled:opacity-50"
        >
          {state === "loading" ? "…" : "Subscribe"}
        </button>
        {msg ? <span className="self-center text-xs text-muted">{msg}</span> : null}
      </form>
    );
  }

  return (
    <section className="border border-rule p-6 md:p-8 bg-wash">
      <div className="section-ribbon" />
      <h2 className="headline text-2xl md:text-3xl mb-2">{title}</h2>
      <p className="dek text-base mb-4">{blurb}</p>
      <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-2 font-sans">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          aria-label="Email address"
          className="flex-1 border border-rule bg-paper px-3 py-2.5 text-base"
        />
        <button
          type="submit"
          disabled={state === "loading"}
          className="bg-ink text-paper px-5 py-2.5 text-sm uppercase tracking-kicker disabled:opacity-50"
        >
          {state === "loading" ? "…" : "Subscribe"}
        </button>
      </form>
      {msg ? (
        <p className={`mt-3 text-sm ${state === "ok" ? "text-green-700" : "text-red-700"}`}>
          {msg}
        </p>
      ) : (
        <p className="mt-3 text-xs text-muted font-sans">
          Free. Unsubscribe any time. We do not share your address.
        </p>
      )}
    </section>
  );
}
