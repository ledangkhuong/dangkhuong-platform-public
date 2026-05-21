"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Maximize, Minimize } from "lucide-react";
// Re-export utils so existing client imports still work
export { extractGoogleDriveFileId, isGoogleDriveUrl } from "@/lib/video-utils";

/* ───────── Constants ───────── */
const AUTO_COMPLETE_THRESHOLD = 0.8; // 80% of duration

/* ───────── Component ───────── */
export default function GoogleDrivePlayer({
  fileId,
  title,
  lessonId,
  productId,
  initialCompleted,
  onAutoCompleted,
  nextLessonUrl,
  durationSec,
}: {
  fileId: string;
  title?: string;
  lessonId?: string;
  productId?: string;
  initialCompleted?: boolean;
  onAutoCompleted?: () => void;
  nextLessonUrl?: string;
  /** Duration in seconds — needed for timer-based auto-complete */
  durationSec?: number;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const autoCompletedRef = useRef(!!initialCompleted);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [autoCompleteToast, setAutoCompleteToast] = useState(false);

  const embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;

  /* ─── Auto-complete handler ─── */
  const triggerAutoComplete = useCallback(async () => {
    if (!lessonId || !productId) return;
    if (autoCompletedRef.current) return;
    autoCompletedRef.current = true;

    try {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lesson_id: lessonId,
          product_id: productId,
          completed: true,
        }),
      });

      if (!res.ok) throw new Error("Failed");

      setAutoCompleteToast(true);
      onAutoCompleted?.();

      if (nextLessonUrl) {
        setTimeout(() => {
          setAutoCompleteToast(false);
          router.push(nextLessonUrl);
          router.refresh();
        }, 1000);
      } else {
        setTimeout(() => setAutoCompleteToast(false), 4000);
      }
    } catch {
      autoCompletedRef.current = false;
    }
  }, [lessonId, productId, onAutoCompleted, nextLessonUrl, router]);

  /* ─── Timer-based progress tracking ─── */
  useEffect(() => {
    if (!loaded) return;

    startTimeRef.current = Date.now();
    let lastSaveTime = 0;

    timerRef.current = setInterval(() => {
      if (!startTimeRef.current) return;
      const sec = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsed(sec);

      // Auto-complete at 80% of duration (timer-based heuristic)
      if (
        durationSec &&
        durationSec > 0 &&
        sec / durationSec >= AUTO_COMPLETE_THRESHOLD &&
        !autoCompletedRef.current &&
        lessonId &&
        productId
      ) {
        triggerAutoComplete();
      }

      // Save watch_sec every 15 seconds (fire-and-forget)
      if (lessonId && productId && !autoCompletedRef.current) {
        const now = Date.now();
        if (now - lastSaveTime >= 15_000) {
          lastSaveTime = now;
          fetch("/api/progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lesson_id: lessonId,
              product_id: productId,
              watch_sec: sec,
            }),
          }).catch(() => {});
        }
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loaded, durationSec, lessonId, productId, triggerAutoComplete]);

  /* ─── Fullscreen listener ─── */
  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  };

  const formatTime = (sec: number): string => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const progress =
    durationSec && durationSec > 0
      ? Math.min(100, (elapsed / durationSec) * 100)
      : 0;

  return (
    <div
      ref={containerRef}
      className="rounded-xl overflow-hidden select-none relative"
      style={{ border: "1px solid #2a2a2a", background: "#000" }}
    >
      {/* Video area */}
      <div className="relative aspect-video bg-black">
        <iframe
          src={embedUrl}
          className="absolute inset-0 w-full h-full"
          allow="autoplay; encrypted-media"
          allowFullScreen
          onLoad={() => setLoaded(true)}
          style={{ border: "none" }}
        />

        {/* Loading state */}
        {!loaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-[#111]">
            <div className="w-8 h-8 border-2 border-[#D4A843] border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs text-gray-500">
              {title ?? "Đang tải video..."}
            </p>
          </div>
        )}

        {/* Auto-complete toast */}
        {autoCompleteToast && (
          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
            style={{ animation: "fadeSlideIn 0.3s ease-out" }}
          >
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#22c55e]/90 backdrop-blur-sm text-white text-sm font-medium shadow-lg">
              <span>&#x2705;</span>
              <span>
                {nextLessonUrl
                  ? "Hoàn thành! Đang chuyển bài..."
                  : "Bài học đã hoàn thành!"}
              </span>
            </div>
          </div>
        )}

        <style>{`
          @keyframes fadeSlideIn {
            from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
            to   { opacity: 1; transform: translateX(-50%) translateY(0); }
          }
        `}</style>

        {/* Watermark */}
        <div className="absolute bottom-14 right-3 text-[10px] text-white/15 select-none pointer-events-none z-20">
          dangkhuong.com
        </div>
      </div>

      {/* Bottom bar with progress and fullscreen */}
      {loaded && (
        <div
          className="flex items-center gap-3 px-3 py-2"
          style={{ background: "#111", borderTop: "1px solid #1f1f1f" }}
        >
          {/* Progress bar */}
          {durationSec && durationSec > 0 ? (
            <>
              <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#22c55e] rounded-full transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[11px] text-gray-400 tabular-nums shrink-0">
                {formatTime(elapsed)} / {formatTime(durationSec)}
              </span>
            </>
          ) : (
            <>
              <div className="flex-1" />
              <span className="text-[11px] text-gray-400 tabular-nums">
                {formatTime(elapsed)}
              </span>
            </>
          )}

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
            className="p-1 text-gray-400 hover:text-[#D4A843] transition-colors"
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        </div>
      )}
    </div>
  );
}
