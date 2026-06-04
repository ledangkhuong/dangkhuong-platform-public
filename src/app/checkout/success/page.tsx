/**
 * Checkout success page — `/checkout/success?order=DKxxxxxxxx&method=sepay|payos|cod`.
 *
 * Server Component (Week 6 wire-final).
 *
 * Branching theo `method`:
 *  - sepay  → render SepayQrPanel client component (QR + nội dung chuyển khoản
 *             + poll status). Sau khi webhook xác nhận → status=paid.
 *  - payos  → "Đang xác minh thanh toán PayOS" — user vừa quay lại từ
 *             cổng PayOS. Status sẽ cập nhật từ webhook /api/payos/webhook.
 *  - cod    → message "Đơn hàng đã được nhận, chúng tôi sẽ gọi xác nhận
 *             trong 24h".
 *
 * Nếu `order_type` ∈ {physical, mixed} → render tóm tắt địa chỉ giao hàng +
 * link tracking sang `/orders/[orderCode]` (page tracking đã có sẵn).
 *
 * Order code 8 ký tự đóng vai trò secret token (giống Stripe thank you), vì
 * vậy dùng `createAdminClient()` bypass RLS.
 *
 * Force dynamic — searchParams + DB lookup.
 */

import "server-only";

import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  CreditCard,
  MapPin,
  Package,
  ShoppingBag,
  Truck,
} from "lucide-react";

import { createAdminClient } from "@/lib/supabase/server";
import SepayQrPanel from "./SepayQrPanel";

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

type DisplayMethod = "sepay" | "payos" | "cod" | "bank_transfer" | null;
type OrderTypeValue = "course" | "physical" | "mixed" | null;

interface OrderSummary {
  orderId: string;
  orderCode: string;
  amount: number | null;
  paymentMethod: DisplayMethod;
  shippingCarrier: string | null;
  customerName: string | null;
  orderType: OrderTypeValue;
  status: string | null;
  shippingFullName: string | null;
  shippingPhone: string | null;
  shippingAddressLine: string | null;
  shippingWardCode: string | null;
  shippingProvinceCode: string | null;
  shippingFee: number | null;
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

/** Fetch order tối thiểu thông tin để render. Không bao giờ throw. */
async function fetchOrderSummary(
  orderCode: string,
): Promise<OrderSummary | null> {
  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("orders")
      .select(
        [
          "id",
          "order_code",
          "amount",
          "payment_method",
          "shipping_carrier",
          "customer_name",
          "order_type",
          "status",
          "shipping_full_name",
          "shipping_phone",
          "shipping_address_line",
          "shipping_ward_code",
          "shipping_province_code",
          "shipping_fee",
        ].join(","),
      )
      .eq("order_code", orderCode)
      .maybeSingle<{
        id: string;
        order_code: string;
        amount: number | null;
        payment_method: string | null;
        shipping_carrier: string | null;
        customer_name: string | null;
        order_type: string | null;
        status: string | null;
        shipping_full_name: string | null;
        shipping_phone: string | null;
        shipping_address_line: string | null;
        shipping_ward_code: string | null;
        shipping_province_code: string | null;
        shipping_fee: number | null;
      }>();

    if (error) {
      console.error("[checkout/success] fetchOrderSummary failed", error);
      return null;
    }
    if (!data) return null;

    const pm = (data.payment_method ?? "").toLowerCase();
    const validMethods: DisplayMethod[] = [
      "sepay",
      "payos",
      "cod",
      "bank_transfer",
    ];
    const paymentMethod: DisplayMethod = validMethods.includes(pm as DisplayMethod)
      ? (pm as DisplayMethod)
      : null;

    const ot = (data.order_type ?? "").toLowerCase();
    const orderType: OrderTypeValue =
      ot === "course" || ot === "physical" || ot === "mixed"
        ? (ot as OrderTypeValue)
        : null;

    return {
      orderId: data.id,
      orderCode: data.order_code,
      amount: data.amount,
      paymentMethod,
      shippingCarrier: data.shipping_carrier,
      customerName: data.customer_name,
      orderType,
      status: data.status,
      shippingFullName: data.shipping_full_name,
      shippingPhone: data.shipping_phone,
      shippingAddressLine: data.shipping_address_line,
      shippingWardCode: data.shipping_ward_code,
      shippingProvinceCode: data.shipping_province_code,
      shippingFee: data.shipping_fee,
    };
  } catch (err) {
    console.error("[checkout/success] fetchOrderSummary exception", err);
    return null;
  }
}

/** Resolve ward + province names cho display block. Trả null nếu fail. */
async function fetchAddressLabels(
  wardCode: string | null,
  provinceCode: string | null,
): Promise<{ ward: string | null; province: string | null }> {
  if (!wardCode && !provinceCode) return { ward: null, province: null };
  try {
    const supabase = await createAdminClient();
    const [wardRes, provinceRes] = await Promise.all([
      wardCode
        ? supabase
            .from("vn_wards")
            .select("name")
            .eq("code", wardCode)
            .maybeSingle<{ name: string }>()
        : Promise.resolve({ data: null, error: null }),
      provinceCode
        ? supabase
            .from("vn_provinces")
            .select("name")
            .eq("code", provinceCode)
            .maybeSingle<{ name: string }>()
        : Promise.resolve({ data: null, error: null }),
    ]);
    return {
      ward: wardRes.data?.name ?? null,
      province: provinceRes.data?.name ?? null,
    };
  } catch (err) {
    console.error("[checkout/success] fetchAddressLabels failed", err);
    return { ward: null, province: null };
  }
}

/** Sepay QR URL — match pattern dùng ở /api/orders/create. */
function buildSepayQrUrl(amount: number, orderCode: string): string | null {
  const bankAccount = process.env.SEPAY_BANK_ACCOUNT;
  const bankCode = process.env.SEPAY_BANK_CODE;
  if (!bankAccount || !bankCode || bankAccount.includes("your-")) {
    return null;
  }
  return `/api/qr?bank=${encodeURIComponent(bankCode)}&acc=${encodeURIComponent(
    bankAccount,
  )}&amount=${encodeURIComponent(String(amount))}&des=${encodeURIComponent(
    orderCode,
  )}`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface CheckoutSuccessPageProps {
  searchParams: Promise<{
    order?: string;
    method?: string;
    payos_failed?: string;
  }>;
}

export default async function CheckoutSuccessPage({
  searchParams,
}: CheckoutSuccessPageProps) {
  const params = await searchParams;
  const orderCode = (params.order ?? "").trim();
  const methodParam = (params.method ?? "").trim().toLowerCase();
  const payosFailed = params.payos_failed === "1";

  const summary = orderCode ? await fetchOrderSummary(orderCode) : null;
  const displayedCode = summary?.orderCode ?? (orderCode || null);

  // Effective method: ưu tiên URL param (vì SSR có thể chạy trước khi
  // order row visible — race tiny window) → fallback DB → cuối cùng null.
  const validMethods = ["sepay", "payos", "cod", "bank_transfer"] as const;
  type ValidMethod = (typeof validMethods)[number];
  const isValidMethod = (m: string): m is ValidMethod =>
    (validMethods as readonly string[]).includes(m);

  const effectiveMethod: ValidMethod | null = isValidMethod(methodParam)
    ? methodParam
    : summary?.paymentMethod && isValidMethod(summary.paymentMethod)
      ? summary.paymentMethod
      : null;

  const isPhysicalOrMixed =
    summary?.orderType === "physical" || summary?.orderType === "mixed";

  // Address labels (chỉ fetch nếu có shipping address).
  const addressLabels = isPhysicalOrMixed
    ? await fetchAddressLabels(
        summary?.shippingWardCode ?? null,
        summary?.shippingProvinceCode ?? null,
      )
    : { ward: null, province: null };

  // Sepay QR url — chỉ build khi method=sepay + có amount.
  const sepayQrUrl =
    effectiveMethod === "sepay" && summary?.amount
      ? buildSepayQrUrl(Number(summary.amount), summary.orderCode)
      : null;

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-neutral-100">
      <div className="mx-auto flex min-h-[80vh] max-w-2xl flex-col items-center px-4 py-12 text-center lg:px-8 lg:py-16">
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

        {summary?.customerName ? (
          <p className="mt-3 text-base text-neutral-300">
            Chào{" "}
            <span className="font-semibold text-[#D4A843]">
              {summary.customerName}
            </span>
            , đơn hàng của bạn đã được tiếp nhận.
          </p>
        ) : (
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

        {/* PayOS create-fail banner (rare): user vẫn còn đơn pending,
            nhưng PayOS không tạo được link → hướng dẫn liên hệ admin. */}
        {payosFailed && (
          <div className="mt-6 flex w-full max-w-md items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-left text-sm text-amber-200">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <div>
              <div className="font-semibold">
                Không tạo được link thanh toán PayOS
              </div>
              <div className="mt-1 text-xs text-amber-300/80">
                Đơn hàng vẫn được lưu. Vui lòng liên hệ admin qua Zalo/Facebook
                để được hỗ trợ thanh toán.
              </div>
            </div>
          </div>
        )}

        {/* ─── Payment instruction block (branched by method) ─── */}
        {effectiveMethod === "sepay" || effectiveMethod === "bank_transfer" ? (
          <div className="mt-8 w-full max-w-md">
            {sepayQrUrl && summary?.amount ? (
              <SepayQrPanel
                qrUrl={sepayQrUrl}
                amount={Number(summary.amount)}
                transferContent={summary.orderCode}
                orderId={summary.orderId}
              />
            ) : (
              <div className="rounded-xl border border-white/10 bg-[#111] p-5 text-left">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-neutral-200">
                  <CreditCard className="size-4 text-[#D4A843]" />
                  Thông tin chuyển khoản
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">
                  Hệ thống chưa cấu hình QR tự động. Admin sẽ liên hệ trong 24h
                  để hướng dẫn chuyển khoản.
                </p>
              </div>
            )}
          </div>
        ) : effectiveMethod === "payos" ? (
          <div className="mt-8 w-full max-w-md rounded-xl border border-white/10 bg-[#111] p-5 text-left">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-neutral-200">
              <Clock className="size-4 text-[#D4A843]" />
              Đang xác minh thanh toán PayOS
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-400">
              Nếu bạn đã hoàn tất thanh toán trên cổng PayOS, hệ thống sẽ tự
              động cập nhật trong vài giây. Bạn có thể đóng trang này — chúng
              tôi sẽ gửi email xác nhận khi giao dịch hoàn tất.
            </p>
          </div>
        ) : effectiveMethod === "cod" ? (
          <div className="mt-8 w-full max-w-md rounded-xl border border-white/10 bg-[#111] p-5 text-left">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-neutral-200">
              <Package className="size-4 text-[#D4A843]" />
              Thanh toán khi nhận hàng (COD)
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-400">
              Đơn hàng đã được nhận, chúng tôi sẽ gọi xác nhận trong 24h. Vui
              lòng chuẩn bị tiền mặt khi shipper giao hàng.
            </p>
          </div>
        ) : (
          <div className="mt-8 w-full max-w-md rounded-xl border border-white/10 bg-[#111] p-5 text-left">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-neutral-200">
              <Package className="size-4 text-[#D4A843]" />
              Xác nhận đơn hàng
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-400">
              Chúng tôi sẽ liên hệ trong 24h để xác nhận đơn hàng.
            </p>
          </div>
        )}

        {/* ─── Shipping summary (physical / mixed only) ─── */}
        {isPhysicalOrMixed && summary && (
          <div className="mt-6 w-full max-w-md rounded-xl border border-white/10 bg-[#111] p-5 text-left">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-neutral-200">
              <Truck className="size-4 text-[#D4A843]" />
              Giao hàng
            </h2>

            {summary.shippingFullName && (
              <div className="mt-3 space-y-1.5 text-sm text-neutral-300">
                <div className="font-semibold text-white">
                  {summary.shippingFullName}
                </div>
                {summary.shippingPhone && (
                  <div className="text-xs text-neutral-400">
                    {summary.shippingPhone}
                  </div>
                )}
                {summary.shippingAddressLine && (
                  <div className="flex items-start gap-2 text-xs text-neutral-400">
                    <MapPin className="mt-0.5 size-3.5 shrink-0" />
                    <span>
                      {summary.shippingAddressLine}
                      {addressLabels.ward ? `, ${addressLabels.ward}` : ""}
                      {addressLabels.province
                        ? `, ${addressLabels.province}`
                        : ""}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-xs">
              <span className="text-neutral-500">Đơn vị vận chuyển</span>
              <span className="font-medium text-neutral-200">
                {summary.shippingCarrier
                  ? summary.shippingCarrier.toUpperCase()
                  : "Sẽ xác nhận"}
              </span>
            </div>
            {summary.shippingFee !== null &&
              summary.shippingFee !== undefined && (
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-neutral-500">Phí vận chuyển</span>
                  <span className="font-medium text-neutral-200">
                    {formatVnd(summary.shippingFee)}
                  </span>
                </div>
              )}

            {displayedCode && (
              <Link
                href={`/orders/${encodeURIComponent(displayedCode)}`}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#D4A843]/40 px-4 py-2 text-xs font-semibold text-[#D4A843] transition-colors hover:bg-[#D4A843]/10"
              >
                <Truck className="size-3.5" />
                Theo dõi đơn hàng
              </Link>
            )}
          </div>
        )}

        {/* ─── CTA buttons ─── */}
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          {displayedCode ? (
            <Link
              href={`/orders/${encodeURIComponent(displayedCode)}`}
              className="inline-flex items-center justify-center rounded-md bg-[#D4A843] px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#c4982f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A843]"
            >
              Theo dõi đơn hàng
            </Link>
          ) : (
            <Link
              href="/profile/orders"
              className="inline-flex items-center justify-center rounded-md bg-[#D4A843] px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#c4982f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A843]"
            >
              Xem đơn hàng
            </Link>
          )}
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
