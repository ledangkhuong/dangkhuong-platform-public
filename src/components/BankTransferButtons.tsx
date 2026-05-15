"use client";

import { useState } from "react";
import { Smartphone, ChevronDown, X } from "lucide-react";

/* ─── Bank list ──────────────────────────────────────── */

const BANKS = [
  { name: "MB Bank", appId: "mb" },
  { name: "Vietcombank", appId: "vcb" },
  { name: "Techcombank", appId: "tcb" },
  { name: "BIDV", appId: "bidv" },
  { name: "VPBank", appId: "vpb" },
  { name: "ACB", appId: "acb" },
  { name: "TPBank", appId: "tpb" },
  { name: "Agribank", appId: "vba" },
  { name: "VietinBank", appId: "icb" },
  { name: "Sacombank", appId: "stb" },
  { name: "HDBank", appId: "hdb" },
  { name: "OCB", appId: "ocb" },
  { name: "MSB", appId: "msb" },
  { name: "SHB", appId: "shb" },
  { name: "VIB", appId: "vib" },
  { name: "SeABank", appId: "seab" },
  { name: "LPBank", appId: "lpb" },
  { name: "Eximbank", appId: "eib" },
];

/* ─── Bank name mapping ──────────────────────────────── */

const BANK_CODE_NAMES: Record<string, string> = {
  MB: "MB Bank", VCB: "Vietcombank", TCB: "Techcombank",
  BIDV: "BIDV", VPB: "VPBank", ACB: "ACB",
  TPB: "TPBank", VBA: "Agribank", ICB: "VietinBank",
};

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
}: BankTransferButtonsProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedBank, setSelectedBank] = useState(BANKS[0]);
  const [showBankList, setShowBankList] = useState(false);

  const recipientBankName = BANK_CODE_NAMES[bankCode.toUpperCase()] || bankCode;
  const formatAmount = (n: number) => n.toLocaleString("vi-VN");

  const deepLink = `https://dl.vietqr.io/pay?app=${selectedBank.appId}&ba=${bankAccount}@${bankCode.toLowerCase()}&am=${amount}&tn=${encodeURIComponent(transferContent)}`;

  return (
    <>
      {/* Trigger button — Blue for trust */}
      <div className="mt-5">
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-xl text-base font-bold text-white transition-all active:scale-[0.98] hover:brightness-110 cursor-pointer"
          style={{
            background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
            boxShadow: "0 4px 20px rgba(37,99,235,0.35)",
          }}
        >
          <Smartphone size={18} />
          Chuyển khoản ngay
        </button>
        <p className="text-[11px] text-gray-600 text-center mt-2">
          Bấm để chuyển khoản tự động qua app ngân hàng
        </p>
      </div>

      {/* Payment modal — Zalo-like */}
      {showModal && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => { setShowModal(false); setShowBankList(false); }}
        >
          <div
            className="relative w-full max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden"
            style={{ background: "#fff" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h4 className="text-base font-bold text-gray-900">
                Thông tin chuyển khoản
              </h4>
              <button
                onClick={() => { setShowModal(false); setShowBankList(false); }}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>

            {/* Payment details */}
            <div className="px-5 py-5 space-y-4">
              {/* Recipient */}
              <div>
                <p className="text-xs text-gray-400 mb-1">Tài khoản người nhận</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs">
                    {bankCode}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">{bankAccount}</p>
                    <p className="text-sm text-gray-500">{recipientBankName}</p>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-gray-100" />

              {/* Amount */}
              <div>
                <p className="text-xs text-gray-400 mb-1">Số tiền</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatAmount(amount)} <span className="text-base font-normal text-gray-400">VND</span>
                </p>
              </div>

              {/* Divider */}
              <div className="h-px bg-gray-100" />

              {/* Transfer content */}
              <div>
                <p className="text-xs text-gray-400 mb-1">Nội dung chuyển khoản</p>
                <p className="text-base font-mono font-semibold text-gray-900">{transferContent}</p>
              </div>
            </div>

            {/* Bank selector + Transfer button */}
            <div className="px-5 pb-6 pt-2">
              {/* Bank selector */}
              <div className="relative mb-4">
                <button
                  onClick={() => setShowBankList(!showBankList)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Bằng ứng dụng</span>
                    <span className="text-sm font-semibold text-gray-900">{selectedBank.name}</span>
                  </div>
                  <ChevronDown size={16} className={`text-gray-400 transition-transform ${showBankList ? "rotate-180" : ""}`} />
                </button>

                {/* Dropdown */}
                {showBankList && (
                  <div
                    className="absolute bottom-full left-0 right-0 mb-1 rounded-xl border border-gray-200 bg-white shadow-xl max-h-[200px] overflow-y-auto z-10"
                  >
                    {BANKS.map((bank) => (
                      <button
                        key={bank.appId}
                        onClick={() => { setSelectedBank(bank); setShowBankList(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors ${
                          selectedBank.appId === bank.appId
                            ? "bg-blue-50 text-blue-600 font-semibold"
                            : "text-gray-700"
                        }`}
                      >
                        {bank.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Transfer button */}
              <a
                href={deepLink}
                onClick={() => setShowModal(false)}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-base font-bold text-white transition-all active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                  boxShadow: "0 4px 16px rgba(37,99,235,0.3)",
                }}
              >
                Chuyển khoản
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
