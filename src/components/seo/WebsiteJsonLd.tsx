import { siteConfig, getBaseUrl } from "@/lib/site-config";

const BASE_URL = getBaseUrl();

const ORGANIZATION = {
  "@type": "Organization" as const,
  name: siteConfig.name,
  url: BASE_URL,
  logo: `${BASE_URL}${siteConfig.owner.avatar}`,
  founder: {
    "@type": "Person" as const,
    name: siteConfig.owner.name,
  },
  sameAs: [
    siteConfig.socials.facebook,
    siteConfig.socials.youtube,
  ].filter(Boolean),
};

const WEBSITE = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: siteConfig.name,
      url: BASE_URL,
      publisher: { "@id": `${BASE_URL}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${BASE_URL}/search?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      ...ORGANIZATION,
      "@id": `${BASE_URL}/#organization`,
    },
  ],
};

export function WebsiteJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(WEBSITE).replace(/</g, "\\u003c"),
      }}
    />
  );
}

export default WebsiteJsonLd;
