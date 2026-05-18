import { siteConfig, getBaseUrl } from "@/lib/site-config";

export interface CourseJsonLdProps {
  name: string;
  description: string;
  url: string;
  image?: string;
  price: number;
  priceCurrency?: string;
}

export function CourseJsonLd({
  name,
  description,
  url,
  image,
  price,
  priceCurrency = "VND",
}: CourseJsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name,
    description,
    url,
    ...(image ? { image } : {}),
    provider: {
      "@type": "Organization",
      name: siteConfig.name,
      url: getBaseUrl(),
    },
    inLanguage: "vi",
    courseMode: "online",
    offers: {
      "@type": "Offer",
      price,
      priceCurrency,
      availability: "https://schema.org/InStock",
      url,
    },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
      }}
    />
  );
}

export default CourseJsonLd;
