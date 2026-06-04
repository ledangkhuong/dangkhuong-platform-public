"use server";

/**
 * Checkout server actions (Week 4 — Checkout multi-step).
 *
 * Flow 4 bước (Address → Shipping → Payment → Review):
 *  - `validateAddress`  — chạy ở cuối bước 1 (và lại 1 lần ở Review) để
 *    đảm bảo SĐT đúng format VN, ward thuộc đúng province, FK tồn tại.
 *  - `previewOrder`     — tính lại totals (subtotal + ship + total) từ
 *    cart hiện tại; KHÔNG insert orders. Dùng cho Review step.
 *  - `placeOrderDraft`  — insert `orders` (status='pending') + `order_items`
 *    snapshot từ cart_items, sinh `order_code` dạng DKxxxxxxxx, mark
 *    cart status='ordered'. Trả về `{ orderCode }` để caller redirect
 *    `/checkout/success?order=<code>`.
 *
 * Mọi action đều trả `{ ok, ... }` (không throw) — caller không cần
 * try/catch. Dùng `createAdminClient()` cho mutation cross-owner (guest
 * cart → order chưa có user_id hợp lệ trong RLS).
 *
 * Tham chiếu pattern: `saleor/storefront` checkout actions — preview
 * trước, commit sau, snapshot product để đơn hàng bất biến với catalog.
 */

import { randomBytes } from "crypto";

import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentCart } from "@/lib/ecommerce/cart-queries";
import type {
  CartItemHydrated,
  CartWithItems,
} from "@/lib/ecommerce/cart-queries";
import type { OrderType, ProductSnapshot } from "@/types/ecommerce";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Address payload thu thập ở bước 1 (Address).
 * `email` chỉ cần với guest checkout (đã login → bỏ qua, lấy từ auth user).
 */
export interface CheckoutAddress {
  fullName: string;
  phone: string;
  email?: string | null;
  addressLine: string;
  provinceCode: string;
  wardCode: string;
  notes?: string | null;
}

export interface CheckoutShippingMethod {
  /** Mã carrier — placeholder Week 5: 'ghn' | 'ghtk' | 'jt' | 'vnpost' | 'self'. */
  carrier: string;
  /** Tên hiển thị (vd. "Giao Hàng Nhanh"). */
  label?: string | null;
  /** Phí ship đã tính (VND). Week 5 sẽ lấy từ API thật. */
  fee: number;
  /** ETA hiển thị UI, optional. */
  etaText?: string | null;
}

export type CheckoutPaymentMethodCode = "sepay" | "payos" | "cod" | "bank_transfer";

export interface CheckoutPaymentMethod {
  code: CheckoutPaymentMethodCode;
  label?: string | null;
}

export interface CheckoutState {
  address: CheckoutAddress;
  shippingMethod: CheckoutShippingMethod;
  paymentMethod: CheckoutPaymentMethod;
}

/**
 * Lỗi validate trả về dạng field-level để form binding ở client tiện map.
 */
export type AddressFieldErrors = Partial<
  Record<keyof CheckoutAddress | "_form", string>
>;

export type CheckoutResult<T = unknown> =
  | ({ ok: true } & T)
  | { ok: false; error: string; fieldErrors?: AddressFieldErrors };

/**
 * Preview object trả cho Review step. Frontend chỉ cần render — không
 * gọi DB lại. Nếu Week 5/6 đổi shipping/discount, chỉ cần đổi shape ở đây.
 */
export interface OrderPreviewItem {
  productId: string;
  variantId: string | null;
  name: string;
  variantName: string | null;
  thumbnailUrl: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  weightGrams: number;
  itemType: "physical" | "course" | "digital";
}

export interface OrderPreview {
  items: OrderPreviewItem[];
  subtotal: number;
  shippingFee: number;
  /** Reserved cho Week 6 (coupon/discount). Hiện tại = 0. */
  discount: number;
  total: number;
  totalQuantity: number;
  weightGramsTotal: number;
  orderType: OrderType;
  address: CheckoutAddress;
  shippingMethod: CheckoutShippingMethod;
  paymentMethod: CheckoutPaymentMethod;
  /** Cảnh báo "soft" (vd. stock thấp) — không block checkout. */
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type AdminSupabase = Awaited<ReturnType<typeof createAdminClient>>;

/** Regex SĐT VN: bắt đầu 0 hoặc +84, đủ 10 chữ số sau prefix. */
const PHONE_VN_REGEX = /^(0|\+84)[0-9]{9}$/;

/** Email tối giản — đủ chặn typo, không claim chuẩn RFC 5322 đầy đủ. */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizePhone(raw: string): string {
  return (raw ?? "").replace(/[\s.-]/g, "").trim();
}

/**
 * Sinh `order_code` dạng `DK` + 8 ký tự alphanum (chữ hoa + chữ thường +
 * digit, đã loại ký tự dễ nhầm I/l/O/0/1). Dùng `crypto.randomBytes` để
 * tránh collision; UNIQUE constraint ở DB là chốt chặn cuối cùng.
 *
 * Spec user yêu cầu "DKxxxx random 8 chars" → ở đây dùng 8 ký tự sau prefix.
 */
function generateOrderCode(prefix = "DK", length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const maxValid = 256 - (256 % chars.length);
  let result = prefix;
  while (result.length < prefix.length + length) {
    const bytes = randomBytes(length - (result.length - prefix.length));
    for (const byte of bytes) {
      if (byte < maxValid && result.length < prefix.length + length) {
        result += chars[byte % chars.length];
      }
    }
  }
  return result;
}

/**
 * Map snapshot.item_type → cột `order_items.item_type` (CHECK chỉ chấp
 * nhận 'course' | 'physical' | 'digital'). Heuristic Week 4: cart hiện
 * chỉ chứa product `book`/`merch`/`digital` (course chưa vào cart). Coi
 * tất cả là 'physical' trừ khi snapshot/product nói rõ là digital/course.
 */
function inferItemType(
  snapshot: ProductSnapshot | null
): "physical" | "course" | "digital" {
  const raw = (snapshot as { product_type?: string } | null)?.product_type;
  if (raw === "digital") return "digital";
  if (raw === "course") return "course";
  return "physical";
}

/**
 * Suy ra `order_type` cho 1 cart dựa trên items.
 *  - tất cả là course → 'course'
 *  - tất cả là physical/digital → 'physical'
 *  - hỗn hợp course + physical → 'mixed'
 *
 * Week 6 sẽ refine khi course thực sự được phép add vào cart.
 */
function inferOrderType(items: OrderPreviewItem[]): OrderType {
  let hasCourse = false;
  let hasPhysical = false;
  for (const it of items) {
    if (it.itemType === "course") hasCourse = true;
    else hasPhysical = true;
  }
  if (hasCourse && hasPhysical) return "mixed";
  if (hasCourse) return "course";
  return "physical";
}

/**
 * Chuẩn hoá `CartItemHydrated[]` thành `OrderPreviewItem[]` + cộng dồn
 * subtotal, totalQuantity, weight. Reuse cho cả `previewOrder` lẫn
 * `placeOrderDraft` để 2 nhánh không trôi khỏi nhau.
 */
function buildPreviewItems(cart: CartWithItems): {
  items: OrderPreviewItem[];
  subtotal: number;
  totalQuantity: number;
  weightGramsTotal: number;
} {
  let subtotal = 0;
  let totalQuantity = 0;
  let weightGramsTotal = 0;

  const items: OrderPreviewItem[] = cart.items.map(
    (it: CartItemHydrated): OrderPreviewItem => {
      const unitPrice = Number(it.unit_price) || 0;
      const quantity = Number(it.quantity) || 0;
      const lineTotal = unitPrice * quantity;

      // Ưu tiên weight từ variant → snapshot → product (trong product ref
      // chúng ta không lưu weight_grams; phải dựa vào snapshot).
      const weightSnap = Number(
        (it.variant?.weight_grams ??
          it.product_snapshot?.weight_grams ??
          0) as number
      );
      const weight = Number.isFinite(weightSnap) ? weightSnap : 0;

      subtotal += lineTotal;
      totalQuantity += quantity;
      weightGramsTotal += weight * quantity;

      return {
        productId: it.product_id,
        variantId: it.variant_id,
        name: it.product_snapshot?.product_name ?? it.product?.name ?? "Sản phẩm",
        variantName:
          it.product_snapshot?.variant_name ?? it.variant?.name ?? null,
        thumbnailUrl:
          it.product_snapshot?.thumbnail_url ??
          it.product?.thumbnail_url ??
          null,
        quantity,
        unitPrice,
        lineTotal,
        weightGrams: weight,
        itemType: inferItemType(it.product_snapshot),
      };
    }
  );

  return {
    items,
    subtotal: Math.round(subtotal),
    totalQuantity,
    weightGramsTotal,
  };
}

/**
 * Re-check stock 1 lần nữa trước khi chốt order. Trả về danh sách lỗi
 * (mảng rỗng nếu OK). Chỉ check variant (product không variant không có
 * stock tracking ở MVP).
 */
async function validateStock(
  supabase: AdminSupabase,
  items: OrderPreviewItem[]
): Promise<string[]> {
  const errors: string[] = [];
  for (const it of items) {
    if (!it.variantId) continue;
    const { data: variant, error } = await supabase
      .from("product_variants")
      .select("name, stock_count")
      .eq("id", it.variantId)
      .maybeSingle();
    if (error) {
      errors.push(`Không kiểm tra được tồn kho: ${it.name}.`);
      continue;
    }
    if (!variant) {
      errors.push(`Biến thể không tồn tại: ${it.name}.`);
      continue;
    }
    if (variant.stock_count < it.quantity) {
      errors.push(
        `Không đủ hàng cho ${it.name}${
          variant.name ? ` (${variant.name})` : ""
        } — còn ${variant.stock_count}, cần ${it.quantity}.`
      );
    }
  }
  return errors;
}

/**
 * Lấy `user.id` hiện tại (nếu đã login) qua cookie Supabase SSR. Trả về
 * null cho guest. Không throw.
 */
async function getCurrentUserId(): Promise<string | null> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch (err) {
    console.error("[checkout] getCurrentUserId failed", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// 1) validateAddress
// ---------------------------------------------------------------------------

/**
 * Validate địa chỉ ở bước 1 (và 1 lần nữa trước placeOrder để chống
 * tampering client). Kiểm tra:
 *  - Họ tên, địa chỉ chi tiết: bắt buộc, trim.
 *  - SĐT: regex VN.
 *  - Email: regex (nếu được cung cấp — bắt buộc với guest, optional với
 *    user đã login; lớp UI tự enforce).
 *  - province_code tồn tại trong `vn_provinces`.
 *  - ward_code tồn tại trong `vn_wards` và `ward.province_code` ===
 *    `input.provinceCode` (tránh ward bị "nhầm" sang tỉnh khác).
 */
export async function validateAddress(
  address: CheckoutAddress
): Promise<CheckoutResult<{ address: CheckoutAddress }>> {
  try {
    const fieldErrors: AddressFieldErrors = {};

    const fullName = (address?.fullName ?? "").trim();
    if (!fullName) fieldErrors.fullName = "Vui lòng nhập họ tên.";
    else if (fullName.length < 2)
      fieldErrors.fullName = "Họ tên quá ngắn.";

    const phone = normalizePhone(address?.phone ?? "");
    if (!phone) fieldErrors.phone = "Vui lòng nhập số điện thoại.";
    else if (!PHONE_VN_REGEX.test(phone))
      fieldErrors.phone = "Số điện thoại không hợp lệ (VD: 0901234567).";

    const email = (address?.email ?? "").trim();
    if (email && !EMAIL_REGEX.test(email)) {
      fieldErrors.email = "Email không hợp lệ.";
    }

    const addressLine = (address?.addressLine ?? "").trim();
    if (!addressLine)
      fieldErrors.addressLine = "Vui lòng nhập địa chỉ chi tiết.";

    const provinceCode = (address?.provinceCode ?? "").trim();
    if (!provinceCode)
      fieldErrors.provinceCode = "Vui lòng chọn tỉnh/thành.";

    const wardCode = (address?.wardCode ?? "").trim();
    if (!wardCode) fieldErrors.wardCode = "Vui lòng chọn phường/xã.";

    // Nếu đã fail format → trả về ngay, không cần đụng DB.
    if (Object.keys(fieldErrors).length > 0) {
      return {
        ok: false,
        error: "Thông tin địa chỉ chưa hợp lệ.",
        fieldErrors,
      };
    }

    // FK check — province + ward phải tồn tại và khớp nhau.
    const supabase = await createAdminClient();

    const [{ data: province, error: pErr }, { data: ward, error: wErr }] =
      await Promise.all([
        supabase
          .from("vn_provinces")
          .select("code")
          .eq("code", provinceCode)
          .maybeSingle(),
        supabase
          .from("vn_wards")
          .select("code, province_code")
          .eq("code", wardCode)
          .maybeSingle(),
      ]);

    if (pErr) {
      console.error("[checkout] validateAddress province lookup failed", pErr);
      return { ok: false, error: "Không kiểm tra được tỉnh/thành." };
    }
    if (wErr) {
      console.error("[checkout] validateAddress ward lookup failed", wErr);
      return { ok: false, error: "Không kiểm tra được phường/xã." };
    }
    if (!province) {
      fieldErrors.provinceCode = "Tỉnh/thành không tồn tại.";
    }
    if (!ward) {
      fieldErrors.wardCode = "Phường/xã không tồn tại.";
    } else if (ward.province_code !== provinceCode) {
      fieldErrors.wardCode =
        "Phường/xã không thuộc tỉnh/thành đã chọn.";
    }

    if (Object.keys(fieldErrors).length > 0) {
      return {
        ok: false,
        error: "Địa chỉ chưa hợp lệ.",
        fieldErrors,
      };
    }

    // Trả lại address đã normalize (phone không khoảng trắng) — caller
    // nên dùng phiên bản này để gửi đi tiếp.
    return {
      ok: true,
      address: {
        fullName,
        phone,
        email: email || null,
        addressLine,
        provinceCode,
        wardCode,
        notes: (address?.notes ?? "").trim() || null,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[checkout] validateAddress failed", err);
    return { ok: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// 2) previewOrder
// ---------------------------------------------------------------------------

export interface PreviewOrderInput {
  address: CheckoutAddress;
  shippingMethod: CheckoutShippingMethod;
  paymentMethod: CheckoutPaymentMethod;
}

/**
 * Tính preview cho Review step. KHÔNG insert orders. Pipeline:
 *  1. Re-validate address (chống tampering URL/state).
 *  2. Load cart hiện tại — nếu rỗng → fail.
 *  3. Build items + tính subtotal/weight/quantity.
 *  4. Re-check stock 1 lần nữa (warning, không block — caller có thể
 *     vẫn bấm "Đặt hàng" và placeOrderDraft sẽ block lần cuối).
 *  5. Tính total = subtotal + shippingFee - discount(=0 Week 4).
 *  6. Trả về `OrderPreview` để Review step render.
 */
export async function previewOrder(
  input: PreviewOrderInput
): Promise<CheckoutResult<{ preview: OrderPreview }>> {
  try {
    // 1) Address — cần valid trước khi tính ship.
    const addrCheck = await validateAddress(input.address);
    if (!addrCheck.ok) {
      return {
        ok: false,
        error: addrCheck.error,
        fieldErrors: addrCheck.fieldErrors,
      };
    }

    // 2) Cart
    const cart = await getCurrentCart();
    if (!cart || cart.items.length === 0) {
      return { ok: false, error: "Giỏ hàng đang trống." };
    }

    // 3) Items + totals
    const { items, subtotal, totalQuantity, weightGramsTotal } =
      buildPreviewItems(cart);

    // 4) Stock re-check → warnings (không block ở preview).
    const supabase = await createAdminClient();
    const stockErrors = await validateStock(supabase, items);

    // 5) Totals — Week 4 discount = 0 placeholder.
    const shippingFee = Math.max(0, Math.round(Number(input.shippingMethod?.fee) || 0));
    const discount = 0;
    const total = Math.max(0, subtotal + shippingFee - discount);

    const orderType = inferOrderType(items);

    return {
      ok: true,
      preview: {
        items,
        subtotal,
        shippingFee,
        discount,
        total,
        totalQuantity,
        weightGramsTotal,
        orderType,
        address: addrCheck.address,
        shippingMethod: {
          carrier: (input.shippingMethod?.carrier ?? "").trim(),
          label: input.shippingMethod?.label ?? null,
          fee: shippingFee,
          etaText: input.shippingMethod?.etaText ?? null,
        },
        paymentMethod: {
          code: input.paymentMethod?.code ?? "cod",
          label: input.paymentMethod?.label ?? null,
        },
        warnings: stockErrors,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[checkout] previewOrder failed", err);
    return { ok: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// 3) placeOrderDraft
// ---------------------------------------------------------------------------

/**
 * Chốt đơn ở trạng thái `pending` (Week 4 không wire payment thật).
 *
 * Pipeline:
 *  1. Validate address lần cuối (chống tampering).
 *  2. Lấy cart → tính lại totals từ DB (KHÔNG tin số trên client).
 *  3. Re-check stock — nếu fail → return error (block hard).
 *  4. Sinh order_code unique (retry tối đa 3 lần phòng collision).
 *  5. INSERT `orders` với status='pending', payment_method,
 *     shipping_* columns, order_type suy ra từ cart.
 *  6. INSERT `order_items` snapshot từ cart_items (1 row / item).
 *  7. UPDATE cart status='ordered' (giữ cookie — Week 6 sẽ clear sau
 *     khi payment success).
 *  8. Trả `{ orderCode }`. Caller redirect /checkout/success?order=<code>.
 *
 * KHÔNG dùng RPC/transaction tổng — nếu insert order_items fail giữa
 * chừng, ta cố gắng rollback bằng cách xoá order vừa insert (best-effort).
 * Week 6 sẽ thay bằng RPC server-side cho atomic thật.
 */
export async function placeOrderDraft(
  input: CheckoutState
): Promise<
  CheckoutResult<{
    orderCode: string;
    orderId: string;
    paymentMethod: CheckoutPaymentMethodCode;
    requiresPaymentRedirect: boolean;
  }>
> {
  try {
    // 1) Address re-validate
    const addrCheck = await validateAddress(input.address);
    if (!addrCheck.ok) {
      return {
        ok: false,
        error: addrCheck.error,
        fieldErrors: addrCheck.fieldErrors,
      };
    }
    const address = addrCheck.address;

    // Shipping/payment method basic sanity
    const carrier = (input.shippingMethod?.carrier ?? "").trim().toLowerCase();
    const ALLOWED_CARRIERS = new Set([
      "ghn",
      "ghtk",
      "jt",
      "vnpost",
      "self",
    ]);
    if (!carrier || !ALLOWED_CARRIERS.has(carrier)) {
      return { ok: false, error: "Phương thức vận chuyển không hợp lệ." };
    }

    const paymentCodeRaw = (input.paymentMethod?.code ?? "")
      .trim()
      .toLowerCase();
    const ALLOWED_PAYMENTS = new Set<CheckoutPaymentMethodCode>([
      "sepay",
      "payos",
      "cod",
      "bank_transfer",
    ]);
    if (
      !paymentCodeRaw ||
      !ALLOWED_PAYMENTS.has(paymentCodeRaw as CheckoutPaymentMethodCode)
    ) {
      return { ok: false, error: "Phương thức thanh toán không hợp lệ." };
    }
    const paymentCode = paymentCodeRaw as CheckoutPaymentMethodCode;

    // 2) Cart + totals (server-side authoritative)
    const cart = await getCurrentCart();
    if (!cart || cart.items.length === 0) {
      return { ok: false, error: "Giỏ hàng đang trống." };
    }

    const { items, subtotal, totalQuantity, weightGramsTotal } =
      buildPreviewItems(cart);
    void totalQuantity; // chỉ dùng cho UI; orders không có cột này.

    const shippingFee = Math.max(
      0,
      Math.round(Number(input.shippingMethod?.fee) || 0)
    );
    const total = Math.max(0, subtotal + shippingFee);

    const orderType = inferOrderType(items);

    // 3) Stock hard-check
    const supabase = await createAdminClient();
    const stockErrors = await validateStock(supabase, items);
    if (stockErrors.length > 0) {
      return { ok: false, error: stockErrors.join(" ") };
    }

    // 4) Owner — user_id nếu đã login.
    const userId = await getCurrentUserId();

    // 5) Sinh order_code + retry collision tối đa 3 lần.
    let orderCode = generateOrderCode();
    let insertedOrderId: string | null = null;
    let lastErr: unknown = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      // Week 6: payment_method CHECK đã được relax để chấp nhận
      // 'sepay' | 'payos' | 'cod' | 'bank_transfer'. Lưu raw code
      // để webhook/admin biết đúng channel đã chọn.
      const paymentForDb = paymentCode;

      const orderPayload: Record<string, unknown> = {
        order_code: orderCode,
        user_id: userId, // có thể null cho guest — nếu DB NOT NULL sẽ fail
        // sẽ được retry-strip ở dưới nếu cần.
        amount: total,
        status: "pending",
        payment_method: paymentForDb,
        customer_name: address.fullName,
        customer_email: address.email ?? null,
        customer_phone: address.phone,
        note: address.notes ?? null,

        // Shipping columns (Week 1 ALTER orders)
        order_type: orderType,
        shipping_full_name: address.fullName,
        shipping_phone: address.phone,
        shipping_address_line: address.addressLine,
        shipping_ward_code: address.wardCode,
        shipping_province_code: address.provinceCode,
        shipping_notes: address.notes ?? null,
        shipping_fee: shippingFee,
        shipping_carrier: carrier,
        shipping_status: "pending",
        weight_grams_total: weightGramsTotal,
      };

      const { data, error } = await supabase
        .from("orders")
        .insert(orderPayload)
        .select("id, order_code")
        .single();

      if (!error && data) {
        insertedOrderId = data.id as string;
        orderCode = (data.order_code as string) || orderCode;
        lastErr = null;
        break;
      }

      lastErr = error;
      const code = (error as { code?: string } | null)?.code ?? "";
      // 23505 = unique violation → khả năng cao là order_code trùng → retry.
      if (code === "23505") {
        orderCode = generateOrderCode();
        continue;
      }

      // Lỗi khác → bail luôn.
      break;
    }

    if (!insertedOrderId) {
      console.error("[checkout] placeOrderDraft insert order failed", lastErr);
      const msg =
        (lastErr as { message?: string } | null)?.message ??
        "Không tạo được đơn hàng.";
      return { ok: false, error: msg };
    }

    // 6) Insert order_items — 1 row / cart_item, snapshot đầy đủ.
    const orderItemRows = items.map((it) => ({
      order_id: insertedOrderId!,
      product_id: it.productId,
      variant_id: it.variantId,
      course_id: null,
      item_type: it.itemType,
      name: it.variantName ? `${it.name} - ${it.variantName}` : it.name,
      unit_price: it.unitPrice,
      quantity: it.quantity,
      total_price: it.lineTotal,
      weight_grams: it.weightGrams,
      product_snapshot: {
        product_id: it.productId,
        product_name: it.name,
        variant_id: it.variantId,
        variant_name: it.variantName,
        thumbnail_url: it.thumbnailUrl,
        unit_price: it.unitPrice,
        weight_grams: it.weightGrams,
      } satisfies ProductSnapshot,
    }));

    const { error: itemsErr } = await supabase
      .from("order_items")
      .insert(orderItemRows);

    if (itemsErr) {
      // Best-effort rollback — xoá order vừa insert để không có order
      // "rỗng" lơ lửng. Nếu xoá fail cũng nuốt; admin sẽ thấy order rỗng.
      console.error(
        "[checkout] placeOrderDraft insert order_items failed → rollback",
        itemsErr
      );
      await supabase
        .from("orders")
        .delete()
        .eq("id", insertedOrderId)
        .then(
          () => undefined,
          (e) => console.error("[checkout] rollback delete order failed", e)
        );
      return {
        ok: false,
        error: itemsErr.message ?? "Không lưu được chi tiết đơn hàng.",
      };
    }

    // 7) Mark cart as 'ordered'. Không clear cookie — Week 6 sẽ clear
    //    sau khi payment success.
    const { error: cartUpdErr } = await supabase
      .from("carts")
      .update({ status: "ordered", updated_at: new Date().toISOString() })
      .eq("id", cart.id);
    if (cartUpdErr) {
      // Không rollback — order đã hợp lệ, chỉ cart bị stale. Log thôi.
      console.error(
        "[checkout] placeOrderDraft update cart status failed",
        cartUpdErr
      );
    }

    // 8) Tín hiệu cho client biết next action:
    //    - 'payos' → redirect sang PayOS checkout URL (client gọi
    //      /api/payos/create để lấy URL).
    //    - 'sepay' / 'bank_transfer' → hiện QR + chờ webhook xác nhận.
    //    - 'cod' → không cần redirect, đơn ở 'pending' chờ admin confirm.
    //    Shipment KHÔNG tạo ở bước này — đợi payment confirmation
    //    (Sepay/PayOS webhook) hoặc admin manual cho COD.
    const requiresPaymentRedirect = paymentCode === "payos";

    return {
      ok: true,
      orderCode,
      orderId: insertedOrderId,
      paymentMethod: paymentCode,
      requiresPaymentRedirect,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[checkout] placeOrderDraft failed", err);
    return { ok: false, error: msg };
  }
}
