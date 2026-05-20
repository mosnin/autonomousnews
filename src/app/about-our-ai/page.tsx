import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";
import { EDITOR } from "@/lib/authors";

export const metadata: Metadata = {
  title: "About Our AI",
  description: `How ${SITE.name} uses AI to research, draft and update its journalism.`,
  alternates: { canonical: "/about-our-ai" },
};

export default function AboutOurAiPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 pt-12 pb-16 prose-article">
      <header className="mb-8">
        <div className="kicker text-muted mb-2">
          Technical disclosure &mdash; for the editorial statement see{" "}
          <Link href="/about" className="text-accent underline">
            About
          </Link>
        </div>
        <h1 className="headline text-4xl md:text-5xl mb-3">
          How {SITE.name} uses AI
        </h1>
        <p className="dek text-lg">
          {SITE.name} is an autonomous newsroom. Every article is researched
          and drafted by AI agents from primary sources, fact-checked by an
          independent AI, and reviewed by a human editor before it is
          published.
        </p>
      </header>

      <h2>What our agents do</h2>
      <p>
        Every hour, a team of autonomous agents reviews trending topics from
        reputable news APIs and the live web, identifies stories that fit our
        topic clusters, and drafts articles ranging from short briefs to
        long-form features. When a story keeps developing, our agents update
        the existing article rather than publishing a duplicate, so each topic
        keeps a single canonical URL on this site.
      </p>

      <h2>What our agents will not do</h2>
      <p>
        Our agents are instructed to take a neutral, informative tone. They do
        not give medical, legal or financial advice, and they do not publish
        partisan political opinion under the guise of news. Every article that
        touches a sensitive area carries a clear disclaimer so readers know to
        consult a qualified professional.
      </p>

      <h2>How we credit images</h2>
      <p>
        When an article uses a photograph from one of our news partners, we
        credit the source publication and link back to the original story.
        When no usable source image is available, we use an AI image generator
        (DALL·E 3) to produce a hyper-realistic editorial illustration in a
        consistent house style. AI-generated images are labelled as such.
      </p>

      <h2>Bylines and the editor on duty</h2>
      <p>
        {SITE.name} does not publish under fictional reporter personas. The
        byline on every article reads{" "}
        <em>Reported by Techno Times Agents · Edited by {EDITOR.name}</em>.
        The agents do the reporting and drafting; {EDITOR.name},{" "}
        {EDITOR.title}, reviews the fact-check queue and signs off on what is
        published. Live pipeline statistics, including fact-check pass rate
        and operating cost, are published on the{" "}
        <Link href="/agents" className="text-accent underline">
          newsroom transparency page
        </Link>
        .
      </p>

      <h2>Corrections</h2>
      <p>
        If you spot something we got wrong, write to{" "}
        <a href="mailto:corrections@technotimes.com">
          corrections@technotimes.com
        </a>{" "}
        and we will investigate. Confirmed corrections are noted on the
        article.
      </p>
    </article>
  );
}
