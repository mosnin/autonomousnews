import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${SITE.name} collects and uses information about its readers.`,
  alternates: { canonical: "/privacy" },
};

const LAST_UPDATED = "May 16, 2026";

export default function PrivacyPage() {
  return (
    <article className="max-w-prose mx-auto px-4 pt-12 pb-16 prose-article">
      <header className="mb-8">
        <div className="kicker text-muted mb-2">Legal</div>
        <h1 className="headline text-4xl md:text-5xl mb-3">Privacy Policy</h1>
        <p className="byline">Last updated: {LAST_UPDATED}</p>
      </header>

      <p>
        This Privacy Policy describes how {SITE.legalOperatorName}{" "}
        (&ldquo;{SITE.name},&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;)
        collects, uses, and shares information about you when you visit{" "}
        <Link href="/">{new URL(SITE.url).host}</Link> (the &ldquo;Site&rdquo;).
        By using the Site you agree to the practices described here.
      </p>

      <h2>Information we collect</h2>
      <p>
        We do not require you to create an account to read articles. We
        collect only what is needed to operate, secure, and improve the
        Site:
      </p>
      <ul>
        <li>
          <strong>Server logs</strong> &mdash; our hosting provider records IP
          address, user-agent, referrer, the URL you requested, and a
          timestamp for every request. Logs are retained for a short period
          for security and debugging.
        </li>
        <li>
          <strong>Analytics</strong> &mdash; we may use Google Analytics 4
          and/or Plausible Analytics to understand aggregate readership
          (page views, country, device class). GA4 uses cookies; Plausible
          does not. Where required by law, GA4 IP addresses are anonymized.
        </li>
        <li>
          <strong>Advertising</strong> &mdash; we display ads through{" "}
          <a
            href="https://policies.google.com/technologies/ads"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google AdSense
          </a>
          . AdSense sets cookies and similar technologies to serve ads,
          measure performance, and (where permitted) personalize ads to you.
          Outside the EEA, U.K., and Switzerland, ads may be personalized
          based on your activity across the web. Inside those regions,
          AdSense is configured to serve non-personalized ads unless you
          have given consent through Google.
        </li>
        <li>
          <strong>Hosted images and feeds</strong> &mdash; when you load
          pages we serve, your browser fetches images and feeds from our
          CDN. Requests for those assets are logged by our hosting provider.
        </li>
      </ul>
      <p>
        We do not knowingly collect personal information from children under
        13. We do not sell personal information for money.
      </p>

      <h2>How we use information</h2>
      <ul>
        <li>To operate the Site, deliver pages, and serve images.</li>
        <li>To prevent abuse and protect the Site&rsquo;s integrity.</li>
        <li>To understand which articles readers find useful.</li>
        <li>To deliver ads that fund the Site.</li>
      </ul>

      <h2>Cookies and similar technologies</h2>
      <p>
        Cookies are small pieces of data set on your device. We use them
        primarily through our third-party providers: Google Analytics and
        Google AdSense. You can clear cookies, block them by site, or
        configure your browser to refuse them entirely; doing so may
        prevent ads from loading or break analytics, but will not block
        you from reading the Site.
      </p>

      <h2>How we share information</h2>
      <p>
        We share information with the service providers above (hosting,
        analytics, advertising). We do not sell or rent personal
        information to third parties for their own marketing. We may
        disclose information when required by law or to protect rights,
        property, or safety.
      </p>

      <h2>Third-party services</h2>
      <p>
        Their practices are governed by their own policies:
      </p>
      <ul>
        <li>
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google (Analytics, AdSense, fonts)
          </a>
        </li>
        <li>
          <a
            href="https://plausible.io/data-policy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Plausible Analytics
          </a>
        </li>
      </ul>

      <h2>Your choices</h2>
      <ul>
        <li>
          <strong>Personalized ads</strong> &mdash; you can opt out at{" "}
          <a
            href="https://www.google.com/settings/ads"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Ad Settings
          </a>
          .
        </li>
        <li>
          <strong>Analytics</strong> &mdash; you can install the{" "}
          <a
            href="https://tools.google.com/dlpage/gaoptout"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Analytics opt-out browser add-on
          </a>
          . Plausible does not use cookies and tracks no personal data.
        </li>
        <li>
          <strong>Do Not Track</strong> &mdash; our Site does not respond to
          DNT signals, because the industry has not adopted a uniform
          standard. We have nonetheless minimized the data we collect.
        </li>
      </ul>

      <h2>AI-assisted content</h2>
      <p>
        Many articles on the Site are drafted with the assistance of AI
        before human review. See{" "}
        <Link href="/about-our-ai">About Our AI</Link> for the editorial
        process.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this Policy from time to time. The &ldquo;Last
        updated&rdquo; date at the top of the page reflects the most recent
        revision. Material changes will be highlighted on the Site for a
        reasonable period.
      </p>

      <h2>Contact</h2>
      <p>
        Questions or requests related to this Policy can be sent to{" "}
        <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
      </p>
    </article>
  );
}
