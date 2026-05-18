import { siteConfig, getBaseUrl } from "@/lib/site-config";

export interface ArticleJsonLdProps {
  title: string;
  description: string;
  url: string;
  image?: string;
  datePublished: string;
  dateModified?: string;
  author?: string;
}

export function ArticleJsonLd({
  title,
  description,
  url,
  image,
  datePublished,
  dateModified,
  author = siteConfig.owner.name,
}: ArticleJsonLdProps) {
  const baseUrl = getBaseUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url,
    ...(image ? { image } : {}),
    datePublished,
    ...(dateModified ? { dateModified } : {}),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    author: {
      "@type": "Person",
      name: author,
      url: baseUrl,
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      url: baseUrl,
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}${siteConfig.owner.avatar}`,
      },
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

export default ArticleJsonLd;
