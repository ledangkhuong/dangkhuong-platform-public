/**
 * Checkout success page — `/checkout/success?order=DKxxxxxxxx`.
 *
 * Server Component. Hiển thị trang xác nhận sau khi `placeOrderDraft()`
 * thành công.
 *
 * Quy tắc:
 *  - Đọc `searchParams.order` (order_code).
 *  - Lookup order qua `createAdminClient()` để bypass RLS — order_code là
 *    secret-ish (8 chars random) nên user nào có link cũng xem được tóm tắt
 *    (không lộ user_id / payment info chi tiết). Tương đương Saleor / Stripe
 *    "thank you" page có session id trên URL.
 *  - Nếu không tìm thấy order → generic success message (không 404 — có thể
 *    cache/network khiến row chưa visible kịp).
 *  - Render checkmark, order_code, hướng dẫn theo payment_method, CTA.
 *
 * Force dynamic (URL search params dynamic).
 */

import "server-only";

import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ShoppingBag, Package } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "Đặt hàng thành công — Lê Đăng Khương Academy",
  description:
    "Cảm ơn bạn đã đặt hàng tại Lê Đăng Khương Academy. Chúng tôi sẽ liên hệ sớm để xác nhận đơn hàng.",
  robots: { index: false, follow: false },
  alternates: { canonical: "https://dangkhuong.com/checkout/success" },
};

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OrderSummary {
  orderCode: string;
  amount: number | null;
  paymentMethod: string | null;
  shippingCarrier: string | null;
  customerName: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VND = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

function formatVnd(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "—";
  }
  return VND.format(Number(value));
}

/**
 * Fetch order tối thiểu thông tin để render trang. KHÔNG bao giờ throw —
 * không tìm thấy → null, lỗi DB → null + log.
 */
async function fetchOrderSummary(
  orderCode: string,
): Promise<OrderSummary | null> {
  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("orders")
      .select(
        "order_code, amount, payment_method, shipping_carrier, customer_name",
      )
      .eq("order_code", orderCode)
      .maybeSingle<{
        order_code: string;
        amount: number | null;
        payment_method: string | null;
        shipping_carrier: string | null;
        customer_name: string | null;
      }>();

    if (error) {
      console.error("[checkout/success] fetchOrderSummary failed", error);
      return null;
    }
    if (!data) return null;

    return {
      orderCode: data.order_code,
      amount: data.amount,
      paymentMethod: data.payment_method,
      shippingCarrier: data.shipping_carrier,
      customerName: data.customer_name,
    };
  } catch (err) {
    console.error("[checkout/success] fetchOrderSummary exception", err);
    return null;
  }
}

/**
 * Map payment_method code → hướng dẫn tiếp theo cho user.
 *
 * Week 4 chưa wire payment thật → tất cả method đều fallback về dòng "Chúng
 * tôi sẽ liên hệ trong 24h". Week 6 sẽ:
 *  - Sepay / PayOS → embed QR component bên dưới.
 *  - COD → giữ message hiện tại.
 */
function paymentInstruction(paymentMethod: string | null): {
  title: string;
  description: string;
} {
  switch (paymentMethod) {
    case "sepay":
    case "payos":
    case "bank_transfer":
      return {
        title: "Thanh toán",
        description:
          "Chúng tôi sẽ liên hệ trong 24h để hướng dẫn thanh toán. (QR thanh toán sẽ hiển thị tự động ở Week 6.)",
      };
    case "cod":
      return {
        title: "Thanh toán khi nhận hàng (COD)",
        description:
          "Đơn hàng sẽ được giao tới địa chỉ bạn cung cấp. Vui lòng chuẩn bị tiền mặt khi shipper đến.",
      };
    default:
      return {
        title: "Xác nhận đơn hàng",
        description: "Chúng tôi sẽ liên hệ trong 24h để xác nhận đơn hàng.",
      };
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface CheckoutSuccessPageProps {
  searchParams: Promise<{ order?: string }>;
}

export default async function CheckoutSuccessPage({
  searchParams,
}: CheckoutSuccessPageProps) {
  const params = await searchParams;
  const orderCode = (params.order ?? "").trim();

  // Lookup order — nếu không có code hoặc không tìm thấy thì hiển thị
  // generic success thay vì 404 (UX tốt hơn cho corner case).
  const summary = orderCode ? await fetchOrderSummary(orderCode) : null;
  const displayedCode = summary?.orderCode ?? (orderCode || null);
  const instruction = paymentInstruction(summary?.paymentMethod ?? null);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-neutral-100">
      <div className="mx-auto flex min-h-[80vh] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center lg:px-8">
        {/* Big checkmark */}
        <div
          className="flex h-24 w-24 items-center justify-center rounded-full border-2"
          style={{
            borderColor: "rgba(34, 197, 94, 0.5)",
            backgroundColor: "rgba(34, 197, 94, 0.12)",
          }}
        >
          <CheckCircle2 className="h-12 w-12" style={{ color: "#22c55e" }} />
        </div>

        <h1 className="mt-6 text-3xl font-bold text-white sm:text-4xl">
          Cảm ơn bạn đã đặt hàng!
        </h1>

        {summary?.customerName && (
          <p className="mt-3 text-base text-neutral-300">
            Chào{" "}
            <span className="font-semibold text-[#D4A843]">
              {summary.customerName}
            </span>
            , đơn hàng của bạn đã được tiếp nhận.
          </p>
        )}

        {!summary?.customerName && (
          <p className="mt-3 max-w-md text-base text-neutral-300">
            Đơn hàng của bạn đã được tiếp nhận. Vui lòng kiểm tra hộp thư để
            xem chi tiết.
          </p>
        )}

        {/* Order code */}
        {displayedCode && (
          <div className="mt-8 inline-flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-[#111] px-6 py-4">
            <span className="text-xs uppercase tracking-wide text-neutral-500">
              Mã đơn hàng
            </span>
            <span className="font-mono text-xl font-bold tracking-wide text-[#D4A843]">
              {displayedCode}
            </span>
            {summary?.amount !== null && summary?.amount !== undefined && (
              <span className="text-sm text-neutral-400">
                Tổng cộng:{" "}
                <span className="font-semibold text-white">
                  {formatVnd(summary.amount)}
                </span>
              </span>
            )}
          </div>
        )}

        {/* Payment / shipping instruction */}
        <div className="mt-8 w-full max-w-md rounded-xl border border-white/10 bg-[#111] p-5 text-left">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-neutral-200">
            <Package className="size-4 text-[#D4A843]" />
            {instruction.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-400">
            {instruction.description}
          </p>

          {summary?.shippingCarrier && (
            <p className="mt-3 text-xs text-neutral-500">
              Đơn vị vận chuyển:{" "}
              <span className="font-medium text-neutral-300">
                {summary.shippingCarrier.toUpperCase()}
              </span>
            </p>
          )}
        </div>

        {/* CTA buttons */}
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/profile/orders"
            className="inline-flex items-center justify-center rounded-md bg-[#D4A843] px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#c4982f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A843]"
          >
            Xem đơn hàng
          </Link>
          <Link
            href="/shop"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 px-6 py-3 text-sm font-medium text-neutral-300 transition-colors hover:border-[#D4A843]/40 hover:text-[#D4A843]"
          >
            <ShoppingBag className="h-4 w-4" />
            Tiếp tục mua sắm
          </Link>
        </div>

        <p className="mt-10 max-w-md text-xs text-neutral-500">
          Nếu có thắc mắc, vui lòng liên hệ qua Zalo/Facebook trong trang
          liên hệ. Chúng tôi sẽ phản hồi trong vòng 24 giờ.
        </p>
      </div>
    </main>
  );
}
