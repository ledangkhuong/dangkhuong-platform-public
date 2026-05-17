"use client";

import { useRef, useState, useCallback } from "react";
import { Download, Share2, Loader2, CheckCircle, Printer, ExternalLink } from "lucide-react";

interface CertificateViewProps {
  studentName: string;
  courseName: string;
  completionDate: string;
  certificateId: string;
  instructorName?: string;
  totalLessons: number;
}

export default function CertificateView({
  studentName: rawStudentName,
  courseName: rawCourseName,
  completionDate,
  certificateId,
  instructorName: rawInstructorName = "Lê Đăng Khương",
  totalLessons,
}: CertificateViewProps) {
  // Normalize Vietnamese diacritics (NFC) for proper rendering
  const studentName = rawStudentName.normalize("NFC");
  const courseName = rawCourseName.normalize("NFC");
  const instructorName = rawInstructorName.normalize("NFC");
  const certRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!certRef.current || downloading) return;
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(certRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `certificate-${certificateId}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloading(false);
    }
  }, [certificateId, downloading]);

  const handleShare = useCallback(() => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }, []);

  const handlePrintPDF = useCallback(() => {
    const styleId = "cert-print-styles";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        @media print {
          body * { visibility: hidden !important; }
          [data-cert-print], [data-cert-print] * { visibility: visible !important; }
          [data-cert-print] {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page { size: landscape; margin: 0; }
        }
      `;
      document.head.appendChild(style);
    }
    window.print();
  }, []);

  const handleLinkedInShare = useCallback(() => {
    const params = new URLSearchParams({
      startTask: "CERTIFICATION_NAME",
      name: courseName,
      organizationName: "Lê Đăng Khương Academy",
      certUrl: window.location.href,
      certId: certificateId,
    });
    window.open(
      `https://www.linkedin.com/profile/add?${params.toString()}`,
      "_blank",
      "noopener,noreferrer"
    );
  }, [courseName, certificateId]);

  return (
    <div className="space-y-6">
      {/* Certificate Card */}
      <div className="overflow-x-auto pb-4">
        <div
          ref={certRef}
          data-cert-print
          style={{
            width: 960,
            height: 680,
            position: "relative",
            background: "linear-gradient(145deg, #0a0a0a 0%, #141414 50%, #0d0d0d 100%)",
            fontFamily: "'Palatino Linotype', 'Book Antiqua', 'Noto Serif', serif",
            overflow: "hidden",
          }}
        >
          {/* Outer gold border */}
          <div
            style={{
              position: "absolute",
              inset: 12,
              border: "2px solid rgba(212,168,67,0.5)",
              borderRadius: 4,
            }}
          />
          {/* Inner gold border */}
          <div
            style={{
              position: "absolute",
              inset: 20,
              border: "1px solid rgba(212,168,67,0.25)",
              borderRadius: 2,
            }}
          />

          {/* Corner ornaments */}
          {[
            { top: 16, left: 16 },
            { top: 16, right: 16 },
            { bottom: 16, left: 16 },
            { bottom: 16, right: 16 },
          ].map((pos, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                width: 40,
                height: 40,
                ...pos,
              }}
            >
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <path
                  d={
                    i === 0
                      ? "M2 38V8C2 4.68629 4.68629 2 8 2H38"
                      : i === 1
                      ? "M38 38V8C38 4.68629 35.3137 2 32 2H2"
                      : i === 2
                      ? "M2 2V32C2 35.3137 4.68629 38 8 38H38"
                      : "M38 2V32C38 35.3137 35.3137 38 32 38H2"
                  }
                  stroke="rgba(212,168,67,0.6)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          ))}

          {/* Subtle gold shimmer overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(ellipse at 50% 30%, rgba(212,168,67,0.04) 0%, transparent 60%)",
              pointerEvents: "none",
            }}
          />

          {/* Content */}
          <div
            style={{
              position: "relative",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "48px 64px",
              textAlign: "center",
            }}
          >
            {/* Academy name */}
            <div
              style={{
                fontSize: 13,
                letterSpacing: 6,
                color: "rgba(212,168,67,0.7)",
                textTransform: "uppercase",
                marginBottom: 8,
                fontFamily: "Arial, sans-serif",
              }}
            >
              Đăng Khương Academy
            </div>

            {/* Main title */}
            <div
              style={{
                fontSize: 36,
                fontWeight: "bold",
                letterSpacing: 8,
                color: "#D4A843",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              Chứng Chỉ
            </div>
            <div
              style={{
                fontSize: 14,
                letterSpacing: 10,
                color: "rgba(212,168,67,0.5)",
                textTransform: "uppercase",
                marginBottom: 32,
                fontFamily: "Arial, sans-serif",
              }}
            >
              Certificate of Completion
            </div>

            {/* Divider line */}
            <div
              style={{
                width: 120,
                height: 1,
                background: "linear-gradient(90deg, transparent, rgba(212,168,67,0.5), transparent)",
                marginBottom: 28,
              }}
            />

            {/* Subtitle */}
            <div
              style={{
                fontSize: 13,
                color: "#888",
                marginBottom: 12,
                fontFamily: "Arial, sans-serif",
              }}
            >
              Chứng nhận hoàn thành khoá học dành cho
            </div>

            {/* Student name */}
            <div
              style={{
                fontSize: 40,
                fontWeight: "bold",
                color: "#ffffff",
                marginBottom: 8,
                lineHeight: 1.2,
              }}
            >
              {studentName}
            </div>

            {/* Divider */}
            <div
              style={{
                width: 200,
                height: 1,
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
                marginBottom: 24,
              }}
            />

            {/* Course description */}
            <div
              style={{
                fontSize: 13,
                color: "#888",
                marginBottom: 8,
                fontFamily: "Arial, sans-serif",
              }}
            >
              Đã hoàn thành xuất sắc khoá học
            </div>

            {/* Course name */}
            <div
              style={{
                fontSize: 22,
                fontWeight: "bold",
                color: "#D4A843",
                marginBottom: 8,
                lineHeight: 1.3,
                maxWidth: 700,
              }}
            >
              {courseName}
            </div>

            {/* Lesson count */}
            <div
              style={{
                fontSize: 12,
                color: "#666",
                marginBottom: 32,
                fontFamily: "Arial, sans-serif",
              }}
            >
              {totalLessons} bài học | Hoàn thành 100%
            </div>

            {/* Bottom section: date + signature */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                width: "100%",
                maxWidth: 600,
              }}
            >
              {/* Date */}
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 14,
                    color: "#ccc",
                    marginBottom: 6,
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  {completionDate}
                </div>
                <div
                  style={{
                    width: 140,
                    height: 1,
                    background: "rgba(212,168,67,0.3)",
                    marginBottom: 4,
                  }}
                />
                <div
                  style={{
                    fontSize: 11,
                    color: "#666",
                    textTransform: "uppercase",
                    letterSpacing: 2,
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  Ngày cấp
                </div>
              </div>

              {/* Signature */}
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 18,
                    color: "#D4A843",
                    marginBottom: 6,
                    fontStyle: "italic",
                  }}
                >
                  {instructorName}
                </div>
                <div
                  style={{
                    width: 140,
                    height: 1,
                    background: "rgba(212,168,67,0.3)",
                    marginBottom: 4,
                  }}
                />
                <div
                  style={{
                    fontSize: 11,
                    color: "#666",
                    textTransform: "uppercase",
                    letterSpacing: 2,
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  Giảng viên
                </div>
              </div>
            </div>

            {/* QR Code + Certificate ID */}
            <div
              style={{
                position: "absolute",
                bottom: 26,
                right: 36,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
              }}
            >
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(`https://dangkhuong.com/verify/${certificateId}`)}&size=80x80&color=D4A843&bgcolor=0a0a0a&format=png`}
                alt="QR verification code"
                width={70}
                height={70}
                crossOrigin="anonymous"
                style={{ display: "block" }}
              />
              <div
                style={{
                  fontSize: 8,
                  color: "#666",
                  fontFamily: "Arial, sans-serif",
                  marginTop: 2,
                }}
              >
                Quét để xác minh
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "#444",
                  fontFamily: "monospace",
                }}
              >
                ID: {certificateId}
              </div>
            </div>

            {/* Website */}
            <div
              style={{
                position: "absolute",
                bottom: 28,
                left: 36,
                fontSize: 10,
                color: "#444",
                fontFamily: "Arial, sans-serif",
              }}
            >
              dangkhuong.com
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
          style={{
            background: "rgba(212,168,67,0.15)",
            color: "#D4A843",
            border: "1px solid rgba(212,168,67,0.4)",
          }}
        >
          {downloading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Download size={16} />
          )}
          {downloading ? "Đang tải..." : "Tải chứng chỉ PNG"}
        </button>

        <button
          onClick={handlePrintPDF}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-colors"
          style={{
            background: "#1f1f1f",
            color: "#ccc",
            border: "1px solid #333",
          }}
        >
          <Printer size={16} />
          Tải PDF
        </button>

        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-colors"
          style={{
            background: "#1f1f1f",
            color: "#ccc",
            border: "1px solid #333",
          }}
        >
          {copied ? (
            <>
              <CheckCircle size={16} className="text-green-400" />
              <span className="text-green-400">Đã copy link!</span>
            </>
          ) : (
            <>
              <Share2 size={16} />
              Chia sẻ
            </>
          )}
        </button>

        <button
          onClick={handleLinkedInShare}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all"
          style={{
            background: "rgba(10,102,194,0.15)",
            color: "#5BA4E5",
            border: "1px solid rgba(10,102,194,0.4)",
          }}
        >
          <ExternalLink size={16} />
          Thêm vào LinkedIn
        </button>
      </div>
    </div>
  );
}
