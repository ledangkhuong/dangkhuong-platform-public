"use client";

import { useState } from "react";
import { QrCode, X, Copy, Check } from "lucide-react";

interface QRCodeButtonProps {
  orderCode: string;
  amount: number;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  bankAccount: string;
  bankCode: string;
}

export default function QRCodeButton({
  orderCode,
  amount,
  customerName,
  customerEmail,
  customerPhone,
  bankAccount,
  bankCode,
}: QRCodeButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const transferContent = `DK${orderCode}`;
  const qrUrl = `/api/qr?bank=${bankCode}&acc=${bankAccount}&amount=${amount}&des=${encodeURIComponent(transferContent)}`;

  const formatCurrency = (n: number) => n.toLocaleString("vi-VN") + "đ";

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-1.5 rounded-lg transition-all hover:bg-[#D4A843]/10 text-gray-500 hover:text-[#D4A843]"
        title="Xem mã QR thanh toán"
      >
        <QrCode size={16} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl p-6 space-y-4"
            style={{
              background: "#141414",
              border: "1px solid rgba(212,168,67,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div className="text-center">
              <h3 className="text-lg font-bold text-white">
                Mã QR Thanh Toán
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                Đơn hàng{" "}
                <span className="font-mono text-[#D4A843]">{orderCode}</span>
              </p>
            </div>

            {/* QR Code Image */}
            <div className="flex justify-center">
              <div
                className="rounded-xl overflow-hidden bg-white p-2"
                style={{ width: 240, height: 240 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrUrl}
                  alt={`QR thanh toán đơn ${orderCode}`}
                  width={224}
                  height={224}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {/* Payment details */}
            <div
              className="rounded-xl p-4 space-y-2.5"
              style={{
                background: "#1a1a1a",
                border: "1px solid #2a2a2a",
              }}
            >
              <DetailRow
                label="Ngân hàng"
                value={bankCode}
                onCopy={() => handleCopy(bankCode, "bank")}
                copied={copied === "bank"}
              />
              <DetailRow
                label="Số tài khoản"
                value={bankAccount}
                onCopy={() => handleCopy(bankAccount, "account")}
                copied={copied === "account"}
              />
              <DetailRow
                label="Số tiền"
                value={formatCurrency(amount)}
                onCopy={() => handleCopy(amount.toString(), "amount")}
                copied={copied === "amount"}
              />
              <DetailRow
                label="Nội dung CK"
                value={transferContent}
                onCopy={() => handleCopy(transferContent, "content")}
                copied={copied === "content"}
                highlight
              />
            </div>

            {/* Customer info */}
            {(customerName || customerEmail || customerPhone) && (
              <div
                className="rounded-xl p-4 space-y-1.5"
                style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
              >
                <p className="text-xs text-gray-500 font-medium mb-2">
                  Thông tin khách hàng
                </p>
                {customerName && (
                  <p className="text-sm text-gray-300">{customerName}</p>
                )}
                {customerEmail && (
                  <p className="text-xs text-gray-500">{customerEmail}</p>
                )}
                {customerPhone && (
                  <p className="text-xs text-gray-500">{customerPhone}</p>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const text = `Thông tin thanh toán đơn hàng ${orderCode}:\n\nNgân hàng: ${bankCode}\nSố TK: ${bankAccount}\nSố tiền: ${formatCurrency(amount)}\nNội dung CK: ${transferContent}\n\nHoặc quét mã QR: ${window.location.origin}${qrUrl}`;
                  handleCopy(text, "all");
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: "rgba(212,168,67,0.1)",
                  color: "#D4A843",
                  border: "1px solid rgba(212,168,67,0.2)",
                }}
              >
                {copied === "all" ? (
                  <>
                    <Check size={15} /> Đã copy
                  </>
                ) : (
                  <>
                    <Copy size={15} /> Copy thông tin
                  </>
                )}
              </button>
              <a
                href={qrUrl}
                download={`QR-${orderCode}.png`}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: "rgba(59,130,246,0.1)",
                  color: "#3b82f6",
                  border: "1px solid rgba(59,130,246,0.2)",
                }}
              >
                <QrCode size={15} /> Tải QR
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DetailRow({
  label,
  value,
  onCopy,
  copied,
  highlight,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{label}</span>
      <div className="flex items-center gap-2">
        <span
          className={`text-sm font-medium ${
            highlight ? "text-[#D4A843]" : "text-white"
          }`}
        >
          {value}
        </span>
        <button
          onClick={onCopy}
          className="p-1 rounded hover:bg-white/5 text-gray-600 hover:text-gray-300 transition-colors"
          title="Copy"
        >
          {copied ? (
            <Check size={12} className="text-green-500" />
          ) : (
            <Copy size={12} />
          )}
        </button>
      </div>
    </div>
  );
}
