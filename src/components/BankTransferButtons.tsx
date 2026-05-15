"use client";

import { Smartphone } from "lucide-react";

interface BankTransferButtonsProps {
  bankAccount: string;
  bankCode: string;
  amount: number;
  transferContent: string;
  accentColor?: string;
}

/**
 * Single "Chuyển khoản ngay" button using VietQR universal deep link.
 * On mobile: opens OS app chooser → user picks their banking app → pre-filled transfer.
 * On desktop: opens VietQR page with payment details.
 */
export default function BankTransferButtons({
  bankAccount,
  bankCode,
  amount,
  transferContent,
  accentColor = "#D4A843",
}: BankTransferButtonsProps) {
  // VietQR universal deep link (no app= param → OS shows bank app chooser)
  const deepLink = `https://dl.vietqr.io/pay?ba=${bankAccount}@${bankCode.toLowerCase()}&am=${amount}&tn=${encodeURIComponent(transferContent)}`;

  return (
    <div className="mt-5 space-y-3">
      <a
        href={deepLink}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-xl text-base font-bold text-white transition-all active:scale-[0.98] hover:brightness-110"
        style={{
          background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`,
          boxShadow: `0 4px 20px ${accentColor}40`,
        }}
      >
        <Smartphone size={18} />
        Chuyển khoản ngay
      </a>
      <p className="text-[11px] text-gray-600 text-center leading-relaxed">
        Bấm để mở app ngân hàng với số tiền và nội dung CK đã điền sẵn.
      </p>
    </div>
  );
}
