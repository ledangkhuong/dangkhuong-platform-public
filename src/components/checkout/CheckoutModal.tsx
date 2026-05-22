"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { X, Copy, Check, Clock, CheckCircle, AlertCircle, RefreshCw, CreditCard, Tag, Loader2, Wallet, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { event as fbEvent } from "@/lib/fbpixel";

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
  sepayAvailable: boolean;
  payosAvailable: boolean;
}

interface CheckoutModalProps {
  product: Product;
  onClose: () => void;
  onSuccess: () => void;
}

type PaymentStatus = "idle" | "pending" | "success" | "error";
type PaymentMethod = "sepay" | "payos";

/** Helper to auto-trigger PayOS when it's the only option */
function AutoTriggerPayOS({ onTrigger }: { onTrigger: () => void }) {
  const triggered = useRef(false);
  useEffect(() => {
    if (!triggered.current) {
      triggered.current = true;
      onTrigger();
    }
  }, [onTrigger]);
  return null;
}

export default function CheckoutModal({ product, onClose, onSuccess }: CheckoutModalProps) {
  const [step, setStep] = useState<"coupon" | "creating" | "method" | "payment" | "success">("coupon");
  const [order, setOrder] = useState<Order | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle");
  const [copied, setCopied] = useState<string>("");
  const [countdown, setCountdown] = useState(900);
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const autoCreatedRef = useRef(false);
  const [, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [payosLoading, setPayosLoading] = useState(false);

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [couponApplied, setCouponApplied] = useState<{
    code: string;
    discount_type: string;
    discount_value: number;
    discount_amount: number;
    final_amount: number;
  } | null>(null);

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
        fbEvent("Purchase", { value: order.amount, currency: "VND" });
        onSuccess();
      }
    } catch {
      // silently retry
    }
  }, [order, onSuccess]);

  // Poll for payment status every 5 seconds — stop when expired
  useEffect(() => {
    if (step !== "payment" || !order || expired) return;
    const interval = setInterval(checkPayment, 5000);
    return () => clearInterval(interval);
  }, [step, order, expired, checkPayment]);

  // Countdown timer
  useEffect(() => {
    if (step !== "payment") return;
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          setExpired(true);
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

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError("");
    setCouponApplied(null);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCode.trim(),
          order_amount: product.price,
        }),
      });
      const data = await res.json();
      if (data.valid) {
        setCouponApplied({
          code: couponCode.trim().toUpperCase(),
          discount_type: data.discount_type,
          discount_value: data.discount_value,
          discount_amount: data.discount_amount,
          final_amount: data.final_amount,
        });
      } else {
        setCouponError(data.error || "Mã giảm giá không hợp lệ");
      }
    } catch {
      setCouponError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponApplied(null);
    setCouponCode("");
    setCouponError("");
  };

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
          ...(couponApplied ? { coupon_code: couponApplied.code } : {}),
        }),
      });
      const data = await res.json();
      if (data.success && data.order) {
        const hasSepay = data.paymentInfo?.sepay_available ?? false;
        const hasPayOS = data.paymentInfo?.payos_available ?? false;

        setOrder({
          id: data.order.id,
          code: data.paymentInfo?.transfer_content || data.order.order_code,
          qrUrl: data.paymentInfo?.qr_url || null,
          amount: data.order.amount,
          transferContent: data.paymentInfo?.transfer_content || `DK${data.order.order_code}`,
          manual: data.paymentInfo?.manual || false,
          sepayAvailable: hasSepay,
          payosAvailable: hasPayOS,
        });

        // If both methods available, show method selection step
        if (hasSepay && hasPayOS) {
          setStep("method");
        } else if (hasPayOS && !hasSepay) {
          // Only PayOS available — go directly to PayOS
          setPaymentMethod("payos");
          setStep("method"); // will auto-trigger PayOS flow
        } else {
          // Only SePay or manual — go straight to bank transfer payment
          setPaymentMethod("sepay");
          setStep("payment");
          setPaymentStatus("pending");
        }
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
  }, [fullName, email, phone, product.id, loading, couponApplied]);

  // Auto-create order when entering the "creating" step
  useEffect(() => {
    if (step === "creating" && fullName && email && !autoCreatedRef.current) {
      autoCreatedRef.current = true;
      handleCreateOrder();
    }
  }, [step, fullName, email, handleCreateOrder]);

  const handleReset = useCallback(() => {
    setStep("coupon");
    setOrder(null);
    setPaymentStatus("idle");
    setCountdown(900);
    setExpired(false);
    setErrorMsg("");
    setPaymentMethod(null);
    setPayosLoading(false);
    autoCreatedRef.current = false;
  }, []);

  const handleProceedToPayment = () => {
    setStep("creating");
  };

  const handleSelectSepay = () => {
    setPaymentMethod("sepay");
    setStep("payment");
    setPaymentStatus("pending");
  };

  const handleSelectPayOS = async () => {
    if (!order || payosLoading) return;
    setPayosLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/payos/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: order.id }),
      });
      const data = await res.json();
      if (data.success && data.checkoutUrl) {
        // Redirect to PayOS checkout page
        window.location.href = data.checkoutUrl;
      } else {
        setErrorMsg(data.error || "Không thể tạo link thanh toán PayOS");
      }
    } catch {
      setErrorMsg("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setPayosLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(""), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto card-dark">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid #2a2a2a" }}>
          <div>
            <h2 className="font-bold text-white text-base">
              {step === "success" ? "Thanh toán thành công 🎉" : "Thanh toán"}
            </h2>
            {step !== "success" && (
              <p className="text-xs text-gray-400 mt-0.5">{product.name}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5">
            <X size={18} />
          </button>
        </div>

        {/* Step: Coupon — product info + coupon input + proceed button */}
        {step === "coupon" && (
          <div className="p-5">
            <div className="p-4 rounded-xl mb-4" style={{ background: "#222", border: "1px solid #333" }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-white text-sm mb-1">{product.name}</div>
                  {product.description && (
                    <div className="text-xs text-gray-400 leading-relaxed">{product.description}</div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {couponApplied ? (
                    <>
                      <div className="text-sm text-gray-500 line-through">{formatPrice(product.price)}</div>
                      <div className="text-xl font-bold text-[#22c55e]">{formatPrice(couponApplied.final_amount)}</div>
                    </>
                  ) : (
                    <div className="text-xl font-bold text-[#D4A843]">{formatPrice(product.price)}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Coupon discount summary */}
            {couponApplied && (
              <div
                className="flex items-center justify-between p-3 rounded-lg mb-4"
                style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}
              >
                <span className="text-xs text-gray-400">Giảm giá</span>
                <span className="text-sm font-semibold text-[#22c55e]">
                  -{formatPrice(couponApplied.discount_amount)}
                </span>
              </div>
            )}

            {/* Coupon input */}
            <div className="mb-5">
              <div className="flex items-center gap-1.5 mb-2">
                <Tag size={13} className="text-gray-500" />
                <span className="text-xs font-medium text-gray-400">Mã giảm giá</span>
              </div>

              {couponApplied ? (
                <div
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}
                >
                  <div className="flex items-center gap-2">
                    <Check size={14} className="text-[#22c55e]" />
                    <span className="text-sm font-mono font-bold text-[#22c55e]">{couponApplied.code}</span>
                    <span className="text-xs text-gray-400">
                      ({couponApplied.discount_type === "percent"
                        ? `-${couponApplied.discount_value}%`
                        : `-${formatPrice(couponApplied.discount_amount)}`})
                    </span>
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    className="text-gray-500 hover:text-red-400 transition-colors p-1"
                    title="Bỏ mã giảm giá"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(""); }}
                    placeholder="Nhập mã giảm giá"
                    className="flex-1 px-3 py-2 rounded-lg text-sm text-white placeholder-gray-600 outline-none transition-colors font-mono"
                    style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleApplyCoupon(); } }}
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-50"
                    style={{
                      background: "linear-gradient(135deg, #D4A843, #b8922e)",
                    }}
                  >
                    {couponLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      "Áp dụng"
                    )}
                  </button>
                </div>
              )}

              {couponError && (
                <div role="alert" aria-live="assertive" className="flex items-center gap-1.5 mt-2">
                  <AlertCircle size={12} className="text-red-400 shrink-0" />
                  <span className="text-xs text-red-400">{couponError}</span>
                </div>
              )}
            </div>

            {/* Proceed button */}
            <button
              onClick={handleProceedToPayment}
              className="btn-green w-full justify-center text-sm py-3 font-semibold"
            >
              Tiếp tục thanh toán {couponApplied ? formatPrice(couponApplied.final_amount) : formatPrice(product.price)}
            </button>
          </div>
        )}

        {/* Step: Creating order */}
        {step === "creating" && (
          <div className="p-5">
            {!errorMsg && (
              <div className="flex items-center justify-center py-6">
                <span className="flex items-center gap-2 text-sm text-gray-400">
                  <RefreshCw size={14} className="animate-spin" /> Đang tạo đơn thanh toán...
                </span>
              </div>
            )}

            {errorMsg && (
              <>
                <div role="alert" aria-live="assertive" className="p-3 rounded-lg flex items-center gap-2 text-sm mb-4"
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

        {/* Step: Method selection (when both PayOS and SePay are available) */}
        {step === "method" && order && (
          <div className="p-5">
            <div className="mb-4">
              <div className="flex items-center justify-between p-3 rounded-lg mb-3" style={{ background: "#222" }}>
                <span className="text-xs text-gray-400">Thanh toán</span>
                <span className="text-sm font-bold text-[#D4A843]">{formatPrice(order.amount)}</span>
              </div>
            </div>

            <p className="text-sm text-gray-400 mb-4">Chọn phương thức thanh toán:</p>

            <div className="space-y-3">
              {/* PayOS option */}
              {order.payosAvailable && (
                <button
                  onClick={handleSelectPayOS}
                  disabled={payosLoading}
                  className="w-full p-4 rounded-xl text-left transition-all hover:scale-[1.01]"
                  style={{
                    background: "linear-gradient(135deg, rgba(212,168,67,0.08), rgba(212,168,67,0.02))",
                    border: "1px solid rgba(212,168,67,0.25)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: "rgba(212,168,67,0.15)" }}
                    >
                      <Wallet size={20} className="text-[#D4A843]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white text-sm">
                        {payosLoading ? (
                          <span className="flex items-center gap-2">
                            <Loader2 size={14} className="animate-spin" />
                            Đang tạo link thanh toán...
                          </span>
                        ) : (
                          "MoMo / ZaloPay / Ngân hàng"
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        Thanh toán nhanh qua ví điện tử hoặc internet banking
                      </div>
                    </div>
                    {!payosLoading && (
                      <div className="badge-green text-[10px] shrink-0">Khuyên dùng</div>
                    )}
                  </div>
                </button>
              )}

              {/* SePay bank transfer option */}
              {order.sepayAvailable && (
                <button
                  onClick={handleSelectSepay}
                  className="w-full p-4 rounded-xl text-left transition-all hover:scale-[1.01]"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid #333",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: "rgba(255,255,255,0.06)" }}
                    >
                      <Building2 size={20} className="text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white text-sm">
                        Chuyển khoản ngân hàng
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        Quét mã QR hoặc chuyển khoản thủ công
                      </div>
                    </div>
                  </div>
                </button>
              )}

              {/* PayOS-only fallback: auto-trigger if only PayOS */}
              {order.payosAvailable && !order.sepayAvailable && !payosLoading && (
                <AutoTriggerPayOS onTrigger={handleSelectPayOS} />
              )}
            </div>

            {errorMsg && (
              <div
                role="alert"
                aria-live="assertive"
                className="p-3 rounded-lg flex items-center gap-2 text-sm mt-4"
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.2)",
                }}
              >
                <AlertCircle size={14} className="text-red-400 shrink-0" />
                <span className="text-red-400">{errorMsg}</span>
              </div>
            )}
          </div>
        )}

        {/* Step: Payment */}
        {step === "payment" && order && (
          <div className="p-5">
            {/* Expired overlay */}
            {expired && (
              <div className="py-8 text-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: "rgba(239,68,68,0.12)", border: "2px solid rgba(239,68,68,0.3)" }}>
                  <AlertCircle size={28} className="text-red-400" />
                </div>
                <p className="text-white font-semibold mb-1">Đơn hàng đã hết hạn.</p>
                <p className="text-gray-400 text-sm mb-6">Vui lòng tạo đơn mới.</p>
                <button onClick={handleReset} className="btn-green w-full justify-center text-sm py-3">
                  Tạo đơn mới
                </button>
              </div>
            )}

            {/* Normal payment UI */}
            {!expired && (
            <>
            {/* Countdown */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm">
                <Clock size={14} className={countdown < 120 ? "text-red-400" : "text-[#f59e0b]"} />
                <span className={countdown < 120 ? "text-red-400 font-mono font-bold" : "text-[#f59e0b] font-mono font-bold"}>
                  {formatCountdown(countdown)}
                </span>
                <span className="text-gray-400 text-xs">còn lại</span>
              </div>
              <div className="badge-green text-[10px]">Đang chờ thanh toán</div>
            </div>

            {/* QR Code (if Sepay configured) */}
            {order.qrUrl && (
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-xl bg-white">
                  <Image
                    src={order.qrUrl}
                    alt="QR thanh toán"
                    width={200}
                    height={200}
                    className="block"
                    unoptimized
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

            </>
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
            <p className="text-[#D4A843] text-sm font-medium mb-6">
              Email xác nhận đã được gửi tới <span className="font-semibold">{email}</span>
            </p>
            <div className="space-y-2">
              <button onClick={onClose} className="btn-success w-full justify-center">
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
