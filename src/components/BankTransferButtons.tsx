"use client";

import { useState, useCallback, useMemo } from "react";
import { Smartphone, ChevronDown, X, Copy, Check, ClipboardCheck, QrCode, Monitor } from "lucide-react";

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
  STB: "Sacombank", HDB: "HDBank", OCB: "OCB",
  MSB: "MSB", SHB: "SHB", VIB: "VIB",
  SEAB: "SeABank", LPB: "LPBank", EIB: "Eximbank",
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
  const [copied, setCopied] = useState<string | null>(null);
  const [showCopiedToast, setShowCopiedToast] = useState(false);

  const recipientBankName = BANK_CODE_NAMES[bankCode.toUpperCase()] || bankCode;
  const formatAmount = (n: number) => n.toLocaleString("vi-VN");

  const isMobile = useMemo(() => {
    if (typeof window === "undefined") return false;
    return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }, []);

  const deepLink = `https://dl.vietqr.io/pay?app=${selectedBank.appId}&ba=${bankAccount}@${bankCode.toLowerCase()}&am=${amount}&tn=${encodeURIComponent(transferContent)}`;

  const qrImageUrl = `https://img.vietqr.io/image/${bankCode}-${bankAccount}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(transferContent)}`;

  const copyToClipboard = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(field);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(field);
      setTimeout(() => setCopied(null), 1500);
    }
  }, []);

  /* Copy all transfer info to clipboard, then open bank app (mobile only) */
  const handleTransfer = useCallback(async () => {
    const fullInfo = `${transferContent}`;
    try {
      await navigator.clipboard.writeText(fullInfo);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = fullInfo;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }

    if (isMobile) {
      setShowCopiedToast(true);
      // Small delay so user sees the toast, then open bank app
      setTimeout(() => {
        window.location.href = deepLink;
        setTimeout(() => {
          setShowModal(false);
          setShowCopiedToast(false);
        }, 500);
      }, 800);
    } else {
      // Desktop: just show copied confirmation, don't redirect to deeplink
      setCopied("content");
      setTimeout(() => setCopied(null), 2000);
    }
  }, [deepLink, transferContent, isMobile]);

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
          {isMobile ? <Smartphone size={18} /> : <QrCode size={18} />}
          Chuyển khoản ngay
        </button>
        <p className="text-[11px] text-gray-500 text-center mt-2">
          {isMobile
            ? "Bấm để mở app ngân hàng & tự động copy nội dung CK"
            : "Bấm để hiện mã QR chuyển khoản"}
        </p>
      </div>

      {/* Payment modal — Zalo-like */}
      {showModal && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => { setShowModal(false); setShowBankList(false); setShowCopiedToast(false); }}
        >
          <div
            className="relative w-full max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden"
            style={{ background: "#fff" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Copied toast overlay */}
            {showCopiedToast && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/90 rounded-2xl">
                <div className="flex flex-col items-center gap-3 animate-pulse">
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                    <ClipboardCheck size={32} className="text-green-600" />
                  </div>
                  <p className="text-base font-bold text-gray-900">Đã copy nội dung CK</p>
                  <p className="text-sm text-gray-500">Đang mở app ngân hàng...</p>
                </div>
              </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h4 className="text-base font-bold text-gray-900">
                Thông tin chuyển khoản
              </h4>
              <button
                onClick={() => { setShowModal(false); setShowBankList(false); setShowCopiedToast(false); }}
                className="text-gray-400 hover:text-gray-500 transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>

            {/* Payment details */}
            <div className="px-5 py-5 space-y-4">
              {/* Recipient */}
              <div className="flex items-center justify-between">
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
                <button
                  onClick={() => copyToClipboard(bankAccount, "account")}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-gray-50 hover:bg-gray-100 text-gray-500 transition-colors"
                >
                  {copied === "account" ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                  {copied === "account" ? "Đã copy" : "Copy"}
                </button>
              </div>

              {/* Divider */}
              <div className="h-px bg-gray-100" />

              {/* Amount */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Số tiền</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatAmount(amount)} <span className="text-base font-normal text-gray-400">VND</span>
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(String(amount), "amount")}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-gray-50 hover:bg-gray-100 text-gray-500 transition-colors"
                >
                  {copied === "amount" ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                  {copied === "amount" ? "Đã copy" : "Copy"}
                </button>
              </div>

              {/* Divider */}
              <div className="h-px bg-gray-100" />

              {/* Transfer content */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Nội dung chuyển khoản</p>
                  <p className="text-base font-mono font-semibold text-gray-900">{transferContent}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(transferContent, "content")}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-gray-50 hover:bg-gray-100 text-gray-500 transition-colors"
                >
                  {copied === "content" ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                  {copied === "content" ? "Đã copy" : "Copy"}
                </button>
              </div>
            </div>

            {/* QR Code for desktop users */}
            {!isMobile && (
              <div className="mx-5 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Monitor size={14} className="text-blue-500" />
                  <span className="text-xs font-semibold text-gray-700">Quét mã QR bằng app ngân hàng trên điện thoại</span>
                </div>
                <div className="flex justify-center p-4 rounded-xl bg-white border border-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrImageUrl}
                    alt="QR chuyển khoản"
                    width={220}
                    height={220}
                    className="block rounded-lg"
                  />
                </div>
                <p className="text-[10px] text-gray-400 text-center mt-2">
                  Mở app ngân hàng → Quét QR → Xác nhận chuyển khoản
                </p>
              </div>
            )}

            {/* Info note */}
            <div className="mx-5 mb-4 px-3 py-2.5 rounded-lg bg-blue-50 border border-blue-100">
              <p className="text-xs text-blue-700 leading-relaxed">
                {isMobile ? (
                  <>
                    <strong>Lưu ý:</strong> Khi bấm &quot;Chuyển khoản&quot;, nội dung CK sẽ được tự động copy.
                    Mở app ngân hàng → dán nội dung CK vào ô ghi chú và nhập số tiền{" "}
                    <strong>{formatAmount(amount)}đ</strong>.
                  </>
                ) : (
                  <>
                    <strong>Lưu ý:</strong> Quét mã QR ở trên bằng app ngân hàng trên điện thoại.
                    Hoặc bấm nút copy bên dưới để chuyển khoản thủ công với nội dung{" "}
                    <strong>{transferContent}</strong>, số tiền <strong>{formatAmount(amount)}đ</strong>.
                  </>
                )}
              </p>
            </div>

            {/* Bank selector + Transfer button (mobile only shows bank app opener) */}
            <div className="px-5 pb-6 pt-2">
              {/* Bank selector — only show on mobile (desktop uses QR code) */}
              {isMobile && (
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
              )}

              {/* Transfer button — copies content then opens bank app (mobile) or just copies (desktop) */}
              <button
                onClick={handleTransfer}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-base font-bold text-white transition-all active:scale-[0.98] cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                  boxShadow: "0 4px 16px rgba(37,99,235,0.3)",
                }}
              >
                {isMobile ? (
                  <>
                    <Smartphone size={18} />
                    Chuyển khoản
                  </>
                ) : (
                  <>
                    <Copy size={18} />
                    Copy nội dung chuyển khoản
                  </>
                )}
              </button>

              <p className="text-[10px] text-gray-400 text-center mt-2">
                {isMobile
                  ? "Nội dung CK tự động được copy khi bấm nút"
                  : "Copy nội dung CK để chuyển khoản thủ công qua internet banking"}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
