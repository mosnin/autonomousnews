import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import {
  SITE,
  ADSENSE_CLIENT_ID,
  GA4_ID,
  PLAUSIBLE_DOMAIN,
  GSC_VERIFICATION,
} from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: SITE.name,
    description: SITE.description,
    url: SITE.url,
    locale: SITE.locale,
  },
  twitter: {
    card: "summary_large_image",
    site: SITE.twitter,
    title: SITE.name,
    description: SITE.description,
  },
  robots: { index: true, follow: true },
  icons: { icon: "/favicon.ico" },
  verification: GSC_VERIFICATION
    ? { google: GSC_VERIFICATION }
    : undefined,
  alternates: {
    canonical: "/",
    types: {
      "application/rss+xml": [{ url: "/feed.xml", title: `${SITE.name} — Latest` }],
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const organizationLd = {
    "@context": "https://schema.org",
    "@type": "NewsMediaOrganization",
    name: SITE.name,
    url: SITE.url,
    logo: `${SITE.url}/logo.png`,
    sameAs: [],
  };

  return (
    <html lang="en">
      <head>
        {ADSENSE_CLIENT_ID ? (
          <Script
            id="adsense"
            async
            strategy="afterInteractive"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
            crossOrigin="anonymous"
          />
        ) : null}
        {GA4_ID ? (
          <>
            <Script
              id="ga4-src"
              async
              strategy="afterInteractive"
              src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`}
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA4_ID}', { anonymize_ip: true });`}
            </Script>
          </>
        ) : null}
        {PLAUSIBLE_DOMAIN ? (
          <Script
            id="plausible"
            defer
            strategy="afterInteractive"
            data-domain={PLAUSIBLE_DOMAIN}
            src="https://plausible.io/js/script.js"
          />
        ) : null}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
        />
      </head>
      <body className="bg-white text-ink">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:bg-white focus:px-3 focus:py-1 focus:border focus:border-ink"
        >
          Skip to main content
        </a>
        <SiteHeader />
        <main id="main" className="bg-white">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
