/**
 * Order tracking form — `/orders/track`.
 *
 * Server Component + inline Server Action `lookupOrder`.
 *
 * UX:
 *  - User nhập `order_code` + `email` HOẶC `phone` (1 trong 2).
 *  - Submit → Server Action lookup `orders` qua admin client, so khớp
 *    case-insensitive với `customer_email` hoặc partial match
 *    `customer_phone` (chỉ so digit cuối cùng để tránh false negative
 *    do format khác).
 *  - Match → redirect `/orders/[orderCode]`.
 *  - Không match → render lại form với error message (state qua
 *    `searchParams.error`).
 *
 * Bảo mật:
 *  - Verify bằng email/phone tránh trường hợp đoán order_code và xem trang.
 *  - Rate limit: dựa vào IP (sẽ implement sau — Week 6 chỉ cần UX flow).
 */

import "server-only";

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Search, AlertCircle, Package } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "Tra cứu đơn hàng — Lê Đăng Khương Academy",
  description:
    "Nhập mã đơn hàng và email/số điện thoại để theo dõi trạng thái đơn hàng.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Lấy digit cuối của số phone để so khớp tolerant với format. */
function normalizePhoneTail(value: string): string {
  return value.replace(/\D/g, "").slice(-9); // 9 digit cuối — bỏ +84/0 prefix
}

const ERROR_MESSAGES: Record<string, string> = {
  missing: "Vui lòng nhập mã đơn hàng và email hoặc số điện thoại.",
  notfound:
    "Không tìm thấy đơn hàng phù hợp. Vui lòng kiểm tra lại thông tin.",
  server:
    "Có lỗi xảy ra khi tra cứu đơn hàng. Vui lòng thử lại sau ít phút.",
};

// ---------------------------------------------------------------------------
// Server Action
// ---------------------------------------------------------------------------

async function lookupOrder(formData: FormData): Promise<void> {
  "use server";

  const rawCode = String(formData.get("order_code") ?? "").trim();
  const rawEmail = String(formData.get("email") ?? "").trim();
  const rawPhone = String(formData.get("phone") ?? "").trim();

  if (!rawCode || (!rawEmail && !rawPhone)) {
    redirect("/orders/track?error=missing");
  }

  // Tách lookup ra try-catch riêng — KHÔNG bao gồm `redirect()` để tránh
  // catch nuốt NEXT_REDIRECT digest.
  let row:
    | {
        order_code: string;
        customer_email: string | null;
        customer_phone: string | null;
        shipping_phone: string | null;
      }
    | null = null;
  let lookupFailed = false;

  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("orders")
      .select("order_code, customer_email, customer_phone, shipping_phone")
      .eq("order_code", rawCode)
      .maybeSingle<{
        order_code: string;
        customer_email: string | null;
        customer_phone: string | null;
        shipping_phone: string | null;
      }>();

    if (error) {
      console.error("[/orders/track] lookup error", error);
      lookupFailed = true;
    } else {
      row = data;
    }
  } catch (err) {
    console.error("[/orders/track] lookup exception", err);
    lookupFailed = true;
  }

  if (lookupFailed) {
    redirect("/orders/track?error=server");
  }
  if (!row) {
    redirect("/orders/track?error=notfound");
  }

  let verified = false;
  if (rawEmail && row.customer_email) {
    verified = row.customer_email.toLowerCase() === rawEmail.toLowerCase();
  }
  if (!verified && rawPhone) {
    const tail = normalizePhoneTail(rawPhone);
    if (tail.length >= 6) {
      const customerTail = row.customer_phone
        ? normalizePhoneTail(row.customer_phone)
        : "";
      const shippingTail = row.shipping_phone
        ? normalizePhoneTail(row.shipping_phone)
        : "";
      verified = tail === customerTail || tail === shippingTail;
    }
  }

  if (!verified) {
    redirect("/orders/track?error=notfound");
  }

  redirect(`/orders/${encodeURIComponent(row.order_code)}`);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface TrackPageProps {
  searchParams: Promise<{ error?: string; order_code?: string }>;
}

export default async function OrderTrackPage({ searchParams }: TrackPageProps) {
  const params = await searchParams;
  const errorKey = params.error ?? "";
  const errorMsg = ERROR_MESSAGES[errorKey] ?? null;
  const prefillCode = (params.order_code ?? "").trim();

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-neutral-100">
      <div className="mx-auto flex min-h-[80vh] max-w-xl flex-col justify-center px-4 py-12 lg:px-8">
        <div className="text-center">
          <div
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2"
            style={{
              borderColor: "rgba(212, 168, 67, 0.5)",
              backgroundColor: "rgba(212, 168, 67, 0.12)",
            }}
          >
            <Package className="h-8 w-8" style={{ color: "#D4A843" }} />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-white sm:text-3xl">
            Tra cứu đơn hàng
          </h1>
          <p className="mt-2 text-sm text-neutral-400">
            Nhập mã đơn hàng và email hoặc số điện thoại để theo dõi trạng
            thái.
          </p>
        </div>

        <form
          action={lookupOrder}
          className="mt-8 space-y-4 rounded-xl border border-white/10 bg-[#111] p-6"
        >
          {errorMsg && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <p>{errorMsg}</p>
            </div>
          )}

          <div>
            <label
              htmlFor="order_code"
              className="block text-xs font-semibold uppercase tracking-wide text-neutral-300"
            >
              Mã đơn hàng <span className="text-red-400">*</span>
            </label>
            <input
              id="order_code"
              name="order_code"
              type="text"
              required
              autoComplete="off"
              spellCheck={false}
              defaultValue={prefillCode}
              placeholder="DK12345678"
              maxLength={32}
              className="mt-1.5 w-full rounded-md border border-white/10 bg-[#0a0a0a] px-3 py-2.5 font-mono text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-[#D4A843] focus:outline-none focus:ring-1 focus:ring-[#D4A843]"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold uppercase tracking-wide text-neutral-300"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="email@example.com"
              maxLength={128}
              className="mt-1.5 w-full rounded-md border border-white/10 bg-[#0a0a0a] px-3 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-[#D4A843] focus:outline-none focus:ring-1 focus:ring-[#D4A843]"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-x-0 top-3 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[#111] px-2 text-xs uppercase tracking-wide text-neutral-500">
                hoặc
              </span>
            </div>
          </div>

          <div>
            <label
              htmlFor="phone"
              className="block text-xs font-semibold uppercase tracking-wide text-neutral-300"
            >
              Số điện thoại
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="0987654321"
              maxLength={20}
              inputMode="tel"
              className="mt-1.5 w-full rounded-md border border-white/10 bg-[#0a0a0a] px-3 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-[#D4A843] focus:outline-none focus:ring-1 focus:ring-[#D4A843]"
            />
            <p className="mt-1.5 text-xs text-neutral-500">
              Cần nhập ít nhất 1 trong 2: email hoặc số điện thoại.
            </p>
          </div>

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#D4A843] px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#c4982f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A843]"
          >
            <Search className="h-4 w-4" />
            Tra cứu đơn hàng
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-neutral-500">
          <p>
            Bạn đã có tài khoản?{" "}
            <Link
              href="/profile/orders"
              className="font-medium text-[#D4A843] hover:underline"
            >
              Xem danh sách đơn hàng
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
