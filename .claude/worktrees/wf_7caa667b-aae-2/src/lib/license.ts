// ──────────────────────────────────────────────
// License Watermark — DO NOT REMOVE OR MODIFY
// ──────────────────────────────────────────────
// This file identifies the licensed user of this codebase.
// Removing or modifying this file violates the license agreement
// and will result in immediate access revocation.
// ──────────────────────────────────────────────

export const LICENSE = {
  licensee: process.env.NEXT_PUBLIC_LICENSE_NAME || "UNLICENSED",
  email: process.env.NEXT_PUBLIC_LICENSE_EMAIL || "",
  issuedAt: process.env.NEXT_PUBLIC_LICENSE_DATE || "",
} as const;

/**
 * Returns the licensee info for display in admin footer.
 * This helps verify the license is properly configured.
 */
export function getLicenseInfo(): string {
  if (!LICENSE.licensee || LICENSE.licensee === "UNLICENSED") {
    return "Unlicensed Copy";
  }
  return `Licensed to: ${LICENSE.licensee}`;
}
