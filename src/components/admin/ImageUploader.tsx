"use client";

import { useState, useRef } from "react";
import { Upload, Loader2, X, ImageIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  value: string;
  onChange: (url: string) => void;
  bucket?: string;
  folder?: string;
  /** Optional label override */
  label?: string;
  /** Disable file picker (URL-only) */
  disabled?: boolean;
}

/**
 * Image uploader: drag/drop or click to upload an image directly to Supabase
 * Storage. On success, fills the URL input with the public CDN URL.
 *
 * Falls back to plain URL paste — both work together.
 */
export default function ImageUploader({
  value,
  onChange,
  bucket = "product-images",
  folder = "thumbnails",
  label = "Ảnh đại diện",
  disabled = false,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Chỉ chấp nhận file ảnh (jpg/png/webp/gif)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File quá lớn — tối đa 10MB");
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
      const path = folder ? `${folder}/${filename}` : filename;

      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: "31536000",
          upsert: false,
          contentType: file.type,
        });

      if (upErr) {
        throw upErr;
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload thất bại";
      setError(msg);
    } finally {
      setUploading(false);
    }
  }

  function onPick() {
    fileRef.current?.click();
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    if (disabled || uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  return (
    <div className="space-y-2">
      {/* Preview if value exists */}
      {value ? (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="thumbnail preview"
            className="w-32 h-32 object-cover rounded-lg border border-white/10"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white"
            aria-label="Xoá ảnh"
          >
            <X size={12} />
          </button>
        </div>
      ) : null}

      {/* Drop zone + URL input */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        className="space-y-2"
      >
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={onPick}
            disabled={disabled || uploading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#D4A843]/10 border border-[#D4A843]/30 text-[#D4A843] hover:bg-[#D4A843]/20 disabled:opacity-50 text-sm font-medium transition-colors"
          >
            {uploading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Đang upload...
              </>
            ) : (
              <>
                <Upload size={14} />
                {value ? "Đổi ảnh" : "Chọn ảnh từ máy"}
              </>
            )}
          </button>
          <span className="text-xs text-gray-500 self-center hidden sm:inline">
            hoặc paste URL bên dưới
          </span>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />

        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://... (paste link ảnh trực tiếp)"
          className="w-full px-3 py-2 rounded-lg bg-[#0f0f0f] border border-[#2a2a2a] text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-[#D4A843]/40"
        />

        {error && (
          <p className="text-xs text-red-400 flex items-center gap-1">
            <ImageIcon size={12} /> {error}
          </p>
        )}
      </div>
    </div>
  );
}
