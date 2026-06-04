import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

/**
 * GET /api/qr?bank=BIDV&acc=8877357346&amount=99000&des=DKXXX
 * Proxy QR image từ Sepay để tránh browser block cross-origin image
 */
export async function GET(req: NextRequest) {
  // Rate limit: 30 requests per minute per IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = await rateLimit(`qr:${ip}`, 30, 60);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec || 60) } }
    );
  }

  const { searchParams } = req.nextUrl;
  const bank = searchParams.get("bank");
  const acc = searchParams.get("acc");
  const amount = searchParams.get("amount");
  const des = searchParams.get("des");

  if (!bank || !acc || !amount || !des) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  // Only allow qr.sepay.vn domain
  const url = `https://qr.sepay.vn/img?bank=${encodeURIComponent(bank)}&acc=${encodeURIComponent(acc)}&template=compact&amount=${encodeURIComponent(amount)}&des=${encodeURIComponent(des)}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "image/png,image/*",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "QR service error" },
        { status: res.status }
      );
    }

    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch QR" },
      { status: 500 }
    );
  }
}
