/**
 * Server-side cart queries (Week 3 — Cart cộng dồn).
 *
 * Đặc thù module Cart:
 * - Cart có 2 dạng owner: user_id (đã đăng nhập) hoặc cart_token (guest).
 * - RLS cho phép owner xem cart của mình. Với guest, RLS check qua
 *   `cart_token` (so sánh với cookie). Tuy nhiên Postgres RLS không có
 *   quyền đọc cookie HTTP, nên các hàm guest ở dưới sẽ dùng
 *   `createAdminClient()` + lọc thủ công theo `cart_token` đã đọc từ
 *   cookie ở Server Component / Server Action.
 * - User flow vẫn ưu tiên dùng `createClient()` (RLS-aware) để tận dụng
 *   policy cấp DB.
 *
 * KHÔNG export ra client. Mọi hàm async, throw khi DB lỗi.
 */

import "server-only";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getCartTokenFromCookie } from "@/lib/ecommerce/cart-cookie";
import type {
  Cart,
  CartItem,
  Product,
  ProductVariant,
} from "@/types/ecommerce";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Tối thiểu thông tin product cần render trong cart UI / checkout summary.
 * `status` đi kèm để client biết product đã bị `archived` → disable nút
 * "tăng số lượng" nhưng vẫn hiển thị item (dữ liệu lịch sử).
 */
export type CartItemProductRef = Pick<
  Product,
  "id" | "name" | "slug" | "thumbnail_url" | "status"
>;

export interface CartItemHydrated extends CartItem {
  product: CartItemProductRef | null;
  variant: ProductVariant | null;
}

/**
 * Shape mà toàn bộ tầng UI (server components, server actions, components
 * khách hàng được hydrate qua props) sẽ tiêu thụ. Tính toán lại:
 * - `computedSubtotal` = Σ (unit_price * quantity)  — không tin cột
 *   `carts.subtotal` ở DB (có thể stale nếu mutation cuối cùng fail nửa
 *   chừng); UI luôn dùng giá trị tính tại runtime.
 * - `totalQuantity`    = Σ quantity                 — dùng cho badge header.
 */
export interface CartWithItems extends Cart {
  items: CartItemHydrated[];
  computedSubtotal: number;
  totalQuantity: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function toError(scope: string, error: unknown): Error {
  const msg =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message)
      : String(error);
  return new Error(`[ecommerce/cart-queries:${scope}] ${msg}`);
}

/**
 * Select string dùng chung cho mọi query cart: lấy đầy đủ cột cart +
 * join cart_items + product (chỉ field cần) + variant đầy đủ.
 *
 * Lưu ý PostgREST: `!fk_name` ép buộc dùng đúng foreign key, tránh
 * ambiguous khi cùng bảng có nhiều FK.
 */
const CART_SELECT = `
  *,
  items:cart_items (
    *,
    product:products!cart_items_product_id_fkey (
      id, name, slug, thumbnail_url, status
    ),
    variant:product_variants!cart_items_variant_id_fkey ( * )
  )
`;

/**
 * Chuẩn hoá row DB → `CartWithItems`: đảm bảo `items` luôn là mảng,
 * tính `computedSubtotal` + `totalQuantity`, ép `product`/`variant`
 * về `null` khi join trả về undefined (sản phẩm đã bị xoá khỏi DB).
 *
 * Sắp xếp items theo `created_at ASC` để UI ổn định giữa các lần fetch.
 */
function hydrateCart(
  row: Cart & {
    items:
      | Array<
          CartItem & {
            product: CartItemProductRef | null;
            variant: ProductVariant | null;
          }
        >
      | null;
  }
): CartWithItems {
  const rawItems = row.items ?? [];

  const items: CartItemHydrated[] = rawItems
    .map((it) => ({
      ...it,
      product: it.product ?? null,
      variant: it.variant ?? null,
    }))
    .sort((a, b) => {
      const aT = a.created_at ?? "";
      const bT = b.created_at ?? "";
      return aT < bT ? -1 : aT > bT ? 1 : 0;
    });

  let computedSubtotal = 0;
  let totalQuantity = 0;
  for (const it of items) {
    // `unit_price` là numeric trong DB → có thể tới dưới dạng string khi
    // qua PostgREST. `Number()` xử lý cả 2 trường hợp; NaN → 0 để không
    // làm subtotal sai lệch nếu data lỗi.
    const price = Number(it.unit_price);
    const qty = Number(it.quantity);
    if (Number.isFinite(price) && Number.isFinite(qty)) {
      computedSubtotal += price * qty;
      totalQuantity += qty;
    }
  }

  // Loại bỏ trường `items` thô trước khi spread để TS không complain về
  // việc gán đè kiểu (row.items có shape khác CartItemHydrated[]).
  const { items: _omit, ...cart } = row;
  void _omit;

  return {
    ...cart,
    items,
    computedSubtotal,
    totalQuantity,
  };
}

// ---------------------------------------------------------------------------
// 1) getCartByToken — guest cart lookup theo cookie
// ---------------------------------------------------------------------------

/**
 * Lấy cart guest theo `cart_token` (cookie). Dùng admin client vì RLS
 * không "biết" cookie HTTP; thay vào đó chúng ta tự lọc theo token đã
 * trust từ cookie HttpOnly.
 *
 * Chỉ trả về cart `status = 'active'` (cart đã `ordered`/`abandoned`/
 * `expired` không nên hiện trên UI guest nữa).
 */
export async function getCartByToken(
  token: string
): Promise<CartWithItems | null> {
  if (!token || typeof token !== "string") return null;

  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("carts")
    .select(CART_SELECT)
    .eq("cart_token", token)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.error("[ecommerce/cart-queries] getCartByToken failed", {
      token,
      error,
    });
    throw toError("getCartByToken", error);
  }
  if (!data) return null;

  return hydrateCart(
    data as Cart & {
      items:
        | Array<
            CartItem & {
              product: CartItemProductRef | null;
              variant: ProductVariant | null;
            }
          >
        | null;
    }
  );
}

// ---------------------------------------------------------------------------
// 2) getCartByUserId — cart của user đã đăng nhập
// ---------------------------------------------------------------------------

/**
 * Lấy cart `active` của 1 user cụ thể. Dùng admin client để gọi được
 * từ Server Action sau khi đã verify `user.id` qua `supabase.auth.getUser()`.
 *
 * Theo schema, mỗi user có tối đa 1 cart `active` tại một thời điểm
 * (logic enforce ở Server Action insert; nếu DB có nhiều → lấy bản
 * `updated_at` mới nhất để self-heal).
 */
export async function getCartByUserId(
  userId: string
): Promise<CartWithItems | null> {
  if (!userId || typeof userId !== "string") return null;

  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("carts")
    .select(CART_SELECT)
    .eq("user_id", userId)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[ecommerce/cart-queries] getCartByUserId failed", {
      userId,
      error,
    });
    throw toError("getCartByUserId", error);
  }
  if (!data) return null;

  return hydrateCart(
    data as Cart & {
      items:
        | Array<
            CartItem & {
              product: CartItemProductRef | null;
              variant: ProductVariant | null;
            }
          >
        | null;
    }
  );
}

// ---------------------------------------------------------------------------
// 3) getCurrentCart — entry point chính cho UI
// ---------------------------------------------------------------------------

/**
 * Resolve "cart hiện tại" dựa trên ngữ cảnh request:
 *
 *   1. Nếu user đã đăng nhập (qua `supabase.auth.getUser()`) → ưu tiên
 *      cart theo `user_id`.
 *   2. Nếu chưa đăng nhập (hoặc user chưa có cart) → fallback sang
 *      `cart_token` cookie.
 *
 * Trả về `null` khi cả 2 nhánh đều không có cart — caller (UI) hiểu là
 * "cart trống / chưa khởi tạo" và không hiện Sheet.
 *
 * Không tự động tạo cart mới — việc tạo phải đi qua Server Action
 * `addToCart()` để đảm bảo cookie được set đúng request đó.
 */
export async function getCurrentCart(): Promise<CartWithItems | null> {
  // 1) Thử lấy user qua RLS-aware client. `getUser()` validate JWT với
  //    Supabase server (an toàn hơn `getSession()` decode local).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.id) {
    const userCart = await getCartByUserId(user.id);
    if (userCart) return userCart;
    // Nếu user chưa có cart riêng nhưng còn cookie guest → fall through
    // xuống nhánh token (sẽ được merge ở Server Action `mergeGuestCart`
    // ngay sau login, nhưng trong cùng request đầu tiên ta vẫn show
    // được nội dung cart guest cho UX không bị "nhảy về 0").
  }

  // 2) Guest path — đọc cookie token.
  const token = await getCartTokenFromCookie();
  if (!token) return null;

  return getCartByToken(token);
}

// ---------------------------------------------------------------------------
// 4) getCartItemCount — badge header (tổng số lượng items)
// ---------------------------------------------------------------------------

/**
 * Đếm tổng `quantity` của cart hiện tại để render badge ở header.
 *
 * Tối ưu: chỉ select `quantity` của cart_items thay vì hydrate full cart.
 * Trả về 0 khi không có cart (an toàn cho SSR/streaming).
 *
 * NOTE: vẫn cần 2 query (auth check + cart lookup + items) nhưng tránh
 * select product/variant join để giảm payload. Nếu cần tối ưu hơn ở
 * tương lai → tạo SQL view `cart_summary` hoặc RPC.
 */
export async function getCartItemCount(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = await createAdminClient();

  // Resolve cart_id của cart active hiện tại (ưu tiên user, fallback token).
  let cartId: string | null = null;

  if (user?.id) {
    const { data, error } = await admin
      .from("carts")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[ecommerce/cart-queries] getCartItemCount user lookup failed", error);
      throw toError("getCartItemCount", error);
    }
    cartId = data?.id ?? null;
  }

  if (!cartId) {
    const token = await getCartTokenFromCookie();
    if (!token) return 0;

    const { data, error } = await admin
      .from("carts")
      .select("id")
      .eq("cart_token", token)
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      console.error("[ecommerce/cart-queries] getCartItemCount token lookup failed", error);
      throw toError("getCartItemCount", error);
    }
    cartId = data?.id ?? null;
  }

  if (!cartId) return 0;

  const { data: items, error: itemsError } = await admin
    .from("cart_items")
    .select("quantity")
    .eq("cart_id", cartId);

  if (itemsError) {
    console.error("[ecommerce/cart-queries] getCartItemCount items failed", itemsError);
    throw toError("getCartItemCount", itemsError);
  }

  let total = 0;
  for (const row of items ?? []) {
    const q = Number((row as { quantity: number }).quantity);
    if (Number.isFinite(q)) total += q;
  }
  return total;
}
