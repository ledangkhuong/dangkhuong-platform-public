/**
 * Checkout page — `/checkout` (Week 4 multi-step).
 *
 * Server Component wrapper. Trách nhiệm:
 *  - Fetch giỏ hàng hiện tại qua `getCurrentCart()` (đã hydrate full items).
 *  - Nếu cart trống → redirect `/shop` ngay ở server (không render flow).
 *  - Đọc auth state qua Supabase SSR client → quyết định guest vs logged-in.
 *  - Truyền dữ liệu sang `<CheckoutFlow />` (client) — orchestrator multi-step.
 *
 * Force dynamic vì cart phụ thuộc cookie + auth → không thể prerender.
 *
 * Reference: saleor/storefront — server fetches cart + user, client owns
 * step state để có instant transitions giữa các bước.
 */

import "server-only";

import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCurrentCart } from "@/lib/ecommerce/cart-queries";
import CheckoutFlow from "./_components/CheckoutFlow";

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "Thanh toán — Lê Đăng Khương Academy",
  description:
    "Hoàn tất đơn hàng của bạn: chọn địa chỉ giao hàng, đơn vị vận chuyển và phương thức thanh toán an toàn.",
  // Checkout là trang private per-user → không index.
  robots: { index: false, follow: false },
  alternates: { canonical: "https://dangkhuong.com/checkout" },
};

// Checkout phụ thuộc cart cookie + auth state → không thể static cache.
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function CheckoutPage() {
  // 1) Load cart — nếu rỗng đẩy về /shop ngay trên server để tránh flash
  //    UI checkout rồi mới redirect ở client.
  const cart = await getCurrentCart();
  if (!cart || cart.items.length === 0) {
    redirect("/shop");
  }

  // 2) Auth state — guest hay đã login. Lấy email để pre-fill cho guest
  //    checkout (nếu user vừa nhập email ở step trước) hoặc cho user login
  //    (xác nhận email gửi receipt).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoggedIn = !!user;
  const userEmail = user?.email ?? null;

  // 3) Render orchestrator. Toàn bộ form + step navigation chuyển sang client.
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-neutral-100">
      <CheckoutFlow
        initialCart={cart}
        isLoggedIn={isLoggedIn}
        userEmail={userEmail}
      />
    </main>
  );
}
