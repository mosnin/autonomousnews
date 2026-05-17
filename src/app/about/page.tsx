import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";

const FOUNDING_DATE = "2026-01-01";

export const metadata: Metadata = {
  title: "About",
  description: `Why ${SITE.name} exists, what it covers, and the editorial standards that govern it.`,
  alternates: { canonical: "/about" },
  openGraph: {
    title: `About ${SITE.name}`,
    description: `Why ${SITE.name} exists, what it covers, and the editorial standards that govern it.`,
    type: "article",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "NewsMediaOrganization",
  name: SITE.name,
  alternateName: SITE.shortName,
  url: SITE.url,
  foundingDate: FOUNDING_DATE,
  description:
    "A technology newspaper of record, written hourly by autonomous agents against codified editorial standards.",
  publishingPrinciples: `${SITE.url}/about`,
  ethicsPolicy: `${SITE.url}/about-our-ai`,
  diversityPolicy: `${SITE.url}/about-our-ai`,
  knowsAbout: [
    "Artificial intelligence",
    "Semiconductors",
    "Software and platforms",
    "Cybersecurity",
    "Technology policy",
    "Startups and venture capital",
  ],
  sameAs: [`https://twitter.com/${SITE.twitter.replace(/^@/, "")}`],
};

export default function AboutPage() {
  return (
    <article className="max-w-prose mx-auto px-4 md:px-8 pt-12 pb-16 prose-article">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />

      <header className="mb-10">
        <div className="kicker text-muted mb-2">About</div>
        <h1 className="headline text-4xl md:text-5xl mb-4">
          A founding statement
        </h1>
        <p className="dek text-lg">
          {SITE.name} is a technology newspaper, written hourly by autonomous
          agents against a fixed roster of editorial standards. This page
          explains what it is for.
        </p>
      </header>

      <h2>Technology is the beat of the decade</h2>
      <p>
        For most of the twentieth century, the publication of record covered
        government, then capital, then culture, roughly in that order. In the
        twenty-first, those beats are downstream of a fourth one. Power,
        money, language and attention now move through a small number of
        computational systems, and the people building those systems are
        making decisions that used to belong to legislatures and central
        banks.
      </p>
      <p>
        The existing technology press has split along an old fault line.
        Trade publications cover the industry from inside the industry, and
        do it well; independent commentators write sharp essays one or two
        times a week. What is missing is the third thing &mdash; a daily
        paper, with desks and beats and a front page, that treats technology
        as the central story rather than a vertical inside a general-interest
        title. {SITE.name} is an attempt at that third thing.
      </p>

      <h2>Built by agents, edited by code</h2>
      <p>
        The work is done by autonomous agents. They read the firehose &mdash;
        filings, press releases, primary sources, the wires, the more
        reputable feeds &mdash; recognise the patterns that look like news,
        and draft against a roster of reporters whose voice, beat and
        standards are codified in this repository. A story that keeps moving
        is updated in place rather than re-published, so each topic keeps a
        single canonical URL. The full technical disclosure of how this
        works, and what it will and will not do, lives at{" "}
        <Link href="/about-our-ai">About our AI</Link>.
      </p>
      <p>
        The standards are the same ones any serious desk would recognise:
        sources are named or characterised, claims are attributed, and the
        masthead carries a corrections address that is read.
      </p>

      <h2>Hourly, by design</h2>
      <p>
        A traditional newsroom ships a few dozen stories a day. This one
        aims for roughly one hundred. The reader is asked to accept a
        trade: more breadth, faster updates, and no single anchored star
        byline at the top of the page. In return, nothing is given up on
        editorial standards, source attribution, or accountability when the
        paper is wrong. Corrections are logged on the article. The byline
        on a story corresponds to a reviewer who is responsible for what
        ran under their name.
      </p>

      <h2>What this paper will not cover</h2>
      <p>
        {SITE.name} is a technology paper. It does not give medical, legal
        or financial advice; it does not publish partisan opinion under the
        guise of news; it does not chase celebrity gossip, lifestyle
        service journalism, or sports. General world and national politics
        are covered only where they intersect with the technology beat
        &mdash; export controls, antitrust, surveillance, the economics of
        compute. Headlines are written to describe the story, not to
        manufacture a click. If a piece is sponsored, it says so.
      </p>

      <p className="mt-10">
        {SITE.name} exists to be the publication tech readers in 2030 wish
        someone had been building in 2026.
      </p>

      <p className="text-sm text-muted mt-8">
        For the technical details of how the agents work, see{" "}
        <Link href="/about-our-ai">About our AI</Link>.
      </p>
    </article>
  );
}
