"use client";

import { useRef, useState, useCallback } from "react";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";

interface ThumbnailUploadProps {
  value: string; // current thumbnail URL
  onChange: (url: string) => void;
}

/** Compress image on client side before uploading */
function compressImage(file: File, maxWidth = 800, quality = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      // Only downscale, never upscale
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to compress image"));
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

export default function ThumbnailUpload({ value, onChange }: ThumbnailUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const uploadFile = useCallback(
    async (file: File) => {
      setError(null);
      setUploading(true);

      try {
        // Validate type client-side
        const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        if (!allowed.includes(file.type)) {
          throw new Error("Chi chap nhan JPEG, PNG, WebP, GIF");
        }

        // Compress
        const compressed = await compressImage(file);

        // Build FormData
        const formData = new FormData();
        formData.append(
          "file",
          new File([compressed], file.name.replace(/\.[^.]+$/, ".jpg"), {
            type: "image/jpeg",
          })
        );

        const res = await fetch("/api/upload/thumbnail", {
          method: "POST",
          body: formData,
        });

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || "Upload failed");
        }

        onChange(json.url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [onChange]
  );

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  function handleRemove() {
    onChange("");
    setError(null);
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-gray-400">
        Ảnh thumbnail
      </label>

      {/* Preview or Upload zone */}
      {value ? (
        <div className="relative group rounded-lg overflow-hidden border border-[#2a2a2a]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Thumbnail preview"
            className="w-full aspect-video object-cover"
          />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg bg-white/20 text-white text-xs font-medium hover:bg-white/30 transition-colors flex items-center gap-1.5"
            >
              <Upload size={12} />
              Thay ảnh
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="px-3 py-1.5 rounded-lg bg-red-500/30 text-red-300 text-xs font-medium hover:bg-red-500/50 transition-colors flex items-center gap-1.5"
            >
              <X size={12} />
              Xoá
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`
            flex flex-col items-center justify-center gap-2 p-8 rounded-lg border-2 border-dashed
            transition-colors cursor-pointer
            ${
              dragOver
                ? "border-[#D4A843] bg-[#D4A843]/5"
                : "border-[#2a2a2a] hover:border-[#3a3a3a] bg-[#161616]"
            }
            ${uploading ? "pointer-events-none opacity-60" : ""}
          `}
        >
          {uploading ? (
            <>
              <Loader2 size={28} className="text-[#D4A843] animate-spin" />
              <span className="text-xs text-gray-400">Đang tải lên...</span>
            </>
          ) : (
            <>
              <ImageIcon size={28} className="text-gray-500" />
              <span className="text-xs text-gray-400">
                Kéo thả ảnh vào đây hoặc <span className="text-[#D4A843] font-medium">chọn file</span>
              </span>
              <span className="text-[10px] text-gray-500">
                JPEG, PNG, WebP, GIF — tối đa 5MB
              </span>
            </>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Error */}
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
