/**
 * Pure helpers + constants for crm_contacts.tags.
 *
 * Kept OUTSIDE of `src/lib/actions/contact-tags.ts` because that file
 * has `"use server"` at the top — Next.js 16 + Turbopack rejects any
 * non-async function export from a server-actions file. So the const
 * limits and the synchronous parser live here, and both client + server
 * code can import them.
 *
 * Schema: `crm_contacts.tags` is a `text[] NOT NULL DEFAULT '{}'` added
 * in supabase/migrations/20260527_004_contact_tags.sql.
 */

/** Max number of tags a single contact may carry. Keeps the UI sane. */
export const CONTACT_TAGS_MAX_COUNT = 20;

/** Max length of a single tag, in characters. */
export const CONTACT_TAGS_MAX_LENGTH = 40;

/**
 * Parse a freeform tag list submitted from the editor (newline- or
 * comma-separated, or already a string[]). Applies the canonicalisation
 * rules that make autocomplete work: trim → lowercase → drop empties →
 * truncate per-tag → dedupe → cap total count.
 */
export function parseContactTags(input: string | string[] | null | undefined): string[] {
  if (input == null) return [];
  const raw = Array.isArray(input) ? input : input.split(/[,\n]/);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const piece of raw) {
    if (typeof piece !== "string") continue;
    const cleaned = piece.trim().toLowerCase();
    if (!cleaned) continue;
    const capped =
      cleaned.length > CONTACT_TAGS_MAX_LENGTH
        ? cleaned.slice(0, CONTACT_TAGS_MAX_LENGTH)
        : cleaned;
    if (seen.has(capped)) continue;
    seen.add(capped);
    out.push(capped);
    if (out.length >= CONTACT_TAGS_MAX_COUNT) break;
  }
  return out;
}

/**
 * Diff two tag lists. Order-insensitive.
 * Both inputs are assumed to be already canonicalised (trimmed,
 * lowercased, deduped) — pass through `parseContactTags` first if not.
 */
export function diffContactTags(
  before: string[],
  after: string[],
): { added: string[]; removed: string[] } {
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  const added: string[] = [];
  const removed: string[] = [];
  for (const t of afterSet) if (!beforeSet.has(t)) added.push(t);
  for (const t of beforeSet) if (!afterSet.has(t)) removed.push(t);
  return { added, removed };
}
