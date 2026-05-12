"use client";

import { useState } from "react";
import { X, Monitor, Smartphone } from "lucide-react";

interface TemplatePreviewModalProps {
  open: boolean;
  onClose: () => void;
  html: string;
  subject?: string;
}

export default function TemplatePreviewModal({ open, onClose, html, subject }: TemplatePreviewModalProps) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  if (!open) return null;

  const width = device === "desktop" ? 600 : 375;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl overflow-hidden"
        style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#2a2a2a]">
          <div className="min-w-0">
            <h3 className="text-white font-semibold text-sm">Xem truoc email</h3>
            {subject && <p className="text-xs text-gray-500 truncate mt-0.5">{subject}</p>}
          </div>

          <div className="flex items-center gap-3">
            {/* Device toggle */}
            <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid #2a2a2a" }}>
              <button
                onClick={() => setDevice("desktop")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  background: device === "desktop" ? "#D4A843" : "#1f1f1f",
                  color: device === "desktop" ? "white" : "#9ca3af",
                }}
              >
                <Monitor size={13} />
                Desktop
              </button>
              <button
                onClick={() => setDevice("mobile")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  background: device === "mobile" ? "#D4A843" : "#1f1f1f",
                  color: device === "mobile" ? "white" : "#9ca3af",
                }}
              >
                <Smartphone size={13} />
                Mobile
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white transition-colors p-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-auto p-6 flex justify-center" style={{ background: "#111" }}>
          <div
            className="rounded-lg overflow-hidden shadow-2xl transition-all duration-300"
            style={{
              width,
              maxWidth: "100%",
              background: "white",
              border: device === "mobile" ? "8px solid #333" : undefined,
              borderRadius: device === "mobile" ? 24 : 8,
            }}
          >
            <iframe
              srcDoc={html || "<p style='padding:40px;color:#999;text-align:center;'>Chua co noi dung</p>"}
              title="Email preview"
              sandbox="allow-same-origin"
              style={{
                width: "100%",
                minHeight: 500,
                border: "none",
                display: "block",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
