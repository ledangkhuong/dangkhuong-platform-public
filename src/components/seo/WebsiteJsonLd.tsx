import { siteConfig, getBaseUrl } from "@/lib/site-config";

const BASE_URL = getBaseUrl();

const WEBSITE = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${BASE_URL}/#website`,
  name: siteConfig.name,
  url: BASE_URL,
  publisher: { "@id": `${BASE_URL}/#organization` },
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://dangkhuong.com/search?q={search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
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
