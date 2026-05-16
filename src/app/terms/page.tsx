import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `The terms under which ${SITE.name} is made available.`,
  alternates: { canonical: "/terms" },
};

const LAST_UPDATED = "May 16, 2026";

export default function TermsPage() {
  return (
    <article className="max-w-prose mx-auto px-4 pt-12 pb-16 prose-article">
      <header className="mb-8">
        <div className="kicker text-muted mb-2">Legal</div>
        <h1 className="headline text-4xl md:text-5xl mb-3">Terms of Service</h1>
        <p className="byline">Last updated: {LAST_UPDATED}</p>
      </header>

      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your access to
        and use of <Link href="/">{new URL(SITE.url).host}</Link> and any
        other website, feed, or service operated by{" "}
        {SITE.legalOperatorName} (&ldquo;{SITE.name},&rdquo; &ldquo;we,&rdquo;
        &ldquo;us&rdquo;). By using the Site you agree to these Terms.
        If you do not agree, do not use the Site.
      </p>

      <h2>The service</h2>
      <p>
        {SITE.name} publishes general-news articles, many of which are
        drafted with the assistance of artificial intelligence and reviewed
        before publication. See{" "}
        <Link href="/about-our-ai">About Our AI</Link> for the editorial
        process. The Site is provided free of charge for personal,
        non-commercial reading.
      </p>

      <h2>Editorial accuracy and use as information only</h2>
      <p>
        We try to be accurate. We do not guarantee that any article is
        complete, current, or free of error. News evolves; we frequently
        update existing articles as a story develops. The Site is intended
        as journalism. Nothing on the Site is medical, legal, financial, or
        investment advice. Do not rely on any article as a substitute for
        professional advice from a qualified individual familiar with your
        circumstances.
      </p>

      <h2>Corrections</h2>
      <p>
        If you spot a factual error, write to{" "}
        <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>{" "}
        and we will investigate. Confirmed corrections are noted on the
        article.
      </p>

      <h2>Intellectual property</h2>
      <p>
        Except where stated otherwise, all original text, design,
        compilations, and code on the Site are owned by {SITE.legalOperatorName}{" "}
        or its licensors and are protected by copyright, trademark, and
        other laws. Photographs credited to third-party publications are
        the property of those publications and used here under fair use
        for news reporting and commentary. The {SITE.name} name and any
        associated marks are trademarks of {SITE.legalOperatorName}.
      </p>
      <p>
        You may read, share, and quote short excerpts of articles with
        attribution and a link back to the original story on the Site.
        Wholesale republication of articles is not permitted without prior
        written permission.
      </p>

      <h2>DMCA / copyright complaints</h2>
      <p>
        If you believe content on the Site infringes your copyright, send a
        notice that satisfies 17 U.S.C. &sect; 512(c)(3) to{" "}
        <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>{" "}
        including: identification of the work; the URL of the allegedly
        infringing material; your contact information; a statement that
        you have a good-faith belief that the use is unauthorized; a
        statement under penalty of perjury that the information is
        accurate; and your physical or electronic signature.
      </p>

      <h2>Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>scrape, harvest, or systematically copy the Site for commercial use;</li>
        <li>circumvent any technical measures protecting the Site;</li>
        <li>interfere with the Site, its security, or other users;</li>
        <li>impersonate any person or misrepresent your affiliation;</li>
        <li>use the Site to violate any law or right of a third party.</li>
      </ul>

      <h2>Third-party content and links</h2>
      <p>
        Articles routinely link to and cite third-party sources. We are
        not responsible for those sites&rsquo; content, privacy practices,
        or availability. Inclusion of a link is not an endorsement.
      </p>

      <h2>Advertising</h2>
      <p>
        Ads on the Site are served by Google AdSense. Editorial decisions
        are independent of advertisers; ads are not endorsements of the
        article alongside which they appear.
      </p>

      <h2>Disclaimer of warranties</h2>
      <p>
        THE SITE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS
        AVAILABLE.&rdquo; TO THE FULLEST EXTENT PERMITTED BY LAW, WE
        DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING
        MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
        NON-INFRINGEMENT, AND ANY WARRANTY ARISING FROM COURSE OF DEALING
        OR USAGE OF TRADE.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        TO THE FULLEST EXTENT PERMITTED BY LAW, IN NO EVENT WILL{" "}
        {SITE.legalOperatorName.toUpperCase()} OR ITS CONTRIBUTORS BE LIABLE
        FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY OR
        PUNITIVE DAMAGES ARISING OUT OF OR RELATED TO YOUR USE OF THE
        SITE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR
        AGGREGATE LIABILITY FOR ANY CLAIM ARISING FROM THESE TERMS OR THE
        SITE WILL NOT EXCEED ONE HUNDRED U.S. DOLLARS ($100).
      </p>

      <h2>Indemnification</h2>
      <p>
        You will indemnify and hold harmless {SITE.legalOperatorName} from
        any claim, demand, loss, or expense (including reasonable
        attorneys&rsquo; fees) arising out of your use of the Site, your
        violation of these Terms, or your violation of any law or
        third-party right.
      </p>

      <h2>Governing law and disputes</h2>
      <p>
        These Terms are governed by the laws of the State of{" "}
        {SITE.governingLawState}, U.S.A., without regard to its conflict
        of laws principles. Any dispute arising from or relating to these
        Terms or the Site will be brought exclusively in the state or
        federal courts located in {SITE.governingLawState}, and you
        consent to the jurisdiction of those courts.
      </p>

      <h2>Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. The &ldquo;Last
        updated&rdquo; date reflects the most recent revision. Continued
        use of the Site after a change indicates your acceptance.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these Terms can be sent to{" "}
        <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
      </p>
    </article>
  );
}
