/**
 * Full cart page — `/cart`
 *
 * Server Component (Next.js 16 App Router default). Hiển thị toàn bộ giỏ
 * hàng hiện tại của user (đã đăng nhập) hoặc guest (qua cookie token), với
 * layout 2 cột trên desktop (items list + summary sidebar) và stack vertical
 * trên mobile.
 *
 * Khác biệt so với CartSheet (drawer ở header):
 *  - Trang riêng → SEO-friendly URL `/cart`, share-able link.
 *  - Có nhiều "không gian" hơn để hiển thị thumbnail to, variant info, ghi
 *    chú "tính phí ship ở bước tiếp theo".
 *  - Empty state chiếm full viewport thay vì khung Sheet hẹp.
 *
 * Data fetching:
 *  - Dùng `getCurrentCart()` từ `cart-queries.ts` — function này tự resolve
 *    user vs guest, trả về `CartWithItems` đã hydrate (sản phẩm join sẵn,
 *    subtotal tính lại runtime, items sort theo created_at).
 *  - Không tin `cart.subtotal` ở DB; luôn dùng `computedSubtotal` để render
 *    summary (tránh stale nếu mutation cuối cùng fail nửa chừng).
 *
 * Server vs Client boundary:
 *  - Toàn bộ page là Server Component (không "use client").
 *  - Tương tác (tăng/giảm quantity, xoá item) delegate cho client components:
 *      • `<EditQuantityButton />` — useOptimistic + useTransition cho UI
 *        tức thì khi tăng/giảm.
 *      • `<RemoveItemForm />` (inline form bên dưới) — Server Action form,
 *        progressive enhancement (hoạt động không cần JS).
 *  - Form xoá dùng pattern Server Action trực tiếp thay vì client wrapper
 *    để không thêm bundle JS cho mỗi row (Next 15+ optimize Server Actions
 *    qua progressive enhancement form submit).
 *
 * Currency: hard-code VND (matching `carts.currency = 'VND'` constraint).
 *
 * Checkout button → `/checkout` (Week 4, placeholder hiện tại). Link luôn
 * available khi cart có items, không disabled — UX tốt hơn so với việc
 * disable button mà không nói lý do.
 *
 * Force dynamic: cart phụ thuộc cookie + auth → không thể static cache.
 */

import "server-only";

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ShoppingBag, Trash2 } from "lucide-react";

import { EditQuantityButton } from "@/components/cart/EditQuantityButton";
import { removeItem } from "@/lib/actions/cart";
import {
  getCurrentCart,
  type CartItemHydrated,
  type CartWithItems,
} from "@/lib/ecommerce/cart-queries";

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "Giỏ hàng — Lê Đăng Khương Academy",
  description:
    "Xem lại các sản phẩm trong giỏ hàng và tiến hành thanh toán an toàn tại Lê Đăng Khương Academy.",
  // Trang cart không nên xuất hiện trong search engine (private per-user).
  robots: { index: false, follow: false },
  alternates: { canonical: "https://dangkhuong.com/cart" },
};

// Cart phụ thuộc cookie + auth → không thể prerender. `force-dynamic`
// ép Next render từng request, đảm bảo cookie mới nhất luôn được đọc.
export const dynamic = "force-dynamic";

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
    return "Liên hệ";
  }
  return VND.format(Number(value));
}

/**
 * Tóm tắt thông tin variant để hiển thị dưới tên sản phẩm.
 * Lấy `option_values` (jsonb) nếu có, fallback `name` của variant.
 * Trả `null` khi product không có variant (default variant đơn).
 */
function describeVariant(item: CartItemHydrated): string | null {
  const v = item.variant;
  if (!v) return null;

  // `attributes` là jsonb (Record<string, string> | null) lưu các cặp
  // option của variant, vd: { "Màu sắc": "Đen", "Size": "M" }. Render
  // dạng "key: value · key: value" để user dễ đọc.
  const attrs = v.attributes;
  if (attrs && typeof attrs === "object" && !Array.isArray(attrs)) {
    const pairs = Object.entries(attrs as Record<string, unknown>)
      .filter(([, val]) => val !== null && val !== undefined && val !== "")
      .map(([k, val]) => `${k}: ${String(val)}`);
    if (pairs.length > 0) return pairs.join(" · ");
  }

  if (v.name && v.name.trim().length > 0) return v.name;
  return null;
}

/**
 * Resolve tên + thumbnail + slug từ live product join, fallback về
 * `product_snapshot` (jsonb đã lưu lúc add-to-cart) khi product bị xoá.
 * Đảm bảo cart không "vỡ" khi admin archive/delete product.
 */
function resolveItemDisplay(item: CartItemHydrated): {
  name: string;
  thumbnailUrl: string | null;
  slug: string | null;
  productDeleted: boolean;
  productArchived: boolean;
} {
  // `product_snapshot` shape: { product_id, product_name, product_slug,
  // thumbnail_url, unit_price, ... } — đọc trực tiếp từ jsonb đã lưu lúc
  // add-to-cart. Dùng làm fallback khi product join trả `null` (đã bị xoá).
  const snapshot = item.product_snapshot;

  if (item.product) {
    return {
      name: item.product.name,
      thumbnailUrl: item.product.thumbnail_url ?? null,
      slug: item.product.slug ?? null,
      productDeleted: false,
      productArchived: item.product.status !== "active",
    };
  }

  return {
    name: snapshot?.product_name ?? "Sản phẩm đã bị xoá",
    thumbnailUrl: snapshot?.thumbnail_url ?? null,
    slug: snapshot?.product_slug ?? null,
    productDeleted: true,
    productArchived: true,
  };
}

// ---------------------------------------------------------------------------
// Sub-components (server)
// ---------------------------------------------------------------------------

/**
 * Form xoá item dùng Server Action trực tiếp.
 *
 * Vì sao không dùng client button + fetch:
 *  - Server Action form submit là progressive enhancement: hoạt động không
 *    cần JS (fallback POST chuẩn).
 *  - Không cần thêm bundle JS cho mỗi row → cart 20 items vẫn nhẹ.
 *  - Next 15+ tự revalidate route sau Server Action, không cần router.refresh().
 *
 * Hidden input `itemId` được pass qua FormData; wrapper async closure ép
 * đúng kiểu cho `removeItem(itemId)`.
 */
function RemoveItemForm({ itemId }: { itemId: string }) {
  async function action(formData: FormData) {
    "use server";
    const id = String(formData.get("itemId") ?? "");
    if (!id) return;
    await removeItem(id);
  }

  return (
    <form action={action}>
      <input type="hidden" name="itemId" value={itemId} />
      <button
        type="submit"
        aria-label="Xoá sản phẩm khỏi giỏ hàng"
        className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-xs text-neutral-400 transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
      >
        <Trash2 className="h-3.5 w-3.5" />
        <span>Xoá</span>
      </button>
    </form>
  );
}

/**
 * Một row trong cart list. Render thumbnail, tên, variant, đơn giá, control
 * tăng/giảm số lượng, và nút xoá. Trên mobile, layout co lại còn 2 cột
 * (ảnh + info), control + xoá xuống dòng riêng.
 */
function CartItemRow({ item }: { item: CartItemHydrated }) {
  const display = resolveItemDisplay(item);
  const variantLabel = describeVariant(item);
  const unitPrice = Number(item.unit_price);
  const lineTotal = unitPrice * Number(item.quantity);

  // Khi product bị archive hoặc xoá hẳn → khoá tăng số lượng nhưng cho phép
  // giảm về 1 (để user vẫn có thể giảm bớt rồi xoá nếu muốn). Max = current
  // quantity để nút "+" disable, nhưng cho phép giảm xuống 1.
  const canIncrease = !display.productArchived;
  const maxQuantity = canIncrease ? 99 : Number(item.quantity);

  return (
    <li className="flex flex-col gap-4 border-b border-white/5 py-5 last:border-b-0 sm:flex-row sm:items-start sm:gap-5">
      {/* Thumbnail */}
      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-[#0f0f0f] sm:h-24 sm:w-24">
        {display.thumbnailUrl ? (
          <Image
            src={display.thumbnailUrl}
            alt={display.name}
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-neutral-600">
            Chưa có ảnh
          </div>
        )}
      </div>

      {/* Info + controls */}
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          {display.slug && !display.productDeleted ? (
            <Link
              href={`/shop/${display.slug}`}
              className="line-clamp-2 text-sm font-medium text-white transition-colors hover:text-[#D4A843] sm:text-base"
            >
              {display.name}
            </Link>
          ) : (
            <span className="line-clamp-2 text-sm font-medium text-neutral-400 sm:text-base">
              {display.name}
            </span>
          )}

          {variantLabel && (
            <p className="text-xs text-neutral-500">{variantLabel}</p>
          )}

          {display.productArchived && !display.productDeleted && (
            <p className="text-xs text-amber-400">
              Sản phẩm tạm ngừng kinh doanh — chỉ giảm hoặc xoá.
            </p>
          )}
          {display.productDeleted && (
            <p className="text-xs text-red-400">
              Sản phẩm không còn khả dụng.
            </p>
          )}

          <p className="text-sm text-[#D4A843] sm:hidden">
            {formatVnd(unitPrice)}
          </p>
        </div>

        {/* Desktop: price column + qty + remove inline */}
        <div className="flex flex-wrap items-center justify-between gap-3 sm:flex-shrink-0 sm:flex-col sm:items-end sm:gap-3 sm:text-right">
          <div className="hidden text-sm text-neutral-300 sm:block">
            <span className="text-[#D4A843]">{formatVnd(unitPrice)}</span>
            <span className="ml-1 text-neutral-500">/ sản phẩm</span>
          </div>

          <EditQuantityButton
            itemId={item.id}
            initialQuantity={Number(item.quantity)}
            max={maxQuantity}
          />

          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-white tabular-nums">
              {formatVnd(lineTotal)}
            </span>
            <RemoveItemForm itemId={item.id} />
          </div>
        </div>
      </div>
    </li>
  );
}

/**
 * Summary card bên phải (desktop) / dưới items (mobile). Hiển thị subtotal,
 * placeholder shipping, total, và CTA checkout.
 *
 * Sticky trên desktop để khi scroll list items dài thì summary vẫn nhìn thấy.
 */
function CartSummaryCard({ cart }: { cart: CartWithItems }) {
  const subtotal = cart.computedSubtotal;

  return (
    <div className="rounded-lg border border-white/10 bg-[#141414] p-5 lg:sticky lg:top-24">
      <h2 className="mb-4 text-lg font-semibold text-white">Tóm tắt đơn hàng</h2>

      <dl className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-neutral-400">Tạm tính</dt>
          <dd className="font-medium text-white tabular-nums">
            {formatVnd(subtotal)}
          </dd>
        </div>

        <div className="flex items-center justify-between">
          <dt className="text-neutral-400">Phí vận chuyển</dt>
          <dd className="text-xs text-neutral-500">Tính ở bước tiếp theo</dd>
        </div>

        <div className="my-3 border-t border-white/5" />

        <div className="flex items-center justify-between">
          <dt className="text-base font-semibold text-white">Tổng cộng</dt>
          <dd className="text-lg font-bold text-[#D4A843] tabular-nums">
            {formatVnd(subtotal)}
          </dd>
        </div>
      </dl>

      <p className="mt-2 text-xs text-neutral-500">
        Tổng tạm tính chưa bao gồm phí vận chuyển. Bạn sẽ thấy phí ship đầy
        đủ ở bước nhập địa chỉ.
      </p>

      <Link
        href="/checkout"
        className="mt-5 flex w-full items-center justify-center rounded-md bg-[#D4A843] px-4 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#c4982f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4A843]"
      >
        Tiến hành thanh toán
      </Link>

      <Link
        href="/shop"
        className="mt-3 flex w-full items-center justify-center rounded-md border border-white/10 px-4 py-2.5 text-sm font-medium text-neutral-300 transition-colors hover:border-[#D4A843]/40 hover:text-[#D4A843]"
      >
        Tiếp tục mua sắm
      </Link>

      <p className="mt-4 text-center text-[11px] text-neutral-600">
        Thanh toán an toàn · Giao hàng toàn quốc
      </p>
    </div>
  );
}

/**
 * Empty state — full viewport. Khi cart `null` hoặc `items.length === 0`.
 * CTA chính đẩy về `/shop`; CTA phụ về trang chủ cho user lạc đường.
 */
function EmptyCart() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-neutral-100">
      <div className="mx-auto flex min-h-[80vh] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center lg:px-8">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-[#141414]">
          <ShoppingBag className="h-9 w-9 text-[#D4A843]" />
        </div>

        <h1 className="mt-6 text-2xl font-bold text-white sm:text-3xl">
          Giỏ hàng của bạn đang trống
        </h1>
        <p className="mt-3 max-w-md text-sm text-neutral-400 sm:text-base">
          Khám phá các sản phẩm sách, merch và sản phẩm số chính hãng để bắt
          đầu hành trình cùng Lê Đăng Khương Academy.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/shop"
            className="inline-flex items-center justify-center rounded-md bg-[#D4A843] px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#c4982f]"
          >
            Khám phá cửa hàng
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-white/10 px-6 py-3 text-sm font-medium text-neutral-300 transition-colors hover:border-[#D4A843]/40 hover:text-[#D4A843]"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function CartPage() {
  const cart = await getCurrentCart();

  if (!cart || cart.items.length === 0) {
    return <EmptyCart />;
  }

  const totalQuantity = cart.totalQuantity;

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-neutral-100">
      {/* Header */}
      <section className="border-b border-white/5 bg-gradient-to-b from-[#141414] to-[#0a0a0a]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10 lg:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
              Giỏ hàng
            </h1>
            <p className="text-sm text-neutral-400">
              <span className="font-semibold text-[#D4A843]">
                {totalQuantity}
              </span>{" "}
              sản phẩm trong giỏ
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8 lg:py-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-10">
          {/* Items list — col-span-2 desktop */}
          <section className="lg:col-span-2">
            <div className="rounded-lg border border-white/10 bg-[#141414] p-2 sm:p-4">
              <ul role="list" className="divide-y divide-white/5">
                {cart.items.map((item) => (
                  <CartItemRow key={item.id} item={item} />
                ))}
              </ul>
            </div>

            <div className="mt-5 flex justify-end">
              <Link
                href="/shop"
                className="text-sm text-neutral-400 transition-colors hover:text-[#D4A843]"
              >
                ← Tiếp tục mua sắm
              </Link>
            </div>
          </section>

          {/* Summary sidebar — col-span-1 desktop */}
          <aside className="lg:col-span-1">
            <CartSummaryCard cart={cart} />
          </aside>
        </div>
      </div>
    </main>
  );
}
