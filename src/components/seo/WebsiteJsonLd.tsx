const BASE_URL = "https://dangkhuong.com";

const ORGANIZATION = {
  "@type": "Organization" as const,
  name: "Lê Đăng Khương Academy",
  url: BASE_URL,
  logo: `${BASE_URL}/images/about/portrait.jpg`,
  founder: {
    "@type": "Person" as const,
    name: "Lê Đăng Khương",
  },
  sameAs: [
    "https://www.facebook.com/dangkhuong",
    "https://www.youtube.com/@dangkhuong",
  ],
};

const WEBSITE = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: "Lê Đăng Khương Academy",
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
