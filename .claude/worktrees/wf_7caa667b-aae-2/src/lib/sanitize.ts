import sanitize from "sanitize-html";

/**
 * Strip `data:` URIs that aren't `data:image/*` from the `src` attribute.
 * This prevents XSS via `data:text/html`, `data:application/javascript`, etc.
 * while still allowing inline base64 images.
 */
function filterDataUri(
  tagName: string,
  attribs: sanitize.Attributes,
): sanitize.Tag {
  const src = attribs.src;
  if (
    src &&
    src.trimStart().toLowerCase().startsWith("data:") &&
    !src.trimStart().toLowerCase().startsWith("data:image/")
  ) {
    // Non-image data URI — remove the src entirely
    delete attribs.src;
  }
  return { tagName, attribs };
}

/**
 * Sanitize HTML content for safe rendering.
 * Uses sanitize-html (pure JS, no jsdom dependency) so it works
 * reliably on both local dev and Vercel serverless environments.
 *
 * Replaces isomorphic-dompurify which crashes on Vercel due to
 * jsdom's ESM/CJS incompatibility with @exodus/bytes.
 */
export function sanitizeHtml(dirty: string): string {
  return sanitize(dirty, {
    allowedTags: [
      // Headings
      "h1", "h2", "h3", "h4", "h5", "h6",
      // Block elements
      "p", "div", "section", "article", "blockquote", "pre", "hr", "br",
      // Lists
      "ul", "ol", "li",
      // Inline
      "a", "strong", "b", "em", "i", "u", "s", "del", "ins", "mark",
      "code", "span", "sub", "sup", "small",
      // Media
      "img", "figure", "figcaption", "picture", "source", "video", "audio",
      // Table
      "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption", "colgroup", "col",
      // Embeds (YouTube, etc.)
      "iframe",
      // Details / Summary
      "details", "summary",
    ],
    allowedAttributes: {
      "*": ["class", "id", "data-*"],
      a: ["href", "target", "rel", "title"],
      img: ["src", "alt", "width", "height", "loading", "srcset", "sizes"],
      iframe: ["src", "width", "height", "frameborder", "allow", "allowfullscreen", "title"],
      video: ["src", "controls", "width", "height", "poster", "preload"],
      audio: ["src", "controls"],
      source: ["src", "type", "srcset", "sizes", "media"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan", "scope"],
      ol: ["start", "type"],
      col: ["span"],
      colgroup: ["span"],
    },
    // Only allow safe CSS properties via style attribute (sanitize-html
    // re-adds "style" to allowedAttributes automatically when allowedStyles
    // is provided, but restricts values to these patterns).
    allowedStyles: {
      "*": {
        "text-align": [/^(left|right|center|justify)$/],
        color: [/^#[0-9a-fA-F]{3,6}$/],
        "background-color": [/^#[0-9a-fA-F]{3,6}$/],
        "font-weight": [/^(bold|normal|\d{3})$/],
        "font-size": [/^\d+(\.\d+)?(px|em|rem|%)$/],
      },
    },
    allowedIframeHostnames: [
      "www.youtube.com",
      "www.youtube-nocookie.com",
      "player.vimeo.com",
      "drive.google.com",
    ],
    // Block non-image data: URIs on img/source tags (defence in depth)
    transformTags: {
      img: filterDataUri,
      source: filterDataUri,
    },
    // Only allow safe URL schemes globally (no data: — see allowedSchemesByTag)
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
      // Allow data:image/* URIs only on image-related tags (inline base64 images)
      img: ["http", "https", "data"],
      source: ["http", "https", "data"],
      // Preserve YouTube embeds — https only
      iframe: ["https"],
    },
  });
}
