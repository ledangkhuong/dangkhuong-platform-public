'use client';

/**
 * ShippingStep — Step 2 of the checkout flow.
 *
 * Week 5 update: gọi `calculateShippingFee()` (GHN realtime) ngay khi vào
 * bước 2 với địa chỉ + tổng weight từ cart. Hiển thị spinner trong lúc
 * fetch, fallback flat-rate 60.000đ + warning nếu GHN trả lỗi.
 *
 * Multi-carrier (GHTK / J&T) hoãn sang Phase 2 — Week 5 chỉ ship GHN.
 */

import { useEffect, useMemo, useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  type CheckoutAddress,
  type CheckoutShipping,
} from '@/types/checkout';
import { cn } from '@/lib/utils';
import { calculateShippingFee } from '@/lib/actions/shipping';
import type { CartWithItems } from '@/lib/ecommerce/cart-queries';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Fallback flat-rate khi GHN fail (VND). */
const FALLBACK_GHN_FEE = 60_000;
/** ETA hiển thị mặc định. */
const DEFAULT_EXPECTED_DAYS = 3;
/** Dimensions mặc định cho 1 sản phẩm (cm) — sách paperback. */
const DEFAULT_ITEM_DIM = { length: 15, width: 10, height: 5 } as const;
/** Cân nặng tối thiểu 1 item (gram) nếu DB không có. */
const DEFAULT_ITEM_WEIGHT_GRAMS = 300;

const VND = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ShippingStepProps {
  /** Address from Step 1 — dùng để tính phí GHN theo (province, ward). */
  address: CheckoutAddress;
  /** Cart hiện tại — cần để tính tổng weight + dimensions per item. */
  cart: CartWithItems;
  /** Previously selected shipping option (khi quay lại Step 2). */
  initialShipping?: CheckoutShipping;
  onNext: (shipping: CheckoutShipping) => void;
  onBack: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface CartShippingPayload {
  weightGrams: number;
  items: Array<{
    length: number;
    width: number;
    height: number;
    weight: number;
    quantity: number;
  }>;
}

/**
 * Tổng hợp weight + dimensions cho từng line item trong cart, dùng làm
 * input cho `calculateShippingFee`. Bỏ qua course/digital — chỉ tính
 * cho item vật lý.
 */
function buildCartShippingPayload(cart: CartWithItems): CartShippingPayload {
  let weightGrams = 0;
  const items: CartShippingPayload['items'] = [];

  for (const it of cart.items) {
    const snap = it.product_snapshot ?? null;
    const productType = (snap as { product_type?: string } | null)?.product_type;
    if (productType === 'course' || productType === 'digital') continue;

    const variantWeight = it.variant?.weight_grams ?? null;
    const snapWeight = (snap as { weight_grams?: number | null } | null)
      ?.weight_grams ?? null;
    const weight = Math.max(
      Number(variantWeight) || Number(snapWeight) || DEFAULT_ITEM_WEIGHT_GRAMS,
      1,
    );

    // Dimensions: ưu tiên snapshot.dimensions_cm, fallback default.
    const snapDims =
      (snap as { dimensions_cm?: Partial<typeof DEFAULT_ITEM_DIM> } | null)
        ?.dimensions_cm ?? null;
    const length = Math.round(
      Number(snapDims?.length) || DEFAULT_ITEM_DIM.length,
    );
    const width = Math.round(
      Number(snapDims?.width) || DEFAULT_ITEM_DIM.width,
    );
    const height = Math.round(
      Number(snapDims?.height) || DEFAULT_ITEM_DIM.height,
    );

    const quantity = Math.max(Number(it.quantity) || 0, 0);

    weightGrams += weight * quantity;
    items.push({ length, width, height, weight, quantity });
  }

  return { weightGrams, items };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type FeeState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; fee: number; source: 'ghn'; expectedDays: number }
  | { status: 'fallback'; fee: number; reason: string };

export function ShippingStep({
  address,
  cart,
  initialShipping,
  onNext,
  onBack,
}: ShippingStepProps) {
  const [feeState, setFeeState] = useState<FeeState>(() => {
    if (initialShipping) {
      return {
        status: 'ready',
        fee: initialShipping.fee,
        source: 'ghn',
        expectedDays:
          initialShipping.expected_days ?? DEFAULT_EXPECTED_DAYS,
      };
    }
    return { status: 'idle' };
  });

  const payload = useMemo(() => buildCartShippingPayload(cart), [cart]);

  // Gọi GHN khi mount (hoặc khi address/cart đổi). Không fetch lại nếu
  // đã có initialShipping (user quay lại từ step sau) — trừ khi user
  // bấm "Tính lại" (chưa implement Week 5).
  useEffect(() => {
    if (!address.province_code || !address.ward_code) return;
    if (initialShipping) return; // giữ giá trị đã chọn trước đó

    let cancelled = false;
    setFeeState({ status: 'loading' });

    void (async () => {
      try {
        const result = await calculateShippingFee({
          provinceCode: address.province_code,
          wardCode: address.ward_code,
          weightGrams: payload.weightGrams,
          items: payload.items,
        });
        if (cancelled) return;

        if (result.ok) {
          setFeeState({
            status: 'ready',
            fee: result.fee,
            source: 'ghn',
            expectedDays: DEFAULT_EXPECTED_DAYS,
          });
        } else {
          setFeeState({
            status: 'fallback',
            fee: FALLBACK_GHN_FEE,
            reason: result.error,
          });
        }
      } catch (err) {
        if (cancelled) return;
        setFeeState({
          status: 'fallback',
          fee: FALLBACK_GHN_FEE,
          reason: err instanceof Error ? err.message : 'Lỗi kết nối GHN.',
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    address.province_code,
    address.ward_code,
    payload.weightGrams,
    payload,
    initialShipping,
  ]);

  const handleContinue = () => {
    if (feeState.status !== 'ready' && feeState.status !== 'fallback') return;
    const fee = feeState.fee;
    const expectedDays =
      feeState.status === 'ready' ? feeState.expectedDays : DEFAULT_EXPECTED_DAYS;
    onNext({
      carrier: 'ghn',
      fee,
      expected_days: expectedDays,
    });
  };

  const isLoading = feeState.status === 'loading' || feeState.status === 'idle';
  const isFallback = feeState.status === 'fallback';
  const displayedFee =
    feeState.status === 'ready' || feeState.status === 'fallback'
      ? feeState.fee
      : null;

  return (
    <div className="space-y-6">
      {/* Address recap */}
      <Card size="sm" className="bg-card/60">
        <CardContent className="space-y-1 text-sm">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Giao đến
          </div>
          <div className="font-medium text-foreground">
            {address.full_name}{' '}
            <span className="text-muted-foreground">· {address.phone}</span>
          </div>
          <div className="text-muted-foreground">{address.address_line}</div>
        </CardContent>
      </Card>

      <div>
        <h2 className="font-heading text-lg text-foreground">
          Đơn vị vận chuyển
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Phí ship được tính realtime từ Giao Hàng Nhanh (GHN) theo cân nặng
          + địa chỉ thực tế.
        </p>
      </div>

      {/* GHN card */}
      <div
        className={cn(
          'flex items-center gap-4 rounded-xl bg-card p-4 ring-2 ring-[#D4A843] bg-[#D4A843]/5',
        )}
      >
        <div
          className={cn(
            'flex size-12 shrink-0 items-center justify-center rounded-lg font-heading text-sm font-semibold bg-emerald-500/15 text-emerald-400',
          )}
          aria-hidden
        >
          GHN
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span className="font-medium text-foreground">
              Giao Hàng Nhanh (GHN)
            </span>
            <span
              className="font-heading text-sm text-[#D4A843]"
              aria-live="polite"
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Loader2 size={14} className="animate-spin" />
                  Đang tính phí...
                </span>
              ) : displayedFee !== null ? (
                VND.format(displayedFee)
              ) : (
                '—'
              )}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span>Dự kiến 2-4 ngày</span>
            <span aria-hidden>·</span>
            <span>Giao toàn quốc, đối tác chính của shop</span>
          </div>
        </div>
      </div>

      {/* Fallback warning */}
      {isFallback && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200"
        >
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-400" />
          <div>
            <div className="font-medium">
              Không tính được phí GHN — đang dùng phí tạm thời{' '}
              {VND.format(FALLBACK_GHN_FEE)}.
            </div>
            {feeState.status === 'fallback' && feeState.reason && (
              <div className="mt-0.5 text-amber-200/80">
                Chi tiết: {feeState.reason}
              </div>
            )}
          </div>
        </div>
      )}

      <p className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground ring-1 ring-foreground/5">
        Phí ship sẽ được khoá lại khi bạn xác nhận đơn ở bước cuối. Nếu phí
        GHN thay đổi do tuyến đường, hệ thống sẽ thông báo trước khi thanh toán.
      </p>

      <div className="flex items-center justify-between gap-3 pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground"
        >
          ← Quay lại
        </Button>
        <Button
          type="button"
          onClick={handleContinue}
          disabled={isLoading}
          className="bg-[#D4A843] text-[#0a0a0a] hover:bg-[#D4A843]/90 disabled:opacity-50"
        >
          {isLoading ? 'Đang tính phí...' : 'Tiếp tục →'}
        </Button>
      </div>
    </div>
  );
}

export default ShippingStep;
