/**
 * Simple keyword-based content filter for community moderation.
 * Posts matching flagged keywords still go through but are marked for admin review.
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

export function checkFlaggedContent(content: string): {
  flagged: boolean;
  matchedKeywords: string[];
} {
  const lower = content.toLowerCase();
  const matched = FLAGGED_KEYWORDS.filter((kw) =>
    lower.includes(kw.toLowerCase())
  );
  return { flagged: matched.length > 0, matchedKeywords: matched };
}
