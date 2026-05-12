"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, Copy, Check, Clock, CheckCircle, AlertCircle, RefreshCw, CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
}

interface Order {
  id: string;
  code: string;
  qrUrl: string | null;
  amount: number;
  transferContent: string;
  manual: boolean;
}

interface CheckoutModalProps {
  product: Product;
  onClose: () => void;
  onSuccess: () => void;
}

type PaymentStatus = "idle" | "pending" | "success" | "error";

export default function CheckoutModal({ product, onClose, onSuccess }: CheckoutModalProps) {
  const [step, setStep] = useState<"creating" | "payment" | "success">("creating");
  const [order, setOrder] = useState<Order | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle");
  const [copied, setCopied] = useState<string>("");
  const [countdown, setCountdown] = useState(900);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const autoCreatedRef = useRef(false);

  // Auto-fetch user info on mount
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("id", user.id)
          .single();
        setFullName(profile?.full_name ?? user.email?.split("@")[0] ?? "");
        setEmail(user.email ?? "");
        setPhone(profile?.phone ?? "");
      }
    };
    fetchUser();
  }, []);

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

  const handleCreateOrder = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: product.id,
          customer_name: fullName || "Khách hàng",
          customer_email: email,
          customer_phone: phone,
        }),
      });
      const data = await res.json();
      if (data.success && data.order) {
        setOrder({
          id: data.order.id,
          code: data.paymentInfo?.transfer_content || data.order.order_code,
          qrUrl: data.paymentInfo?.qr_url || null,
          amount: data.order.amount,
          transferContent: data.paymentInfo?.transfer_content || `DK${data.order.order_code}`,
          manual: data.paymentInfo?.manual || false,
        });
        setStep("payment");
        setPaymentStatus("pending");
      } else {
        setErrorMsg(data.error || "Không thể tạo đơn hàng");
        setPaymentStatus("error");
      }
    } catch {
      setErrorMsg("Lỗi kết nối. Vui lòng thử lại.");
      setPaymentStatus("error");
    } finally {
      setLoading(false);
    }
  }, [fullName, email, phone, product.id, loading]);

  // Auto-create order once user data is loaded
  useEffect(() => {
    if (fullName && email && !autoCreatedRef.current) {
      autoCreatedRef.current = true;
      handleCreateOrder();
    }
  }, [fullName, email, handleCreateOrder]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(""), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

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

        {/* Step: Creating order */}
        {step === "creating" && (
          <div className="p-5">
            <div className="p-4 rounded-xl mb-5" style={{ background: "#222", border: "1px solid #333" }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-white text-sm mb-1">{product.name}</div>
                  {product.description && (
                    <div className="text-xs text-gray-400 leading-relaxed">{product.description}</div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xl font-bold text-[#D4A843]">{formatPrice(product.price)}</div>
                </div>
              </div>
            </div>

            {!errorMsg && (
              <div className="flex items-center justify-center py-6">
                <span className="flex items-center gap-2 text-sm text-gray-400">
                  <RefreshCw size={14} className="animate-spin" /> Đang tạo đơn thanh toán...
                </span>
              </div>
            )}

            {errorMsg && (
              <>
                <div className="p-3 rounded-lg flex items-center gap-2 text-sm mb-4"
                  style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <AlertCircle size={14} className="text-red-400 shrink-0" />
                  <span className="text-red-400">{errorMsg}</span>
                </div>
                <button
                  onClick={() => { autoCreatedRef.current = false; setPaymentStatus("idle"); setErrorMsg(""); handleCreateOrder(); }}
                  className="btn-green w-full justify-center text-sm py-3">
                  Thử lại
                </button>
              </>
            )}
          </div>
        )}

        {/* Step: Payment */}
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

            {/* QR Code (if Sepay configured) */}
            {order.qrUrl && (
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
            )}

            {/* Manual transfer info (when no Sepay) */}
            {order.manual && (
              <div className="p-4 rounded-xl mb-4" style={{ background: "#1a1a1a", border: "1px solid #333" }}>
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard size={16} className="text-[#D4A843]" />
                  <span className="text-sm font-semibold text-white">Thông tin chuyển khoản</span>
                </div>
                <p className="text-xs text-gray-400 mb-3">
                  Vui lòng chuyển khoản theo thông tin bên dưới. Admin sẽ xác nhận và kích hoạt khoá học cho bạn.
                </p>
              </div>
            )}

            {/* Transfer details */}
            <div className="space-y-2.5 mb-4">
              {[
                { label: "Số tiền", value: formatPrice(order.amount), highlight: true, key: "amount" },
                { label: "Nội dung CK", value: order.transferContent, copyable: true, key: "content" },
                { label: "Mã đơn hàng", value: order.code, copyable: true, key: "code" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-3 rounded-lg"
                  style={{ background: "#222" }}>
                  <span className="text-xs text-gray-400">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${item.highlight ? "text-[#D4A843]" : "text-white font-mono"}`}>
                      {item.value}
                    </span>
                    {item.copyable && (
                      <button onClick={() => copyToClipboard(item.value, item.key)}
                        className="text-gray-500 hover:text-white transition-colors">
                        {copied === item.key ? <Check size={13} className="text-[#D4A843]" /> : <Copy size={13} />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {order.qrUrl ? (
              <div className="p-3 rounded-lg text-xs text-gray-400 leading-relaxed"
                style={{ background: "rgba(212,168,67,0.06)", border: "1px solid rgba(212,168,67,0.15)" }}>
                <span className="text-[#D4A843] font-medium">⚡ Tự động xác nhận</span> — Sau khi chuyển khoản,
                hệ thống sẽ tự động xác nhận trong vòng 60 giây và mở khoá quyền truy cập ngay lập tức.
              </div>
            ) : (
              <div className="p-3 rounded-lg text-xs text-gray-400 leading-relaxed"
                style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
                <span className="text-[#f59e0b] font-medium">📞 Xác nhận thủ công</span> — Sau khi chuyển khoản,
                vui lòng liên hệ admin qua Zalo/Facebook để được xác nhận nhanh nhất.
              </div>
            )}

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
              style={{ background: "rgba(212,168,67,0.15)", border: "2px solid rgba(212,168,67,0.4)" }}>
              <CheckCircle size={32} className="text-[#D4A843]" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Thanh toán thành công!</h3>
            <p className="text-gray-400 text-sm mb-2">
              Cảm ơn bạn đã tin tưởng. Quyền truy cập đã được kích hoạt ngay lập tức.
            </p>
            <p className="text-[#D4A843] text-sm font-medium mb-6">
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
