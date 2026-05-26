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
 * Sanitize search input for PostgREST .or() filters
 * Removes characters that have special meaning in PostgREST filter syntax
 */
export function sanitizeSearchInput(input: string): string {
  return input
    .replace(/[(),.*\\]/g, '')  // PostgREST special chars
    .trim()
    .slice(0, 200);
}
