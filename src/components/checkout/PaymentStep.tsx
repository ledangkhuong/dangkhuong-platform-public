'use client';

/**
 * PaymentStep — Week 6 wire-final.
 *
 * 3 phương thức:
 *  - sepay: chuyển khoản qua QR Sepay (tự động xác nhận qua webhook).
 *  - payos: link thanh toán PayOS (MoMo/ZaloPay/Banking).
 *  - cod:   thanh toán khi nhận hàng.
 *
 * `bank_transfer` đã bỏ — flow manual ít dùng, Sepay đã thay thế.
 *
 * Component KHÔNG gọi server action ở đây — chỉ chọn method rồi
 * `onNext({ method })`. Action thật chạy ở Review step (placeOrderDraft)
 * và CheckoutFlow sẽ dispatch redirect tuỳ theo method:
 *   - sepay → /checkout/success?order=...&method=sepay  (page render QR).
 *   - payos → POST /api/payos/create → redirect checkoutUrl.
 *   - cod   → /checkout/success?order=...&method=cod    (page render message).
 */

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Banknote,
  CreditCard,
  QrCode,
} from 'lucide-react';

type PaymentMethod = 'sepay' | 'payos' | 'cod';

interface PaymentOption {
  id: PaymentMethod;
  name: string;
  description: string;
  icon: React.ReactNode;
  warning?: string;
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    id: 'sepay',
    name: 'Sepay',
    description: 'Chuyển khoản qua mã QR Sepay (tự động xác nhận).',
    icon: <QrCode className="h-6 w-6" />,
  },
  {
    id: 'payos',
    name: 'PayOS',
    description: 'MoMo / ZaloPay / Internet Banking qua cổng PayOS.',
    icon: <CreditCard className="h-6 w-6" />,
  },
  {
    id: 'cod',
    name: 'COD — Thanh toán khi nhận hàng',
    description: 'Trả tiền mặt khi nhận hàng từ shipper.',
    icon: <Banknote className="h-6 w-6" />,
    warning: 'Phương thức này cần xác minh thủ công với admin trước khi giao.',
  },
];

const VALID_METHODS: readonly PaymentMethod[] = ['sepay', 'payos', 'cod'];
const STORAGE_KEY = 'dk_checkout_payment';

interface PaymentStepProps {
  /** Cha sẽ nhận `{ method }` để dispatch vào reducer + chuyển step. */
  onNext: (payload: { method: PaymentMethod }) => void;
  onBack: () => void;
  /** Default selected method (từ state đã hydrate ở cha). */
  defaultMethod?: PaymentMethod;
}

export default function PaymentStep({
  onNext,
  onBack,
  defaultMethod,
}: PaymentStepProps) {
  const [method, setMethod] = useState<PaymentMethod>(
    defaultMethod && VALID_METHODS.includes(defaultMethod)
      ? defaultMethod
      : 'sepay',
  );

  // Hydrate from sessionStorage on mount (chỉ khi cha không truyền default).
  useEffect(() => {
    if (defaultMethod) return;
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { method?: PaymentMethod };
        if (parsed.method && VALID_METHODS.includes(parsed.method)) {
          setMethod(parsed.method);
        }
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNext = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ method }));
    } catch {
      // ignore
    }
    onNext({ method });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white">Phương thức thanh toán</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Chọn cách bạn muốn thanh toán đơn hàng.
        </p>
      </div>

      <fieldset className="space-y-3">
        <legend className="sr-only">Phương thức thanh toán</legend>
        {PAYMENT_OPTIONS.map((opt) => {
          const selected = method === opt.id;
          return (
            <label
              key={opt.id}
              htmlFor={`payment-${opt.id}`}
              className="block cursor-pointer"
            >
              <Card
                className={`border bg-[#0a0a0a] p-4 transition-colors ${
                  selected
                    ? 'border-[#D4A843] ring-1 ring-[#D4A843]/40'
                    : 'border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-start gap-4">
                  <input
                    type="radio"
                    name="payment-method"
                    value={opt.id}
                    id={`payment-${opt.id}`}
                    checked={selected}
                    onChange={() => setMethod(opt.id)}
                    className="mt-1 size-4 accent-[#D4A843]"
                  />
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${
                      selected
                        ? 'bg-[#D4A843]/10 text-[#D4A843]'
                        : 'bg-neutral-900 text-neutral-400'
                    }`}
                  >
                    {opt.icon}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="font-medium text-white">{opt.name}</div>
                    <div className="text-sm text-neutral-400">{opt.description}</div>
                    {opt.warning && (
                      <div className="mt-2 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-xs text-amber-300">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>{opt.warning}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </label>
          );
        })}
      </fieldset>

      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="border-neutral-700 bg-transparent text-white hover:bg-neutral-900"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại
        </Button>
        <Button
          type="button"
          onClick={handleNext}
          className="bg-[#D4A843] text-black hover:bg-[#c2992c]"
        >
          Tiếp tục
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
