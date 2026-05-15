"use client";

import { useState } from "react";
import { Smartphone, X } from "lucide-react";

/* ─── Bank list with VietQR app IDs ──────────────────── */

const BANKS = [
  { name: "MB Bank", appId: "mb", color: "#1e3a5f" },
  { name: "Vietcombank", appId: "vcb", color: "#006838" },
  { name: "Techcombank", appId: "tcb", color: "#e31937" },
  { name: "BIDV", appId: "bidv", color: "#003a70" },
  { name: "VPBank", appId: "vpb", color: "#006a4e" },
  { name: "ACB", appId: "acb", color: "#1a1a6c" },
  { name: "TPBank", appId: "tpb", color: "#6b2fa0" },
  { name: "Agribank", appId: "vba", color: "#e31937" },
  { name: "VietinBank", appId: "icb", color: "#003a70" },
  { name: "Sacombank", appId: "stb", color: "#00529b" },
  { name: "HDBank", appId: "hdb", color: "#e31937" },
  { name: "OCB", appId: "ocb", color: "#006838" },
  { name: "MSB", appId: "msb", color: "#16325B" },
  { name: "SHB", appId: "shb", color: "#0033A0" },
  { name: "VIB", appId: "vib", color: "#0066b3" },
  { name: "SeABank", appId: "seab", color: "#e31937" },
];

interface BankTransferButtonsProps {
  bankAccount: string;
  bankCode: string;
  amount: number;
  transferContent: string;
  accentColor?: string;
}

export default function BankTransferButtons({
  bankAccount,
  bankCode,
  amount,
  transferContent,
  accentColor = "#D4A843",
}: BankTransferButtonsProps) {
  const [showPicker, setShowPicker] = useState(false);

  const buildDeepLink = (appId: string) =>
    `https://dl.vietqr.io/pay?app=${appId}&ba=${bankAccount}@${bankCode.toLowerCase()}&am=${amount}&tn=${encodeURIComponent(transferContent)}`;

  return (
    <>
      {/* Main button */}
      <div className="mt-5">
        <button
          onClick={() => setShowPicker(true)}
          className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-xl text-base font-bold text-white transition-all active:scale-[0.98] hover:brightness-110 cursor-pointer"
          style={{
            background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`,
            boxShadow: `0 4px 20px ${accentColor}40`,
          }}
        >
          <Smartphone size={18} />
          Chuyển khoản ngay
        </button>
        <p className="text-[11px] text-gray-600 text-center mt-2">
          Bấm để chọn ngân hàng và chuyển khoản tự động
        </p>
      </div>

      {/* Bank picker modal */}
      {showPicker && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setShowPicker(false)}
        >
          <div
            className="relative w-full max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden animate-in slide-in-from-bottom"
            style={{ background: "#141414", border: "1px solid #2a2a2a" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid #2a2a2a" }}
            >
              <h4 className="text-base font-bold text-white">
                Chọn ngân hàng của bạn
              </h4>
              <button
                onClick={() => setShowPicker(false)}
                className="text-gray-500 hover:text-white transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>

            {/* Bank grid */}
            <div className="p-4 grid grid-cols-2 gap-2.5 max-h-[60vh] overflow-y-auto">
              {BANKS.map((bank) => (
                <a
                  key={bank.appId}
                  href={buildDeepLink(bank.appId)}
                  onClick={() => setShowPicker(false)}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 hover:brightness-125"
                  style={{
                    background: bank.color,
                  }}
                >
                  {bank.name}
                </a>
              ))}
            </div>

            {/* Footer note */}
            <div
              className="px-5 py-3 text-center"
              style={{ borderTop: "1px solid #2a2a2a" }}
            >
              <p className="text-[11px] text-gray-600 leading-relaxed">
                Chọn ngân hàng để mở app với số tiền và nội dung CK đã điền
                sẵn.
                <br />
                Nếu app không mở, hãy quét mã QR ở trên.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
