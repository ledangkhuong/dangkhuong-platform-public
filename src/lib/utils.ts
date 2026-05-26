import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Validate that a string is a well-formed UUID v4.
 * Rejects malformed IDs before they reach the database layer.
 */
export function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Sanitize search input for PostgREST .or() filters.
 *
 * Strips only the characters PostgREST treats as control in `.or()`:
 *   comma — condition separator
 *   parens — grouping
 *   * — wildcard
 *   backslash — escape
 *
 * Dot `.` and `@` are KEPT so email and URL searches work:
 *   "thaymo.vn@gmail.com" must remain "thaymo.vn@gmail.com", not
 *   "thaymovn@gmailcom" (the previous behaviour produced 0 results
 *   for any email query containing a dot).
 */
export function sanitizeSearchInput(input: string): string {
  return input
    .replace(/[(),*\\]/g, '')
    .trim()
    .slice(0, 200);
}
