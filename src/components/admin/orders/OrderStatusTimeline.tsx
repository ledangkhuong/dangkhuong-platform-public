'use client';

import {
  CheckCircle2,
  Circle,
  Clock,
  CreditCard,
  Package,
  ShoppingBag,
  Truck,
} from 'lucide-react';

type OrderLite = {
  status?: string | null;
  shipping_status?: string | null;
  created_at?: string | null;
  paid_at?: string | null;
  actual_delivery_date?: string | null;
};

type ShipmentLite = {
  created_at?: string | null;
  shipped_at?: string | null;
  in_transit_at?: string | null;
  status?: string | null;
} | null;

interface OrderStatusTimelineProps {
  order: OrderLite;
  shipment?: ShipmentLite;
}

type StageState = 'done' | 'current' | 'future';

interface Stage {
  key: string;
  label: string;
  icon: React.ReactNode;
  state: StageState;
  datetime?: string | null;
}

function formatVN(dt?: string | null): string {
  if (!dt) return '';
  try {
    const d = new Date(dt);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function OrderStatusTimeline({ order, shipment }: OrderStatusTimelineProps) {
  const isPaid = order.status === 'paid';
  const hasShipment = Boolean(shipment);
  const shipStatus = order.shipping_status ?? shipment?.status ?? null;
  const isInTransit = shipStatus === 'in_transit' || shipStatus === 'delivered';
  const isDelivered = shipStatus === 'delivered';

  // Determine done states
  const doneFlags = {
    created: true,
    paid: isPaid,
    shipment: hasShipment,
    inTransit: isInTransit,
    delivered: isDelivered,
  };

  // First non-done is "current"
  const order_keys = ['created', 'paid', 'shipment', 'inTransit', 'delivered'] as const;
  let currentKey: (typeof order_keys)[number] | null = null;
  for (const k of order_keys) {
    if (!doneFlags[k]) {
      currentKey = k;
      break;
    }
  }

  const computeState = (key: (typeof order_keys)[number]): StageState => {
    if (doneFlags[key]) return 'done';
    if (currentKey === key) return 'current';
    return 'future';
  };

  const stages: Stage[] = [
    {
      key: 'created',
      label: 'Đặt hàng',
      icon: <ShoppingBag className="h-4 w-4" />,
      state: computeState('created'),
      datetime: order.created_at,
    },
    {
      key: 'paid',
      label: 'Thanh toán',
      icon: <CreditCard className="h-4 w-4" />,
      state: computeState('paid'),
      datetime: order.paid_at,
    },
    {
      key: 'shipment',
      label: 'Tạo vận đơn',
      icon: <Package className="h-4 w-4" />,
      state: computeState('shipment'),
      datetime: shipment?.created_at ?? null,
    },
    {
      key: 'inTransit',
      label: 'Đang giao',
      icon: <Truck className="h-4 w-4" />,
      state: computeState('inTransit'),
      datetime: shipment?.in_transit_at ?? shipment?.shipped_at ?? null,
    },
    {
      key: 'delivered',
      label: 'Đã giao',
      icon: <CheckCircle2 className="h-4 w-4" />,
      state: computeState('delivered'),
      datetime: order.actual_delivery_date,
    },
  ];

  return (
    <div className="rounded-lg border border-white/10 bg-[#0a0a0a] p-5">
      <h3 className="mb-4 text-sm font-semibold text-white">Trạng thái đơn hàng</h3>
      <ol className="relative">
        {stages.map((stage, idx) => {
          const isLast = idx === stages.length - 1;
          const lineDoneColor =
            stage.state === 'done' ? 'bg-green-500/60' : 'bg-white/10';

          const dotBase =
            'relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors';
          const dotClass =
            stage.state === 'done'
              ? `${dotBase} border-green-500 bg-green-500/15 text-green-400`
              : stage.state === 'current'
                ? `${dotBase} border-[#D4A843] bg-[#D4A843]/15 text-[#D4A843] animate-pulse`
                : `${dotBase} border-white/15 bg-white/5 text-white/30`;

          const labelClass =
            stage.state === 'done'
              ? 'text-white'
              : stage.state === 'current'
                ? 'text-[#D4A843]'
                : 'text-white/40';

          const subClass =
            stage.state === 'future' ? 'text-white/30' : 'text-white/50';

          // Render icon: keep stage icon but overlay status indicator visually via dot color
          const dotIcon =
            stage.state === 'done' ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : stage.state === 'current' ? (
              <Clock className="h-4 w-4" />
            ) : (
              <Circle className="h-4 w-4" />
            );

          return (
            <li key={stage.key} className="relative flex gap-4 pb-6 last:pb-0">
              {/* Connecting vertical line */}
              {!isLast && (
                <span
                  aria-hidden
                  className={`absolute left-4 top-8 -ml-px h-full w-0.5 ${lineDoneColor}`}
                />
              )}

              <div className={dotClass}>{dotIcon}</div>

              <div className="flex-1 pt-1">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${labelClass}`}>
                    {stage.label}
                  </span>
                  <span className={`${subClass} opacity-60`}>{stage.icon}</span>
                </div>
                {stage.datetime ? (
                  <p className={`mt-0.5 text-xs ${subClass}`}>
                    {formatVN(stage.datetime)}
                  </p>
                ) : (
                  <p className={`mt-0.5 text-xs ${subClass}`}>
                    {stage.state === 'current' ? 'Đang chờ...' : '—'}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default OrderStatusTimeline;
