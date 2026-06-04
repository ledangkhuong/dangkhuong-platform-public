'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, QrCode, CreditCard, Banknote, AlertTriangle } from 'lucide-react';

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
    description: 'Chuyển khoản qua mã QR Sepay (tự động xác nhận)',
    icon: <QrCode className="h-6 w-6" />,
  },
  {
    id: 'payos',
    name: 'PayOS',
    description: 'Thanh toán PayOS (Visa / Master / ngân hàng nội địa)',
    icon: <CreditCard className="h-6 w-6" />,
  },
  {
    id: 'cod',
    name: 'COD - Thanh toán khi nhận hàng',
    description: 'Trả tiền mặt khi nhận hàng từ shipper',
    icon: <Banknote className="h-6 w-6" />,
    warning: 'Phương thức này cần xác minh thủ công với admin trước khi giao.',
  },
];

interface PaymentStepProps {
  onNext: () => void;
  onBack: () => void;
}

const STORAGE_KEY = 'dk_checkout_payment';

export default function PaymentStep({ onNext, onBack }: PaymentStepProps) {
  const [method, setMethod] = useState<PaymentMethod>('sepay');

  // Hydrate from sessionStorage on mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { method?: PaymentMethod };
        if (parsed.method && ['sepay', 'payos', 'cod'].includes(parsed.method)) {
          setMethod(parsed.method);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const handleNext = () => {
    // TODO: WEEK_6 wire Sepay redirect + PayOS createPaymentRequest
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ method }));
    } catch {
      // ignore
    }
    onNext();
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
