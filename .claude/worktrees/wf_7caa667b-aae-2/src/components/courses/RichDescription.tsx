"use client";

import { sanitizeHtml } from "@/lib/sanitize";

/* Renders rich HTML description with styled prose */
export default function RichDescription({ html }: { html: string }) {
  return (
    <>
      <div
        className="rich-description"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
      />
      <style jsx global>{`
        .rich-description {
          color: #d1d5db;
          line-height: 1.8;
        }
        .rich-description h2 {
          font-size: 1.35rem;
          font-weight: 700;
          color: #fff;
          margin-top: 2rem;
          margin-bottom: 0.75rem;
        }
        .rich-description h3 {
          font-size: 1.15rem;
          font-weight: 600;
          color: #fff;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
        }
        .rich-description p {
          margin-bottom: 1rem;
        }
        .rich-description ul,
        .rich-description ol {
          padding-left: 1.5rem;
          margin-bottom: 1rem;
        }
        .rich-description ul {
          list-style-type: disc;
        }
        .rich-description ol {
          list-style-type: decimal;
        }
        .rich-description li {
          margin-bottom: 0.35rem;
        }
        .rich-description blockquote {
          border-left: 3px solid #D4A843;
          padding-left: 1rem;
          color: #9ca3af;
          font-style: italic;
          margin: 1.25rem 0;
        }
        .rich-description pre {
          background: #151515;
          border: 1px solid #2a2a2a;
          border-radius: 0.5rem;
          padding: 1rem;
          font-family: monospace;
          font-size: 0.85rem;
          overflow-x: auto;
          margin: 1.25rem 0;
        }
        .rich-description code {
          background: #1f1f1f;
          padding: 0.15rem 0.4rem;
          border-radius: 0.25rem;
          font-size: 0.85rem;
        }
        .rich-description img {
          max-width: 100%;
          height: auto;
          border-radius: 0.75rem;
          margin: 1.25rem 0;
        }
        .rich-description hr {
          border: none;
          border-top: 1px solid #2a2a2a;
          margin: 2rem 0;
        }
        .rich-description a {
          color: #D4A843;
          text-decoration: underline;
        }
        .rich-description a:hover {
          color: #e8c066;
        }
        .rich-description strong {
          color: #fff;
          font-weight: 600;
        }
        .rich-description em {
          color: #d1d5db;
        }
        .rich-description iframe,
        .rich-description .novel-youtube {
          max-width: 100%;
          border-radius: 0.75rem;
          margin: 1.25rem 0;
          aspect-ratio: 16 / 9;
        }
        .rich-description [data-youtube-video] {
          max-width: 100%;
          margin: 1.25rem 0;
        }
        .rich-description [data-youtube-video] iframe {
          width: 100%;
          height: auto;
          aspect-ratio: 16 / 9;
          border-radius: 0.75rem;
        }
        .rich-description mark {
          background: rgba(212, 168, 67, 0.3);
          color: #fff;
          padding: 0.1rem 0.2rem;
          border-radius: 0.15rem;
        }
        .rich-description u {
          text-decoration-color: #D4A843;
        }
      `}</style>
    </>
  );
}
