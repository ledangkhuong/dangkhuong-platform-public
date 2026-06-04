import { NextResponse } from "next/server";

/**
 * GET /api/license
 *
 * Returns the license info for this deployment.
 * Used by the licensor to verify who is running this code.
 * Publicly accessible — only returns non-sensitive license metadata.
 */
export async function GET() {
  return NextResponse.json({
    licensee: process.env.NEXT_PUBLIC_LICENSE_NAME || "UNLICENSED",
    email: process.env.NEXT_PUBLIC_LICENSE_EMAIL || "",
    issuedAt: process.env.NEXT_PUBLIC_LICENSE_DATE || "",
    domain: process.env.NEXT_PUBLIC_SITE_DOMAIN || "",
    siteName: process.env.NEXT_PUBLIC_SITE_NAME || "",
  });
}
