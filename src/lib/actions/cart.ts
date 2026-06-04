"use server";

/**
 * Cart server actions (Week 3 — Giỏ hàng cộng dồn).
 *
 * Pattern lấy cảm hứng từ `vercel/commerce`:
 * - Cookie `dk_cart_id` (UUID) đại diện cho 1 giỏ hàng (carts.cart_token).
 * - Guest user (chưa login) → cart.user_id = null, match qua cart_token.
 * - Khi user login → merge guest cart vào user cart (UPSERT cộng dồn quantity).
 *
 * Tất cả action đều trả về shape `{ ok, ... }` để caller không cần try/catch
 * (không bao giờ `throw` ra ngoài). Không có redirect — caller tự quyết.
 *
 * Vì RLS chỉ cho phép user thao tác giỏ của chính họ HOẶC giỏ guest matching
 * cart_token, ta dùng `createAdminClient()` cho:
 *   - Lookup giỏ guest (server không có session user → RLS user_id mismatch).
 *   - Merge guest → user (đụng 2 row owner khác nhau).
 *   - Snapshot product/variant (đọc cả draft/archived nếu cần).
 *
 * Recompute subtotal sau mỗi mutation: `sum(unit_price * quantity)` từ
 * `cart_items` của cùng cart_id, làm tròn về VND (no fractional).
 */

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/server";
import {
  CART_COOKIE_NAME,
  clearCartTokenCookie,
  ensureCartToken,
  getCartTokenFromCookie,
} from "@/lib/ecommerce/cart-cookie";
import type { Cart, ProductSnapshot } from "@/types/ecommerce";

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export type CartActionResult<T = unknown> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type AdminSupabase = Awaited<ReturnType<typeof createAdminClient>>;

/**
 * Lấy `user.id` của caller (nếu đã login) — dùng session từ cookie Supabase
 * SSR. Vẫn dùng admin client cho DB ops nhưng cần biết ai đang gọi để
 * gắn `user_id` lên cart khi tạo mới / merge.
 *
 * Trả về `null` cho guest. Không bao giờ throw — sai gì cũng coi như guest.
 */
async function getCurrentUserId(): Promise<string | null> {
  try {
    // Import lười để tránh circular giữa cookie helper và server module.
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch (err) {
    console.error("[cart] getCurrentUserId failed", err);
    return null;
  }
}

/**
 * Đảm bảo có 1 cart `active` ứng với (user_id, cart_token) hiện tại.
 *
 * Quy tắc tìm cart:
 *  1) Nếu có user_id → ưu tiên cart `active` của user (user_id = userId).
 *  2) Nếu không → tìm cart `active` theo cart_token (guest).
 *  3) Nếu không có → insert mới với (user_id, cart_token).
 *
 * Hàm này luôn trả về cart đã tồn tại; throw khi DB lỗi.
 */
async function ensureActiveCart(
  supabase: AdminSupabase,
  params: { userId: string | null; cartToken: string }
): Promise<Cart> {
  const { userId, cartToken } = params;

  // 1) Tìm theo user_id trước nếu có.
  if (userId) {
    const { data: userCart, error: userErr } = await supabase
      .from("carts")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    if (userErr) throw userErr;
    if (userCart) return userCart as Cart;
  }

  // 2) Tìm theo cart_token (guest hoặc user chưa kịp link).
  const { data: tokenCart, error: tokenErr } = await supabase
    .from("carts")
    .select("*")
    .eq("cart_token", cartToken)
    .eq("status", "active")
    .maybeSingle();
  if (tokenErr) throw tokenErr;
  if (tokenCart) {
    // Nếu user vừa login mà cart hiện tại vẫn là guest → gắn user_id.
    if (userId && !tokenCart.user_id) {
      const { data: updated, error: updErr } = await supabase
        .from("carts")
        .update({ user_id: userId, updated_at: new Date().toISOString() })
        .eq("id", tokenCart.id)
        .select("*")
        .maybeSingle();
      if (updErr) throw updErr;
      if (updated) return updated as Cart;
    }
    return tokenCart as Cart;
  }

  // 3) Insert mới — cart_token UNIQUE đã có ở DB.
  const expiresAt = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000
  ).toISOString();
  const { data: created, error: insErr } = await supabase
    .from("carts")
    .insert({
      user_id: userId,
      cart_token: cartToken,
      currency: "VND",
      subtotal: 0,
      status: "active",
      expires_at: expiresAt,
    })
    .select("*")
    .single();
  if (insErr) throw insErr;
  return created as Cart;
}

/**
 * Tính lại `subtotal` của 1 cart từ tất cả `cart_items` của nó và update DB.
 * Trả về subtotal mới (đã làm tròn về số nguyên VND).
 */
async function recomputeSubtotal(
  supabase: AdminSupabase,
  cartId: string
): Promise<number> {
  const { data: items, error } = await supabase
    .from("cart_items")
    .select("unit_price, quantity")
    .eq("cart_id", cartId);
  if (error) throw error;

  const subtotal = (items ?? []).reduce((sum, it) => {
    const price = Number(it.unit_price) || 0;
    const qty = Number(it.quantity) || 0;
    return sum + price * qty;
  }, 0);
  const rounded = Math.round(subtotal);

  const { error: updErr } = await supabase
    .from("carts")
    .update({ subtotal: rounded, updated_at: new Date().toISOString() })
    .eq("id", cartId);
  if (updErr) throw updErr;

  return rounded;
}

/**
 * Lấy snapshot {price, snapshot, available} cho product + variant.
 *
 * - Ưu tiên giá variant; fallback giá product nếu variant.price null.
 * - `available` = product.status === 'active' && (variant không có hoặc
 *   stock_count >= requested_qty).
 */
async function loadProductSnapshot(
  supabase: AdminSupabase,
  params: { productId: string; variantId: string | null; quantity: number }
): Promise<
  | {
      ok: true;
      unitPrice: number;
      snapshot: ProductSnapshot;
      stockCount: number | null;
    }
  | { ok: false; error: string }
> {
  const { productId, variantId, quantity } = params;

  const { data: product, error: pErr } = await supabase
    .from("products")
    .select(
      "id, name, slug, thumbnail_url, price, status, weight_grams, sku"
    )
    .eq("id", productId)
    .maybeSingle();
  if (pErr) return { ok: false, error: pErr.message };
  if (!product) return { ok: false, error: "Sản phẩm không tồn tại." };
  if (product.status !== "active") {
    return { ok: false, error: "Sản phẩm hiện không bán." };
  }

  let variantRow: {
    id: string;
    name: string;
    sku: string | null;
    price: number | null;
    stock_count: number;
    weight_grams: number | null;
    attributes: Record<string, string> | null;
  } | null = null;

  if (variantId) {
    const { data: variant, error: vErr } = await supabase
      .from("product_variants")
      .select(
        "id, product_id, name, sku, price, stock_count, weight_grams, attributes"
      )
      .eq("id", variantId)
      .maybeSingle();
    if (vErr) return { ok: false, error: vErr.message };
    if (!variant || variant.product_id !== productId) {
      return { ok: false, error: "Biến thể không hợp lệ." };
    }
    if (variant.stock_count < quantity) {
      return {
        ok: false,
        error: `Không đủ hàng (còn ${variant.stock_count}).`,
      };
    }
    variantRow = {
      id: variant.id,
      name: variant.name,
      sku: variant.sku,
      price: variant.price,
      stock_count: variant.stock_count,
      weight_grams: variant.weight_grams,
      attributes: variant.attributes,
    };
  }

  const unitPrice = Number(variantRow?.price ?? product.price) || 0;

  const snapshot: ProductSnapshot = {
    product_id: product.id,
    product_name: product.name,
    product_slug: product.slug,
    variant_id: variantRow?.id ?? null,
    variant_name: variantRow?.name ?? null,
    sku: variantRow?.sku ?? product.sku ?? null,
    thumbnail_url: product.thumbnail_url,
    unit_price: unitPrice,
    weight_grams: variantRow?.weight_grams ?? product.weight_grams ?? null,
    attributes: variantRow?.attributes ?? null,
  };

  return {
    ok: true,
    unitPrice,
    snapshot,
    stockCount: variantRow?.stock_count ?? null,
  };
}

/**
 * Tìm cart_item theo (cart_id, variant_id). Vì UNIQUE index có chứa
 * variant_id và Postgres coi NULL khác NULL, ta phải tách 2 branch khi
 * variant_id là null (product không có variant).
 */
async function findExistingItem(
  supabase: AdminSupabase,
  params: { cartId: string; productId: string; variantId: string | null }
): Promise<{ id: string; quantity: number } | null> {
  const { cartId, productId, variantId } = params;
  let query = supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", cartId)
    .eq("product_id", productId);

  query = variantId
    ? query.eq("variant_id", variantId)
    : query.is("variant_id", null);

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error("[cart] findExistingItem failed", error);
    return null;
  }
  return data ?? null;
}

function revalidateCartPaths() {
  revalidatePath("/shop");
  revalidatePath("/cart");
}

// ---------------------------------------------------------------------------
// 1) addItem
// ---------------------------------------------------------------------------

export interface AddItemInput {
  productId: string;
  variantId?: string | null;
  quantity?: number;
}

/**
 * Thêm 1 sản phẩm (kèm variant) vào giỏ. Nếu đã có dòng matching
 * (cart_id, variant_id) → cộng dồn quantity. Snapshot product/variant
 * vào cart_items.product_snapshot để khỏi mất tên/giá nếu product bị
 * sửa hoặc xoá về sau.
 */
export async function addItem(
  input: AddItemInput
): Promise<CartActionResult<{ cart: Cart }>> {
  try {
    const productId = (input?.productId ?? "").trim();
    if (!productId) return { ok: false, error: "Thiếu productId." };

    const variantId = input.variantId ?? null;
    const quantity = Math.max(1, Math.floor(Number(input.quantity ?? 1)));
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return { ok: false, error: "Số lượng không hợp lệ." };
    }

    const cartToken = await ensureCartToken();
    const userId = await getCurrentUserId();
    const supabase = await createAdminClient();

    const cart = await ensureActiveCart(supabase, { userId, cartToken });

    // 1) Tính tổng quantity dự kiến (existing + thêm) để check stock 1 lần.
    const existing = await findExistingItem(supabase, {
      cartId: cart.id,
      productId,
      variantId,
    });
    const desiredTotalQty = (existing?.quantity ?? 0) + quantity;

    const snap = await loadProductSnapshot(supabase, {
      productId,
      variantId,
      quantity: desiredTotalQty,
    });
    if (!snap.ok) return { ok: false, error: snap.error };

    // 2) UPSERT — cộng dồn nếu đã có.
    if (existing) {
      const { error: updErr } = await supabase
        .from("cart_items")
        .update({
          quantity: desiredTotalQty,
          unit_price: snap.unitPrice,
          product_snapshot: snap.snapshot,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (updErr) return { ok: false, error: updErr.message };
    } else {
      const { error: insErr } = await supabase.from("cart_items").insert({
        cart_id: cart.id,
        product_id: productId,
        variant_id: variantId,
        quantity,
        unit_price: snap.unitPrice,
        product_snapshot: snap.snapshot,
      });
      if (insErr) return { ok: false, error: insErr.message };
    }

    // 3) Recompute subtotal + revalidate.
    await recomputeSubtotal(supabase, cart.id);

    const { data: refreshed } = await supabase
      .from("carts")
      .select("*")
      .eq("id", cart.id)
      .maybeSingle();

    revalidateCartPaths();

    return { ok: true, cart: (refreshed ?? cart) as Cart };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[cart] addItem failed", err);
    return { ok: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// 2) updateQuantity
// ---------------------------------------------------------------------------

export interface UpdateQuantityInput {
  itemId: string;
  quantity: number;
}

/**
 * Cập nhật số lượng cho 1 cart_item. quantity <= 0 → xoá dòng.
 * Re-check stock_count nếu tăng số lượng so với hiện tại.
 */
export async function updateQuantity(
  input: UpdateQuantityInput
): Promise<CartActionResult> {
  try {
    const itemId = (input?.itemId ?? "").trim();
    if (!itemId) return { ok: false, error: "Thiếu itemId." };

    const nextQty = Math.floor(Number(input.quantity));
    if (!Number.isFinite(nextQty)) {
      return { ok: false, error: "Số lượng không hợp lệ." };
    }

    const supabase = await createAdminClient();

    // Lấy item + cart_id để recompute subtotal sau.
    const { data: item, error: itemErr } = await supabase
      .from("cart_items")
      .select("id, cart_id, product_id, variant_id, quantity")
      .eq("id", itemId)
      .maybeSingle();
    if (itemErr) return { ok: false, error: itemErr.message };
    if (!item) return { ok: false, error: "Item không tồn tại." };

    if (nextQty <= 0) {
      const { error: delErr } = await supabase
        .from("cart_items")
        .delete()
        .eq("id", itemId);
      if (delErr) return { ok: false, error: delErr.message };
    } else {
      // Nếu tăng so với hiện tại → check stock variant.
      if (item.variant_id && nextQty > item.quantity) {
        const { data: variant, error: vErr } = await supabase
          .from("product_variants")
          .select("stock_count")
          .eq("id", item.variant_id)
          .maybeSingle();
        if (vErr) return { ok: false, error: vErr.message };
        if (variant && variant.stock_count < nextQty) {
          return {
            ok: false,
            error: `Không đủ hàng (còn ${variant.stock_count}).`,
          };
        }
      }

      const { error: updErr } = await supabase
        .from("cart_items")
        .update({
          quantity: nextQty,
          updated_at: new Date().toISOString(),
        })
        .eq("id", itemId);
      if (updErr) return { ok: false, error: updErr.message };
    }

    await recomputeSubtotal(supabase, item.cart_id);
    revalidateCartPaths();

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[cart] updateQuantity failed", err);
    return { ok: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// 3) removeItem
// ---------------------------------------------------------------------------

/**
 * Xoá 1 cart_item theo id. Recompute subtotal cart sau khi xoá.
 */
export async function removeItem(itemId: string): Promise<CartActionResult> {
  try {
    const id = (itemId ?? "").trim();
    if (!id) return { ok: false, error: "Thiếu itemId." };

    const supabase = await createAdminClient();

    const { data: item, error: itemErr } = await supabase
      .from("cart_items")
      .select("id, cart_id")
      .eq("id", id)
      .maybeSingle();
    if (itemErr) return { ok: false, error: itemErr.message };
    if (!item) return { ok: true }; // idempotent — đã xoá rồi cũng OK.

    const { error: delErr } = await supabase
      .from("cart_items")
      .delete()
      .eq("id", id);
    if (delErr) return { ok: false, error: delErr.message };

    await recomputeSubtotal(supabase, item.cart_id);
    revalidateCartPaths();

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[cart] removeItem failed", err);
    return { ok: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// 4) clearCart
// ---------------------------------------------------------------------------

/**
 * Xoá toàn bộ items của giỏ hiện tại (giữ row carts, set subtotal=0).
 * Không xoá cart_token cookie — user vẫn có thể add tiếp.
 */
export async function clearCart(): Promise<CartActionResult> {
  try {
    const cartToken = await getCartTokenFromCookie();
    if (!cartToken) return { ok: true }; // chưa có giỏ — coi như đã clear.

    const userId = await getCurrentUserId();
    const supabase = await createAdminClient();

    // Resolve cart đang active: ưu tiên user_id, fallback cart_token.
    let cartId: string | null = null;
    if (userId) {
      const { data: userCart } = await supabase
        .from("carts")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();
      cartId = userCart?.id ?? null;
    }
    if (!cartId) {
      const { data: guestCart } = await supabase
        .from("carts")
        .select("id")
        .eq("cart_token", cartToken)
        .eq("status", "active")
        .maybeSingle();
      cartId = guestCart?.id ?? null;
    }
    if (!cartId) return { ok: true };

    const { error: delErr } = await supabase
      .from("cart_items")
      .delete()
      .eq("cart_id", cartId);
    if (delErr) return { ok: false, error: delErr.message };

    const { error: updErr } = await supabase
      .from("carts")
      .update({ subtotal: 0, updated_at: new Date().toISOString() })
      .eq("id", cartId);
    if (updErr) return { ok: false, error: updErr.message };

    revalidateCartPaths();

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[cart] clearCart failed", err);
    return { ok: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// 5) mergeGuestCartToUser
// ---------------------------------------------------------------------------

/**
 * Merge giỏ guest (matching cart_token) vào giỏ của user vừa login.
 *
 * Các tình huống:
 *  - Không có guest cart → no-op (mergedCount=0), vẫn clear cookie.
 *  - Có guest cart, KHÔNG có user cart → re-assign user_id cho guest cart.
 *  - Có cả 2 → UPSERT từng item của guest vào user cart (cộng dồn quantity),
 *    rồi xoá guest cart. Khi conflict (cart_id, variant_id) trùng, ta cộng
 *    quantity và giữ unit_price + snapshot mới nhất (của guest cart).
 *
 * Trả về mergedCount = số dòng đã insert/update vào user cart.
 */
export async function mergeGuestCartToUser(
  userId: string
): Promise<CartActionResult<{ mergedCount: number }>> {
  try {
    const uid = (userId ?? "").trim();
    if (!uid) return { ok: false, error: "Thiếu userId." };

    const cartToken = await getCartTokenFromCookie();
    if (!cartToken) return { ok: true, mergedCount: 0 };

    const supabase = await createAdminClient();

    // 1) Lookup guest cart theo cart_token (user_id null).
    const { data: guestCart, error: gErr } = await supabase
      .from("carts")
      .select("*")
      .eq("cart_token", cartToken)
      .is("user_id", null)
      .eq("status", "active")
      .maybeSingle();
    if (gErr) return { ok: false, error: gErr.message };

    if (!guestCart) {
      // Không có guest cart — clear cookie để tránh lẫn lộn về sau.
      await clearCartTokenCookie();
      return { ok: true, mergedCount: 0 };
    }

    // 2) Lookup user cart active.
    const { data: userCart, error: uErr } = await supabase
      .from("carts")
      .select("*")
      .eq("user_id", uid)
      .eq("status", "active")
      .maybeSingle();
    if (uErr) return { ok: false, error: uErr.message };

    // 3a) Chỉ có guest → đổi owner.
    if (!userCart) {
      const { error: updErr } = await supabase
        .from("carts")
        .update({
          user_id: uid,
          updated_at: new Date().toISOString(),
        })
        .eq("id", guestCart.id);
      if (updErr) return { ok: false, error: updErr.message };

      revalidateCartPaths();
      // Cookie vẫn giữ cart_token này — giờ trỏ tới cart của user.
      return { ok: true, mergedCount: 0 };
    }

    // 3b) Cả 2 đều có → merge items.
    const { data: guestItems, error: giErr } = await supabase
      .from("cart_items")
      .select(
        "product_id, variant_id, quantity, unit_price, product_snapshot"
      )
      .eq("cart_id", guestCart.id);
    if (giErr) return { ok: false, error: giErr.message };

    let merged = 0;
    for (const gi of guestItems ?? []) {
      const existing = await findExistingItem(supabase, {
        cartId: userCart.id,
        productId: gi.product_id,
        variantId: gi.variant_id,
      });

      if (existing) {
        const { error: updErr } = await supabase
          .from("cart_items")
          .update({
            quantity: existing.quantity + gi.quantity,
            unit_price: gi.unit_price,
            product_snapshot: gi.product_snapshot,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (updErr) return { ok: false, error: updErr.message };
      } else {
        const { error: insErr } = await supabase.from("cart_items").insert({
          cart_id: userCart.id,
          product_id: gi.product_id,
          variant_id: gi.variant_id,
          quantity: gi.quantity,
          unit_price: gi.unit_price,
          product_snapshot: gi.product_snapshot,
        });
        if (insErr) return { ok: false, error: insErr.message };
      }
      merged += 1;
    }

    // 4) Xoá guest cart (cascade xoá items).
    const { error: delErr } = await supabase
      .from("carts")
      .delete()
      .eq("id", guestCart.id);
    if (delErr) return { ok: false, error: delErr.message };

    // 5) Recompute subtotal cho user cart.
    await recomputeSubtotal(supabase, userCart.id);

    // 6) Set cookie trỏ về cart_token của user cart để các request sau
    //    không tạo lại guest cart mới.
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    cookieStore.set({
      name: CART_COOKIE_NAME,
      value: userCart.cart_token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    revalidateCartPaths();

    return { ok: true, mergedCount: merged };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[cart] mergeGuestCartToUser failed", err);
    return { ok: false, error: msg };
  }
}
