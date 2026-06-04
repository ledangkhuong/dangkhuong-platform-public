/**
 * Utility functions for video URL parsing.
 * Shared between server and client components.
 */

/**
 * Extract the Google Drive file ID from various URL formats:
 * - https://drive.google.com/file/d/FILE_ID/view
 * - https://drive.google.com/file/d/FILE_ID/preview
 * - https://drive.google.com/open?id=FILE_ID
 */
export function extractGoogleDriveFileId(url: string): string | null {
  // /file/d/{ID}
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];
  // ?id={ID}
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];
  return null;
}

/** Check if a URL is a Google Drive link */
export function isGoogleDriveUrl(url: string): boolean {
  return /drive\.google\.com/.test(url);
}
