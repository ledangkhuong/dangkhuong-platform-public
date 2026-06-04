/**
 * Checkout flow types — Week 4
 *
 * Multi-step checkout: address → shipping → payment → review
 * State persisted in sessionStorage or URL search params (?step=address).
 *
 * NOTE: Project does NOT use Zod — validation helpers below are hand-written.
 */

// ---------------------------------------------------------------------------
// Step enum
// ---------------------------------------------------------------------------

export type CheckoutStep = 'address' | 'shipping' | 'payment' | 'review';

export const CHECKOUT_STEPS: readonly CheckoutStep[] = [
  'address',
  'shipping',
  'payment',
  'review',
] as const;

export const CHECKOUT_STEP_LABELS: Record<CheckoutStep, string> = {
  address: 'Địa chỉ',
  shipping: 'Vận chuyển',
  payment: 'Thanh toán',
  review: 'Xác nhận',
};

export const CHECKOUT_STEP_INDEX: Record<CheckoutStep, number> = {
  address: 0,
  shipping: 1,
  payment: 2,
  review: 3,
};

// ---------------------------------------------------------------------------
// Step 1 — Address
// ---------------------------------------------------------------------------

export interface CheckoutAddress {
  full_name: string;
  phone: string;
  /** Required for guest checkout (no auth user). Optional for logged-in users. */
  email?: string;
  address_line: string;
  /** FK vn_wards.code */
  ward_code: string;
  /** FK vn_provinces.code */
  province_code: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Step 2 — Shipping
// ---------------------------------------------------------------------------

export type ShippingCarrier = 'ghn' | 'ghtk' | 'jt' | 'manual';

export const SHIPPING_CARRIER_LABELS: Record<ShippingCarrier, string> = {
  ghn: 'Giao Hàng Nhanh (GHN)',
  ghtk: 'Giao Hàng Tiết Kiệm (GHTK)',
  jt: 'J&T Express',
  manual: 'Tự sắp xếp giao hàng',
};

export interface CheckoutShipping {
  carrier: ShippingCarrier;
  /** Carrier-specific service code (e.g. GHN standard vs express). */
  service_code?: string;
  /** Phí ship VND. */
  fee: number;
  /** Số ngày giao dự kiến. */
  expected_days?: number;
}

// ---------------------------------------------------------------------------
// Step 3 — Payment
// ---------------------------------------------------------------------------

export type PaymentMethod = 'sepay' | 'payos' | 'cod' | 'bank_transfer';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  sepay: 'Sepay (QR ngân hàng)',
  payos: 'PayOS',
  cod: 'Thanh toán khi nhận hàng (COD)',
  bank_transfer: 'Chuyển khoản ngân hàng',
};

export interface CheckoutPayment {
  method: PaymentMethod;
}

// ---------------------------------------------------------------------------
// Aggregate state
// ---------------------------------------------------------------------------

export interface CheckoutState {
  step: CheckoutStep;
  address?: CheckoutAddress;
  shipping?: CheckoutShipping;
  payment?: CheckoutPayment;
  agreedTerms: boolean;
}

export const INITIAL_CHECKOUT_STATE: CheckoutState = {
  step: 'address',
  agreedTerms: false,
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface CheckoutValidation {
  errors: Record<keyof CheckoutAddress, string | undefined>;
}

/** Empty error map (all keys present, all undefined) — useful as a reset. */
export const EMPTY_ADDRESS_ERRORS: CheckoutValidation['errors'] = {
  full_name: undefined,
  phone: undefined,
  email: undefined,
  address_line: undefined,
  ward_code: undefined,
  province_code: undefined,
  notes: undefined,
};

// VN phone: starts with 0 or +84, 9–11 digits total after normalization.
const VN_PHONE_RE = /^(?:\+84|0)(?:\d){9,10}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate a CheckoutAddress.
 *
 * @param address  partial address to validate (typically from a form)
 * @param opts.isGuest  when true, email is required and must be valid
 */
export function validateCheckoutAddress(
  address: Partial<CheckoutAddress>,
  opts: { isGuest?: boolean } = {},
): CheckoutValidation {
  const errors: CheckoutValidation['errors'] = { ...EMPTY_ADDRESS_ERRORS };

  if (!address.full_name || address.full_name.trim().length < 2) {
    errors.full_name = 'Vui lòng nhập họ tên (tối thiểu 2 ký tự)';
  } else if (address.full_name.trim().length > 100) {
    errors.full_name = 'Họ tên không được vượt quá 100 ký tự';
  }

  const phone = address.phone?.replace(/\s+/g, '');
  if (!phone) {
    errors.phone = 'Vui lòng nhập số điện thoại';
  } else if (!VN_PHONE_RE.test(phone)) {
    errors.phone = 'Số điện thoại không hợp lệ (ví dụ: 0901234567)';
  }

  if (opts.isGuest) {
    if (!address.email) {
      errors.email = 'Vui lòng nhập email để nhận xác nhận đơn hàng';
    } else if (!EMAIL_RE.test(address.email)) {
      errors.email = 'Email không hợp lệ';
    }
  } else if (address.email && !EMAIL_RE.test(address.email)) {
    errors.email = 'Email không hợp lệ';
  }

  if (!address.address_line || address.address_line.trim().length < 5) {
    errors.address_line = 'Vui lòng nhập địa chỉ chi tiết (số nhà, tên đường…)';
  } else if (address.address_line.trim().length > 255) {
    errors.address_line = 'Địa chỉ không được vượt quá 255 ký tự';
  }

  if (!address.province_code) {
    errors.province_code = 'Vui lòng chọn tỉnh/thành phố';
  }

  if (!address.ward_code) {
    errors.ward_code = 'Vui lòng chọn phường/xã';
  }

  if (address.notes && address.notes.length > 500) {
    errors.notes = 'Ghi chú không được vượt quá 500 ký tự';
  }

  return { errors };
}

export function hasValidationErrors(v: CheckoutValidation): boolean {
  return Object.values(v.errors).some((e) => e !== undefined);
}

/**
 * Validate the Shipping step. Returns an error message or undefined.
 */
export function validateCheckoutShipping(
  shipping: Partial<CheckoutShipping> | undefined,
): string | undefined {
  if (!shipping) return 'Vui lòng chọn phương thức vận chuyển';
  if (!shipping.carrier) return 'Vui lòng chọn đơn vị vận chuyển';
  if (typeof shipping.fee !== 'number' || shipping.fee < 0) {
    return 'Phí vận chuyển không hợp lệ';
  }
  return undefined;
}

/**
 * Validate the Payment step. Returns an error message or undefined.
 */
export function validateCheckoutPayment(
  payment: Partial<CheckoutPayment> | undefined,
): string | undefined {
  if (!payment) return 'Vui lòng chọn phương thức thanh toán';
  if (!payment.method) return 'Vui lòng chọn phương thức thanh toán';
  return undefined;
}

/**
 * Can the user advance from `step`? Used to gate the stepper / Next button.
 */
export function canAdvanceFromStep(
  step: CheckoutStep,
  state: CheckoutState,
  opts: { isGuest?: boolean } = {},
): boolean {
  switch (step) {
    case 'address':
      return (
        !!state.address &&
        !hasValidationErrors(validateCheckoutAddress(state.address, opts))
      );
    case 'shipping':
      return !validateCheckoutShipping(state.shipping);
    case 'payment':
      return !validateCheckoutPayment(state.payment);
    case 'review':
      return (
        state.agreedTerms &&
        !!state.address &&
        !!state.shipping &&
        !!state.payment
      );
    default:
      return false;
  }
}

export function nextStep(step: CheckoutStep): CheckoutStep | null {
  const idx = CHECKOUT_STEP_INDEX[step];
  return CHECKOUT_STEPS[idx + 1] ?? null;
}

export function prevStep(step: CheckoutStep): CheckoutStep | null {
  const idx = CHECKOUT_STEP_INDEX[step];
  return idx > 0 ? CHECKOUT_STEPS[idx - 1] ?? null : null;
}
