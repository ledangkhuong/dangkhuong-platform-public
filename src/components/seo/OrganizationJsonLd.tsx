import { siteConfig, getBaseUrl } from "@/lib/site-config";

const BASE_URL = getBaseUrl();

const ORGANIZATION = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${BASE_URL}/#organization`,
  name: "Lê Đăng Khương Academy",
  url: "https://dangkhuong.com",
  logo: {
    "@type": "ImageObject",
    url: `${BASE_URL}${siteConfig.owner.avatar}`,
  },
  sameAs: [
    siteConfig.socials.facebook,
    siteConfig.socials.youtube,
  ].filter(Boolean),
  contactPoint: {
    "@type": "ContactPoint",
    email: "support@ledangkhuong.net",
    contactType: "customer support",
    areaServed: "VN",
    availableLanguage: ["Vietnamese"],
  },
};

export function OrganizationJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(ORGANIZATION).replace(/</g, "\\u003c"),
      }}
    />
  );
}

export default OrganizationJsonLd;
