/**
 * Simple keyword-based content filter for community moderation.
 * Posts matching flagged keywords still go through but are marked for admin review.
 *
 * Uses word-boundary matching to avoid false positives
 * (e.g. "ngu" should NOT match inside "nguồn nhân lực").
 */

const FLAGGED_KEYWORDS = [
  // Vietnamese profanity/insults
  "đụ", "địt", "lồn", "cặc", "đéo", "đĩ", "mẹ mày", "con chó",
  "ngu", "óc chó", "thằng ngu", "con ngu", "đồ ngu",
  // Scam/spam patterns
  "kiếm tiền nhanh", "thu nhập thụ động", "đầu tư forex",
  "liên hệ zalo", "inbox ngay", "free 100%", "cam kết lợi nhuận",
  "nhận tiền ngay", "không cần vốn", "mlm", "đa cấp",
];

/**
 * Vietnamese-aware word boundary check.
 * Standard regex \b doesn't work well with Vietnamese diacritics.
 * Instead, check that the character before/after the match is NOT
 * a Vietnamese letter (including accented chars like ồ, ữ, ạ, etc.)
 */
const VIET_LETTER = /[\p{L}\p{M}]/u; // Unicode letter or combining mark

function isWholeWordMatch(text: string, keyword: string, startIdx: number): boolean {
  const endIdx = startIdx + keyword.length;
  // Check character before the match — must NOT be a letter
  if (startIdx > 0 && VIET_LETTER.test(text[startIdx - 1])) return false;
  // Check character after the match — must NOT be a letter
  if (endIdx < text.length && VIET_LETTER.test(text[endIdx])) return false;
  return true;
}

export function checkFlaggedContent(content: string): {
  flagged: boolean;
  matchedKeywords: string[];
} {
  const lower = content.toLowerCase();
  const matched = FLAGGED_KEYWORDS.filter((kw) => {
    const kwLower = kw.toLowerCase();
    let searchFrom = 0;
    while (true) {
      const idx = lower.indexOf(kwLower, searchFrom);
      if (idx === -1) return false;
      if (isWholeWordMatch(lower, kwLower, idx)) return true;
      searchFrom = idx + 1;
    }
  });
  return { flagged: matched.length > 0, matchedKeywords: matched };
}
