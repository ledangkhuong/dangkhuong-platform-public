'use client';

/**
 * ShippingStep — Step 2 of the checkout flow.
 *
 * Placeholder version (Week 4): user picks one of three Vietnamese carriers
 * with a flat fee. Real rate calculation lands in Week 5 once we wire the
 * GHN (and friends) APIs into shipping/calculateShippingFee().
 *
 * WEEK_5: replace flat-fee with calculateShippingFee(GHN API)
 */

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  type CheckoutAddress,
  type CheckoutShipping,
  type ShippingCarrier,
} from '@/types/checkout';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ShippingStepProps {
  /** Address from Step 1 — shown as a summary so the user has context. */
  address: CheckoutAddress;
  /** Previously selected shipping option (when navigating back into Step 2). */
  initialShipping?: CheckoutShipping;
  onNext: (shipping: CheckoutShipping) => void;
  onBack: () => void;
}

// ---------------------------------------------------------------------------
// Carrier options (Week 4 placeholder rates)
// ---------------------------------------------------------------------------

interface CarrierOption {
  carrier: Exclude<ShippingCarrier, 'manual'>;
  name: string;
  shortName: string;
  /** Flat fee in VND — to be replaced by live GHN/GHTK/J&T quotes in Week 5. */
  fee: number;
  /** Estimated days to deliver — best-effort placeholder. */
  expectedDays: number;
  expectedRange: string;
  /** Short marketing blurb shown under the name. */
  blurb: string;
  /** Logo placeholder text (used as a fallback when no image asset). */
  logoText: string;
  logoBg: string;
  logoFg: string;
}

const CARRIERS: readonly CarrierOption[] = [
  {
    carrier: 'ghn',
    name: 'Giao Hàng Nhanh (GHN)',
    shortName: 'GHN',
    fee: 60_000,
    expectedDays: 3,
    expectedRange: '2-4 ngày',
    blurb: 'Giao toàn quốc, đối tác chính của shop',
    logoText: 'GHN',
    logoBg: 'bg-emerald-500/15',
    logoFg: 'text-emerald-400',
  },
  {
    carrier: 'ghtk',
    name: 'Giao Hàng Tiết Kiệm (GHTK)',
    shortName: 'GHTK',
    fee: 50_000,
    expectedDays: 4,
    expectedRange: '2-4 ngày',
    blurb: 'Tiết kiệm chi phí, phù hợp đơn nhẹ',
    logoText: 'GHTK',
    logoBg: 'bg-amber-500/15',
    logoFg: 'text-amber-400',
  },
  {
    carrier: 'jt',
    name: 'J&T Express',
    shortName: 'J&T',
    fee: 55_000,
    expectedDays: 3,
    expectedRange: '2-4 ngày',
    blurb: 'Mạng lưới rộng, hỗ trợ giao nhanh nội thành',
    logoText: 'J&T',
    logoBg: 'bg-rose-500/15',
    logoFg: 'text-rose-400',
  },
] as const;

const VND = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ShippingStep({
  address,
  initialShipping,
  onNext,
  onBack,
}: ShippingStepProps) {
  const [selected, setSelected] = useState<ShippingCarrier>(
    initialShipping?.carrier ?? 'ghn',
  );

  const handleContinue = () => {
    const option = CARRIERS.find((c) => c.carrier === selected);
    if (!option) return;
    // WEEK_5: replace flat-fee with calculateShippingFee(GHN API)
    onNext({
      carrier: option.carrier,
      fee: option.fee,
      expected_days: option.expectedDays,
    });
  };

  return (
    <div className="space-y-6">
      {/* Address recap — light touch so the user remembers where this ships */}
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
          Chọn đơn vị vận chuyển
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tạm thời áp dụng phí cố định cho mỗi đơn vị. Phí cuối cùng sẽ tính lại
          theo cân nặng + địa chỉ thực tế ở Week 5.
        </p>
      </div>

      <fieldset className="space-y-3">
        <legend className="sr-only">Phương thức vận chuyển</legend>
        {CARRIERS.map((option) => {
          const checked = selected === option.carrier;
          return (
            <label
              key={option.carrier}
              htmlFor={`carrier-${option.carrier}`}
              className={cn(
                'flex cursor-pointer items-center gap-4 rounded-xl bg-card p-4 ring-1 transition-all',
                checked
                  ? 'ring-2 ring-[#D4A843] bg-[#D4A843]/5'
                  : 'ring-foreground/10 hover:ring-foreground/20',
              )}
            >
              <input
                id={`carrier-${option.carrier}`}
                type="radio"
                name="shipping-carrier"
                value={option.carrier}
                checked={checked}
                onChange={() => setSelected(option.carrier)}
                className="size-4 shrink-0 accent-[#D4A843]"
              />

              {/* Logo placeholder — swap for <Image /> once real assets land */}
              <div
                className={cn(
                  'flex size-12 shrink-0 items-center justify-center rounded-lg font-heading text-sm font-semibold',
                  option.logoBg,
                  option.logoFg,
                )}
                aria-hidden
              >
                {option.logoText}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="font-medium text-foreground">
                    {option.name}
                  </span>
                  <span
                    className={cn(
                      'font-heading text-sm',
                      checked ? 'text-[#D4A843]' : 'text-foreground',
                    )}
                  >
                    {VND.format(option.fee)}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span>Dự kiến {option.expectedRange}</span>
                  <span aria-hidden>·</span>
                  <span>{option.blurb}</span>
                </div>
              </div>
            </label>
          );
        })}
      </fieldset>

      <p className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground ring-1 ring-foreground/5">
        Phí ship cuối cùng sẽ tính lại theo cân nặng + địa chỉ thực tế ở Week 5.
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
          className="bg-[#D4A843] text-[#0a0a0a] hover:bg-[#D4A843]/90"
        >
          Tiếp tục →
        </Button>
      </div>
    </div>
  );
}

export default ShippingStep;
