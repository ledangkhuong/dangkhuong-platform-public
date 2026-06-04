"use client";

/**
 * CheckoutFlow — Client Component orchestrator (Week 4).
 *
 * Trách nhiệm:
 *  - Quản lý state đa-bước (address → shipping → payment → review) qua
 *    `useReducer` thuần (no Zustand/Redux) — pattern đủ dùng cho 4 step.
 *  - Sync `step` lên URL search params (?step=address) để:
 *      • Reload trang giữ nguyên bước hiện tại.
 *      • Browser back/forward hoạt động "natural" cho user.
 *  - Sync form data lên `sessionStorage` để mất tab/đóng tab nhanh không
 *    mất gì (chỉ persist tới khi đặt hàng xong; PII tối thiểu).
 *  - Render `<CheckoutStepper />` ở top + step component tương ứng + sticky
 *    `<OrderSummarySidebar />` bên phải (desktop) / accordion top (mobile).
 *  - Khi user nhấn "Đặt hàng" ở Review → gọi `placeOrderDraft()` từ
 *    `@/lib/actions/checkout`, redirect `/checkout/success?order=DKxxxx`.
 *
 * Type bridging:
 *  - UI types ở `@/types/checkout` dùng snake_case (`full_name`,
 *    `province_code`) — match form field name.
 *  - Server action `placeOrderDraft` dùng camelCase (`fullName`,
 *    `provinceCode`). Map trong `toServerCheckoutState()` ở dưới.
 *
 * Reference: saleor/storefront pattern — client owns step state, server
 * actions chỉ chịu trách nhiệm validate + commit cuối cùng.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { CheckoutStepper } from "@/components/checkout/CheckoutStepper";
import AddressStep from "@/components/checkout/AddressStep";
import ShippingStep from "@/components/checkout/ShippingStep";
import PaymentStep from "@/components/checkout/PaymentStep";
import ReviewStep from "@/components/checkout/ReviewStep";
import OrderSummarySidebar from "@/components/checkout/OrderSummarySidebar";
import { placeOrderDraft } from "@/lib/actions/checkout";
import {
  CHECKOUT_STEPS,
  CHECKOUT_STEP_INDEX,
  INITIAL_CHECKOUT_STATE,
  nextStep,
  prevStep,
  type CheckoutAddress,
  type CheckoutPayment,
  type CheckoutShipping,
  type CheckoutState,
  type CheckoutStep,
  type PaymentMethod,
  type ShippingCarrier,
} from "@/types/checkout";
import type { CartWithItems } from "@/lib/ecommerce/cart-queries";
import { getAddressDisplay } from "@/lib/actions/checkout-display";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CheckoutFlowProps {
  initialCart: CartWithItems;
  isLoggedIn: boolean;
  /** Email của user đã login (nếu có) — dùng pre-fill / lưu lại cho receipt. */
  userEmail?: string | null;
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

type CheckoutAction =
  | { type: "GOTO_STEP"; step: CheckoutStep }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "SET_ADDRESS"; address: CheckoutAddress }
  | { type: "SET_SHIPPING"; shipping: CheckoutShipping }
  | { type: "SET_PAYMENT"; payment: CheckoutPayment }
  | { type: "SET_AGREED"; agreed: boolean }
  | { type: "HYDRATE"; state: CheckoutState };

function checkoutReducer(
  state: CheckoutState,
  action: CheckoutAction,
): CheckoutState {
  switch (action.type) {
    case "GOTO_STEP":
      return { ...state, step: action.step };

    case "NEXT_STEP": {
      const next = nextStep(state.step);
      return next ? { ...state, step: next } : state;
    }

    case "PREV_STEP": {
      const prev = prevStep(state.step);
      return prev ? { ...state, step: prev } : state;
    }

    case "SET_ADDRESS":
      return { ...state, address: action.address };

    case "SET_SHIPPING":
      return { ...state, shipping: action.shipping };

    case "SET_PAYMENT":
      return { ...state, payment: action.payment };

    case "SET_AGREED":
      return { ...state, agreedTerms: action.agreed };

    case "HYDRATE":
      return action.state;

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// SessionStorage persistence
// ---------------------------------------------------------------------------

const SESSION_KEY = "dk_checkout_state_v1";

/** Step từ URL — fallback `'address'` nếu invalid. */
function readStepFromSearchParams(
  searchParams: URLSearchParams,
): CheckoutStep | null {
  const raw = searchParams.get("step");
  if (!raw) return null;
  if ((CHECKOUT_STEPS as readonly string[]).includes(raw)) {
    return raw as CheckoutStep;
  }
  return null;
}

function loadFromSession(): CheckoutState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CheckoutState> | null;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      step:
        parsed.step &&
        (CHECKOUT_STEPS as readonly string[]).includes(parsed.step)
          ? (parsed.step as CheckoutStep)
          : INITIAL_CHECKOUT_STATE.step,
      address: parsed.address,
      shipping: parsed.shipping,
      payment: parsed.payment,
      agreedTerms: Boolean(parsed.agreedTerms),
    };
  } catch {
    return null;
  }
}

function saveToSession(state: CheckoutState) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch {
    // sessionStorage có thể bị disable (private mode trên iOS) — nuốt lỗi.
  }
}

function clearSession() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// UI → Server type bridge
// ---------------------------------------------------------------------------

/**
 * Convert UI snake_case `CheckoutState` → camelCase shape mà
 * `placeOrderDraft()` mong đợi. Trim/normalize tại đây luôn để server không
 * phải đoán.
 */
function toServerCheckoutState(state: CheckoutState): {
  address: {
    fullName: string;
    phone: string;
    email?: string | null;
    addressLine: string;
    provinceCode: string;
    wardCode: string;
    notes?: string | null;
  };
  shippingMethod: {
    carrier: string;
    label?: string | null;
    fee: number;
    etaText?: string | null;
  };
  paymentMethod: {
    code: "sepay" | "payos" | "cod" | "bank_transfer";
    label?: string | null;
  };
} {
  const a = state.address!;
  const s = state.shipping!;
  const p = state.payment!;

  // Map UI carrier → server carrier (server không chấp nhận 'manual',
  // chỉ chấp nhận 'ghn'|'ghtk'|'jt'|'vnpost'|'self'). 'manual' → 'self'.
  const serverCarrier =
    s.carrier === "manual" ? "self" : (s.carrier as string);

  return {
    address: {
      fullName: a.full_name.trim(),
      phone: a.phone.replace(/\s+/g, ""),
      email: a.email?.trim() || null,
      addressLine: a.address_line.trim(),
      provinceCode: a.province_code,
      wardCode: a.ward_code,
      notes: a.notes?.trim() || null,
    },
    shippingMethod: {
      carrier: serverCarrier,
      fee: s.fee,
      etaText: s.expected_days ? `${s.expected_days} ngày` : null,
    },
    paymentMethod: {
      code: p.method,
    },
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CheckoutFlow({
  initialCart,
  isLoggedIn,
  userEmail,
}: CheckoutFlowProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [state, dispatch] = useReducer(checkoutReducer, INITIAL_CHECKOUT_STATE);
  const [hydrated, setHydrated] = useState(false);

  // Address display (tên phường/tỉnh) cho ReviewStep. Resolve qua Server
  // Action wrapper khi state.address thay đổi (debounce nhẹ qua effect).
  const [addressDisplay, setAddressDisplay] = useState<{
    ward: string | null;
    province: string | null;
  }>({ ward: null, province: null });

  // Error chung (submit thất bại) — hiển thị ở Review.
  const [submitError, setSubmitError] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Hydrate: SSR render initial state; sau khi client mount, đọc sessionStorage
  // + URL search params để khôi phục state đúng.
  // -------------------------------------------------------------------------
  useEffect(() => {
    const saved = loadFromSession();
    const urlStep = readStepFromSearchParams(
      new URLSearchParams(searchParams.toString()),
    );

    const base: CheckoutState = saved
      ? { ...saved }
      : { ...INITIAL_CHECKOUT_STATE };

    // URL step ưu tiên hơn session (nếu user share/reload link cụ thể).
    if (urlStep) base.step = urlStep;

    // Nếu user đã login + chưa có email trong address → pre-fill.
    if (isLoggedIn && userEmail && base.address && !base.address.email) {
      base.address = { ...base.address, email: userEmail };
    }

    dispatch({ type: "HYDRATE", state: base });
    setHydrated(true);
    // Chỉ chạy 1 lần lúc mount — searchParams/isLoggedIn/userEmail chỉ dùng
    // làm seed ban đầu. Để chính xác về linter, disable rule cho block này.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------------------------------------
  // Persist state → sessionStorage mỗi khi state đổi (sau hydrate).
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!hydrated) return;
    saveToSession(state);
  }, [state, hydrated]);

  // -------------------------------------------------------------------------
  // Sync `step` lên URL search params (replace, không push) để không phá
  // back/forward stack (chỉ thay query string).
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!hydrated) return;
    const current = searchParams.get("step");
    if (current === state.step) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("step", state.step);
    router.replace(`/checkout?${params.toString()}`, { scroll: false });
  }, [state.step, hydrated, router, searchParams]);

  // -------------------------------------------------------------------------
  // Resolve address display (ward + province names) cho ReviewStep mỗi khi
  // `ward_code` đổi. Tránh fetch nếu chưa đến Review hoặc address chưa đủ.
  // -------------------------------------------------------------------------
  useEffect(() => {
    const wardCode = state.address?.ward_code;
    if (!wardCode) {
      setAddressDisplay({ ward: null, province: null });
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const result = await getAddressDisplay(wardCode);
        if (cancelled) return;
        if (result?.ok) {
          setAddressDisplay({
            ward: result.ward,
            province: result.province,
          });
        } else {
          setAddressDisplay({ ward: null, province: null });
        }
      } catch {
        if (!cancelled) {
          setAddressDisplay({ ward: null, province: null });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state.address?.ward_code]);

  // -------------------------------------------------------------------------
  // Step transitions
  // -------------------------------------------------------------------------

  const handleAddressNext = useCallback((address: CheckoutAddress) => {
    dispatch({ type: "SET_ADDRESS", address });
    dispatch({ type: "NEXT_STEP" });
    // scroll to top khi đổi step để user thấy stepper.
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const handleShippingNext = useCallback((shipping: CheckoutShipping) => {
    dispatch({ type: "SET_SHIPPING", shipping });
    dispatch({ type: "NEXT_STEP" });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const handleBack = useCallback(() => {
    dispatch({ type: "PREV_STEP" });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  /**
   * PaymentStep hiện ký interface `onNext: () => void` (đọc method từ
   * sessionStorage). Wrap để đọc lại method từ sessionStorage và dispatch
   * vào reducer.
   */
  const handlePaymentNext = useCallback(() => {
    let method: PaymentMethod = "sepay";
    try {
      const raw = window.sessionStorage.getItem("dk_checkout_payment");
      if (raw) {
        const parsed = JSON.parse(raw) as { method?: PaymentMethod };
        if (
          parsed.method &&
          ["sepay", "payos", "cod", "bank_transfer"].includes(parsed.method)
        ) {
          method = parsed.method;
        }
      }
    } catch {
      // ignore
    }
    dispatch({ type: "SET_PAYMENT", payment: { method } });
    dispatch({ type: "NEXT_STEP" });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  // -------------------------------------------------------------------------
  // Place order — Review step's onPlace callback.
  // -------------------------------------------------------------------------

  const handlePlaceOrder = useCallback(async () => {
    setSubmitError(null);
    if (!state.address || !state.shipping || !state.payment) {
      throw new Error("Thiếu thông tin checkout — vui lòng kiểm tra lại.");
    }

    const payload = toServerCheckoutState(state);
    const result = await placeOrderDraft(payload);

    if (!result.ok) {
      setSubmitError(result.error);
      throw new Error(result.error);
    }

    // Thành công: clear session checkout + redirect success page.
    clearSession();
    try {
      window.sessionStorage.removeItem("dk_checkout_payment");
    } catch {
      // ignore
    }
    router.push(`/checkout/success?order=${encodeURIComponent(result.orderCode)}`);
  }, [state, router]);

  // -------------------------------------------------------------------------
  // Derived: shipping cho OrderSummarySidebar — chỉ show fee khi đã chọn.
  // -------------------------------------------------------------------------
  const sidebarShipping = useMemo<CheckoutShipping | undefined>(() => {
    if (!state.shipping) return undefined;
    return state.shipping;
  }, [state.shipping]);

  // -------------------------------------------------------------------------
  // Initial address pre-fill cho guest (email từ user nếu có).
  // -------------------------------------------------------------------------
  const initialAddress = useMemo<Partial<CheckoutAddress> | undefined>(() => {
    if (state.address) return state.address;
    if (userEmail) return { email: userEmail };
    return undefined;
  }, [state.address, userEmail]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  // Tránh flash UI sai trước khi hydrate (state.step mặc định là 'address'
  // nhưng URL có thể bảo step='review'). Render skeleton tối giản 1 frame.
  if (!hydrated) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8 lg:py-12">
        <div className="h-10 w-full animate-pulse rounded-lg bg-white/5" />
        <div className="mt-8 h-96 w-full animate-pulse rounded-lg bg-white/5" />
      </div>
    );
  }

  // Step gating: nếu user nhảy URL step quá đà mà data chưa có → kéo về
  // step đầu tiên thiếu data. Avoid showing review without address.
  const currentStepIdx = CHECKOUT_STEP_INDEX[state.step];
  let effectiveStep: CheckoutStep = state.step;
  if (currentStepIdx >= 1 && !state.address) effectiveStep = "address";
  else if (currentStepIdx >= 2 && !state.shipping) effectiveStep = "shipping";
  else if (currentStepIdx >= 3 && !state.payment) effectiveStep = "payment";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8 lg:py-10">
      {/* Header + Stepper */}
      <header className="mb-6 lg:mb-8">
        <h1 className="mb-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Thanh toán
        </h1>
        <CheckoutStepper currentStep={effectiveStep} />
      </header>

      {/* Mobile summary accordion ở top */}
      <div className="lg:hidden mb-6">
        <OrderSummarySidebar
          cart={initialCart}
          shipping={sidebarShipping}
        />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-10">
        {/* Form column — col-span-2 desktop */}
        <section
          className="lg:col-span-2"
          aria-live="polite"
          aria-atomic="false"
        >
          <div className="rounded-xl border border-white/10 bg-[#111] p-5 sm:p-6 lg:p-8">
            {effectiveStep === "address" && (
              <AddressStep
                initialValue={initialAddress}
                onNext={handleAddressNext}
                isGuest={!isLoggedIn}
              />
            )}

            {effectiveStep === "shipping" && state.address && (
              <ShippingStep
                address={state.address}
                initialShipping={state.shipping}
                onNext={handleShippingNext}
                onBack={handleBack}
              />
            )}

            {effectiveStep === "payment" && (
              <PaymentStep onNext={handlePaymentNext} onBack={handleBack} />
            )}

            {effectiveStep === "review" && (
              <ReviewStep
                state={state}
                cart={initialCart}
                addressDisplay={addressDisplay}
                onPlace={handlePlaceOrder}
                onBack={handleBack}
              />
            )}
          </div>

          {submitError && effectiveStep !== "review" && (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-200"
            >
              {submitError}
            </p>
          )}
        </section>

        {/* Sidebar — col-span-1 desktop (hidden mobile, đã render ở top) */}
        <aside className="hidden lg:block lg:col-span-1">
          <OrderSummarySidebar
            cart={initialCart}
            shipping={sidebarShipping}
          />
        </aside>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Re-export types để các test/utility module khác có thể import.
// ---------------------------------------------------------------------------

export type { CheckoutAction };

// Đánh dấu re-use types cho linter — tránh false-positive "unused".
export type _UsedTypes = ShippingCarrier;
