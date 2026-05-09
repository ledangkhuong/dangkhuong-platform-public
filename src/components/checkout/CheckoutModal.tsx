"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Copy, Check, Clock, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
}

interface Order {
  id: string;
  code: string;
  qrUrl: string;
  amount: number;
}

interface CheckoutModalProps {
  product: Product;
  onClose: () => void;
  onSuccess: () => void;
}

type PaymentStatus = "idle" | "pending" | "success" | "error";

export default function CheckoutModal({ product, onClose, onSuccess }: CheckoutModalProps) {
  const [step, setStep] = useState<"info" | "payment" | "success">("info");
  const [order, setOrder] = useState<Order | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle");
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(900); // 15 minutes
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  const checkPayment = useCallback(async () => {
    if (!order) return;
    try {
      const res = await fetch(`/api/orders/status?order_id=${order.id}`);
      const data = await res.json();
      if (data.status === "paid") {
        setPaymentStatus("success");
        setStep("success");
        onSuccess();
      }
    } catch {
      // silently retry
    }
  }, [order, onSuccess]);

  // Poll for payment status every 5 seconds
  useEffect(() => {
    if (step !== "payment" || !order) return;
    const interval = setInterval(checkPayment, 5000);
    return () => clearInterval(interval);
  }, [step, order, checkPayment]);

  // Countdown timer
  useEffect(() => {
    if (step !== "payment") return;
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          setPaymentStatus("error");
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [step]);

  const formatCountdown = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const formatPrice = (price: number) =>
    price.toLocaleString("vi-VN") + "₫";

  const handleCreateOrder = async () => {
    if (!fullName.trim() || !email.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: product.id, full_name: fullName, email }),
      });
      const data = await res.json();
      if (data.order) {
        setOrder(data.order);
        setStep("payment");
        setPaymentStatus("pending");
      }
    } catch {
      setPaymentStatus("error");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md card-dark overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid #2a2a2a" }}>
          <div>
            <h2 className="font-bold text-white text-base">
              {step === "success" ? "Thanh toán thành công 🎉" : "Thanh toán"}
            </h2>
            {step !== "success" && (
              <p className="text-xs text-gray-500 mt-0.5">{product.name}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5">
            <X size={18} />
          </button>
        </div>

        {/* Step: Info */}
        {step === "info" && (
          <div className="p-5">
            {/* Product summary */}
            <div className="p-4 rounded-xl mb-5" style={{ background: "#222", border: "1px solid #333" }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-white text-sm mb-1">{product.name}</div>
                  {product.description && (
                    <div className="text-xs text-gray-400 leading-relaxed">{product.description}</div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xl font-bold text-[#22c55e]">{formatPrice(product.price)}</div>
                </div>
              </div>
            </div>

            {/* Contact info */}
            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Họ và tên *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="input-dark w-full text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 font-medium">Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="input-dark w-full text-sm"
                />
              </div>
            </div>

            {/* Payment method */}
            <div className="p-3 rounded-xl mb-5 flex items-center gap-3"
              style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
              <span className="text-2xl">🏦</span>
              <div>
                <div className="text-sm font-medium text-white">Chuyển khoản ngân hàng</div>
                <div className="text-xs text-gray-400">QR Code tự động — xác nhận trong 60 giây</div>
              </div>
              <span className="ml-auto badge-green text-[10px]">Duy nhất</span>
            </div>

            <button
              onClick={handleCreateOrder}
              disabled={loading || !fullName.trim() || !email.trim()}
              className="btn-green w-full justify-center text-sm py-3 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? (
                <span className="flex items-center gap-2"><RefreshCw size={14} className="animate-spin" /> Đang tạo đơn...</span>
              ) : (
                `Tiến hành thanh toán — ${formatPrice(product.price)}`
              )}
            </button>

            <p className="text-center text-[11px] text-gray-600 mt-3">
              Bằng cách tiếp tục, bạn đồng ý với điều khoản sử dụng
            </p>
          </div>
        )}

        {/* Step: Payment QR */}
        {step === "payment" && order && (
          <div className="p-5">
            {/* Countdown */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm">
                <Clock size={14} className={countdown < 120 ? "text-red-400" : "text-[#f59e0b]"} />
                <span className={countdown < 120 ? "text-red-400 font-mono font-bold" : "text-[#f59e0b] font-mono font-bold"}>
                  {formatCountdown(countdown)}
                </span>
                <span className="text-gray-500 text-xs">còn lại</span>
              </div>
              <div className="badge-green text-[10px]">Đang chờ thanh toán</div>
            </div>

            {/* QR Code */}
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-xl bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={order.qrUrl}
                  alt="QR thanh toán"
                  width={200}
                  height={200}
                  className="block"
                />
              </div>
            </div>

            {/* Transfer info */}
            <div className="space-y-2.5 mb-4">
              {[
                { label: "Số tiền", value: formatPrice(order.amount), highlight: true },
                { label: "Nội dung CK", value: `DK${order.code}`, copyable: true },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between p-3 rounded-lg"
                  style={{ background: "#222" }}>
                  <span className="text-xs text-gray-400">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${item.highlight ? "text-[#22c55e]" : "text-white font-mono"}`}>
                      {item.value}
                    </span>
                    {item.copyable && (
                      <button onClick={() => copyToClipboard(item.value)}
                        className="text-gray-500 hover:text-white transition-colors">
                        {copied ? <Check size={13} className="text-[#22c55e]" /> : <Copy size={13} />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-lg text-xs text-gray-400 leading-relaxed"
              style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}>
              <span className="text-[#22c55e] font-medium">⚡ Tự động xác nhận</span> — Sau khi chuyển khoản,
              hệ thống sẽ tự động xác nhận trong vòng 60 giây và mở khoá quyền truy cập ngay lập tức.
            </div>

            {paymentStatus === "error" && (
              <div className="mt-3 p-3 rounded-lg flex items-center gap-2 text-sm"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <AlertCircle size={14} className="text-red-400 shrink-0" />
                <span className="text-red-400">Đã hết thời gian. Vui lòng tạo đơn mới.</span>
              </div>
            )}
          </div>
        )}

        {/* Step: Success */}
        {step === "success" && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(34,197,94,0.15)", border: "2px solid rgba(34,197,94,0.4)" }}>
              <CheckCircle size={32} className="text-[#22c55e]" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Thanh toán thành công!</h3>
            <p className="text-gray-400 text-sm mb-2">
              Cảm ơn bạn đã tin tưởng. Quyền truy cập đã được kích hoạt ngay lập tức.
            </p>
            <p className="text-[#22c55e] text-sm font-medium mb-6">
              Email xác nhận đã được gửi tới <span className="font-semibold">{email}</span>
            </p>
            <div className="space-y-2">
              <button onClick={onClose} className="btn-green w-full justify-center">
                Bắt đầu học ngay 🚀
              </button>
              <button onClick={onClose}
                className="w-full py-2 text-sm text-gray-400 hover:text-white transition-colors">
                Đóng
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
