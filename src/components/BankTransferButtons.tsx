"use client";

import { useState } from "react";
import { Smartphone, ChevronDown, ChevronUp } from "lucide-react";

/* ─── VietQR Deep Link Bank List ─────────────────────── */

interface BankOption {
  name: string;
  shortName: string;
  appId: string;
  logo: string; // emoji or short text
  color: string;
}

const POPULAR_BANKS: BankOption[] = [
  { name: "MB Bank", shortName: "MB", appId: "mb", logo: "MB", color: "#1e3a5f" },
  { name: "Vietcombank", shortName: "VCB", appId: "vcb", logo: "VCB", color: "#006838" },
  { name: "Techcombank", shortName: "TCB", appId: "tcb", logo: "TCB", color: "#e31937" },
  { name: "BIDV", shortName: "BIDV", appId: "bidv", logo: "BIDV", color: "#003a70" },
  { name: "VPBank", shortName: "VPB", appId: "vpb", logo: "VPB", color: "#006a4e" },
  { name: "ACB", shortName: "ACB", appId: "acb", logo: "ACB", color: "#1a1a6c" },
  { name: "TPBank", shortName: "TPB", appId: "tpb", logo: "TPB", color: "#6b2fa0" },
  { name: "Agribank", shortName: "AGR", appId: "vba", logo: "AGR", color: "#e31937" },
  { name: "VietinBank", shortName: "CTG", appId: "icb", logo: "CTG", color: "#003a70" },
  { name: "Sacombank", shortName: "STB", appId: "stb", logo: "STB", color: "#00529b" },
  { name: "HDBank", shortName: "HDB", appId: "hdb", logo: "HDB", color: "#e31937" },
  { name: "OCB", shortName: "OCB", appId: "ocb", logo: "OCB", color: "#006838" },
];

interface BankTransferButtonsProps {
  bankAccount: string;
  bankCode: string;
  amount: number;
  transferContent: string;
  accentColor?: string; // default #D4A843
}

export default function BankTransferButtons({
  bankAccount,
  bankCode,
  amount,
  transferContent,
  accentColor = "#D4A843",
}: BankTransferButtonsProps) {
  const [expanded, setExpanded] = useState(false);

  const buildDeepLink = (appId: string) => {
    const params = new URLSearchParams({
      app: appId,
      ba: `${bankAccount}@${bankCode.toLowerCase()}`,
      am: amount.toString(),
      tn: transferContent,
    });
    return `https://dl.vietqr.io/pay?${params.toString()}`;
  };

  const visibleBanks = expanded ? POPULAR_BANKS : POPULAR_BANKS.slice(0, 6);

  return (
    <div className="mt-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Smartphone size={15} style={{ color: accentColor }} />
        <p className="text-sm font-medium text-white">
          Mở app ngân hàng để chuyển khoản:
        </p>
      </div>

      {/* Bank grid */}
      <div className="grid grid-cols-3 gap-2">
        {visibleBanks.map((bank) => (
          <a
            key={bank.appId}
            href={buildDeepLink(bank.appId)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-white transition-all active:scale-95 hover:brightness-110"
            style={{
              background: bank.color,
              border: `1px solid ${bank.color}`,
            }}
          >
            <span className="text-[10px] opacity-70">{bank.logo}</span>
            <span>{bank.name.replace("Bank", "").trim()}</span>
          </a>
        ))}
      </div>

      {/* Toggle show more */}
      {POPULAR_BANKS.length > 6 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-2 py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center justify-center gap-1"
        >
          {expanded ? (
            <>
              Thu gọn <ChevronUp size={12} />
            </>
          ) : (
            <>
              Xem thêm ngân hàng <ChevronDown size={12} />
            </>
          )}
        </button>
      )}

      {/* Note */}
      <p className="text-[11px] text-gray-600 text-center mt-2 leading-relaxed">
        Bấm vào ngân hàng của bạn để mở app và chuyển khoản tự động.
        <br />
        Nếu app không mở, hãy quét mã QR ở trên.
      </p>
    </div>
  );
}
