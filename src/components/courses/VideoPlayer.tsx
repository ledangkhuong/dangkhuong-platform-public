"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Gauge,
} from "lucide-react";

/* ───────── YouTube IFrame API types ───────── */
declare global {
  interface Window {
    YT: {
      Player: new (
        el: HTMLElement | string,
        opts: Record<string, unknown>
      ) => YTPlayer;
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
        ENDED: number;
        BUFFERING: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  setVolume(vol: number): void;
  getVolume(): number;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  setPlaybackRate(rate: number): void;
  getPlaybackRate(): number;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  destroy(): void;
}

/* ───────── Constants ───────── */
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/* ───────── Auto-complete threshold ───────── */
const AUTO_COMPLETE_THRESHOLD = 0.8; // 80%

/* ───────── Component ───────── */
export default function VideoPlayer({
  youtubeId,
  title,
  lessonId,
  productId,
  initialCompleted,
  onAutoCompleted,
}: {
  youtubeId: string;
  title?: string;
  /** Pass these three props to enable auto-completion at 80% watch progress */
  lessonId?: string;
  productId?: string;
  initialCompleted?: boolean;
  /** Called after auto-completion succeeds so the parent can update UI */
  onAutoCompleted?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerDivRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Track whether auto-complete already fired this session */
  const autoCompletedRef = useRef(!!initialCompleted);

  /* ─── Resume-from-last-position state ─── */
  const savedWatchSecRef = useRef<number | null>(null);
  const resumeAppliedRef = useRef(false);
  const lastSaveTimeRef = useRef(0); // timestamp of last save to server
  const [resumeToast, setResumeToast] = useState<string | null>(null);

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [speed, setSpeed] = useState(1);
  const [showSpeed, setShowSpeed] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [autoCompleteToast, setAutoCompleteToast] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ─── Fetch saved watch position on mount ─── */
  useEffect(() => {
    if (!lessonId || !productId || initialCompleted) return;
    fetch(`/api/progress?lesson_id=${lessonId}&product_id=${productId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const rec = json?.progress?.[0];
        if (rec?.watch_sec && rec.watch_sec > 5) {
          savedWatchSecRef.current = rec.watch_sec;
        }
      })
      .catch(() => {});
  }, [lessonId, productId, initialCompleted]);

  /* ─── Create player ─── */
  const createPlayer = useCallback(() => {
    if (!playerDivRef.current || playerRef.current) return;

    // Create a child div for YT to replace (so our ref stays valid)
    const el = document.createElement("div");
    el.style.width = "100%";
    el.style.height = "100%";
    playerDivRef.current.innerHTML = "";
    playerDivRef.current.appendChild(el);

    playerRef.current = new window.YT.Player(el, {
      videoId: youtubeId,
      playerVars: {
        controls: 0,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        fs: 0,
        iv_load_policy: 3,
        cc_load_policy: 0,
        disablekb: 1,
        playsinline: 1,
        origin: window.location.origin,
      },
      events: {
        onReady: (e: { target: YTPlayer }) => {
          setReady(true);
          setDuration(e.target.getDuration());
          setVolume(e.target.getVolume());
          setMuted(e.target.isMuted());

          /* Resume from saved position */
          if (
            savedWatchSecRef.current &&
            savedWatchSecRef.current > 5 &&
            !resumeAppliedRef.current &&
            !initialCompleted
          ) {
            resumeAppliedRef.current = true;
            const seekTo = Math.max(0, savedWatchSecRef.current - 3);
            e.target.seekTo(seekTo, true);
            setCurrentTime(seekTo);
            setResumeToast(formatTime(savedWatchSecRef.current));
            setTimeout(() => setResumeToast(null), 3000);
          }
        },
        onStateChange: (e: { data: number }) => {
          setPlaying(e.data === window.YT.PlayerState.PLAYING);
        },
      },
    });
  }, [youtubeId]);

  /* ─── Load YT API script & init ─── */
  useEffect(() => {
    let cancelled = false;

    function tryInit() {
      if (cancelled) return;
      if (window.YT && window.YT.Player) {
        createPlayer();
      } else {
        setTimeout(tryInit, 150);
      }
    }

    // Load script if not already loaded
    if (
      !document.querySelector('script[src*="youtube.com/iframe_api"]')
    ) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }

    tryInit();

    return () => {
      cancelled = true;
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          /* ignore */
        }
        playerRef.current = null;
      }
      setReady(false);
    };
  }, [createPlayer]);

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
      setTimeout(() => setAutoCompleteToast(false), 4000);
      onAutoCompleted?.();
    } catch {
      // Silently fail — user can still use the manual button
      autoCompletedRef.current = false;
    }
  }, [lessonId, productId, onAutoCompleted]);

  /* ─── Time update loop ─── */
  useEffect(() => {
    if (!ready) return;

    timerRef.current = setInterval(() => {
      if (
        playerRef.current &&
        typeof playerRef.current.getCurrentTime === "function"
      ) {
        const ct = playerRef.current.getCurrentTime();
        setCurrentTime(ct);
        const d = playerRef.current.getDuration();
        if (d > 0) {
          setDuration(d);

          // Auto-complete at 80% watch progress
          if (
            ct / d >= AUTO_COMPLETE_THRESHOLD &&
            !autoCompletedRef.current &&
            lessonId &&
            productId
          ) {
            triggerAutoComplete();
          }

          // Save watch_sec every 10 seconds (fire-and-forget)
          // Skip if auto-complete just fired to avoid concurrent upsert race condition
          if (lessonId && productId && !autoCompletedRef.current) {
            const now = Date.now();
            if (now - lastSaveTimeRef.current >= 10_000) {
              lastSaveTimeRef.current = now;
              fetch("/api/progress", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  lesson_id: lessonId,
                  product_id: productId,
                  watch_sec: Math.floor(ct),
                }),
              }).catch(() => {});
            }
          }
        }
      }
    }, 500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [ready, lessonId, productId, triggerAutoComplete]);

  /* ─── Fullscreen listener ─── */
  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  /* ─── Auto-hide controls ─── */
  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setShowControls(true);
    if (playing) {
      hideTimer.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [playing]);

  useEffect(() => {
    if (!playing) {
      setShowControls(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    } else {
      scheduleHide();
    }
  }, [playing, scheduleHide]);

  /* ─── Control handlers ─── */
  const togglePlay = () => {
    if (!playerRef.current) return;
    if (playing) playerRef.current.pauseVideo();
    else playerRef.current.playVideo();
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    if (muted) {
      playerRef.current.unMute();
      setMuted(false);
    } else {
      playerRef.current.mute();
      setMuted(true);
    }
  };

  const changeVolume = (v: number) => {
    if (!playerRef.current) return;
    playerRef.current.setVolume(v);
    setVolume(v);
    if (v === 0) {
      playerRef.current.mute();
      setMuted(true);
    } else if (muted) {
      playerRef.current.unMute();
      setMuted(false);
    }
  };

  const changeSpeed = (s: number) => {
    if (!playerRef.current) return;
    playerRef.current.setPlaybackRate(s);
    setSpeed(s);
    setShowSpeed(false);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!playerRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    playerRef.current.seekTo(pos * duration, true);
    setCurrentTime(pos * duration);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="rounded-xl overflow-hidden select-none"
      style={{ border: "1px solid #2a2a2a", background: "#000" }}
    >
      {/* Video area */}
      <div
        className="relative aspect-video bg-black"
        onMouseMove={scheduleHide}
        onClick={(e) => {
          // Close speed menu on outside click
          if (showSpeed) {
            setShowSpeed(false);
            return;
          }
          // Only toggle play if clicking the overlay area (not controls)
          const tag = (e.target as HTMLElement).tagName;
          if (tag !== "BUTTON" && tag !== "INPUT") {
            togglePlay();
            scheduleHide();
          }
        }}
      >
        {/* YouTube player container */}
        <div
          ref={playerDivRef}
          className="absolute inset-0 w-full h-full"
        />

        {/* Full-screen overlay to block ALL YouTube interactions */}
        <div
          className="absolute inset-0 z-10"
          style={{ cursor: "pointer" }}
        />

        {/* Play icon overlay when paused */}
        {ready && !playing && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
              <Play size={28} className="text-white ml-1" />
            </div>
          </div>
        )}

        {/* Loading state */}
        {!ready && (
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
              <span>Bài học đã hoàn thành!</span>
            </div>
          </div>
        )}
        {/* Resume toast */}
        {resumeToast && (
          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
            style={{ animation: "fadeSlideIn 0.3s ease-out" }}
          >
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#3b82f6]/90 backdrop-blur-sm text-white text-sm font-medium shadow-lg">
              <span>&#x25B6;</span>
              <span>Tiếp tục từ {resumeToast}</span>
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

        {/* Gradient fade for controls */}
        <div
          className={`absolute bottom-0 left-0 right-0 h-24 z-15 pointer-events-none transition-opacity duration-300 ${
            showControls ? "opacity-100" : "opacity-0"
          }`}
          style={{
            background:
              "linear-gradient(transparent, rgba(0,0,0,0.85))",
          }}
        />

        {/* Controls inside video area (for fullscreen) */}
        <div
          className={`absolute bottom-0 left-0 right-0 z-20 px-3 pb-2 pt-6 transition-opacity duration-300 ${
            showControls ? "opacity-100" : "opacity-0"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Progress bar */}
          <div
            className="h-1 bg-white/20 rounded-full cursor-pointer group mb-2 hover:h-1.5 transition-all"
            role="slider"
            aria-label="Tiến trình video"
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={currentTime}
            tabIndex={0}
            onClick={seek}
          >
            <div
              className="h-full bg-[#22c55e] rounded-full relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#22c55e] scale-0 group-hover:scale-100 transition-transform" />
            </div>
          </div>

          {/* Buttons row */}
          <div className="flex items-center gap-2 text-white">
            {/* Play / Pause */}
            <button
              onClick={togglePlay}
              aria-label={playing ? "Tạm dừng" : "Phát video"}
              className="p-1 hover:text-[#D4A843] transition-colors"
            >
              {playing ? <Pause size={18} /> : <Play size={18} />}
            </button>

            {/* Volume — slider is always visible on touch devices (no hover),
                and expands on hover for pointer/mouse devices */}
            <div className="flex items-center gap-1 group/vol">
              <button
                onClick={toggleMute}
                aria-label={muted ? "Bật âm thanh" : "Tắt âm thanh"}
                className="p-1 hover:text-[#D4A843] transition-colors"
              >
                {muted || volume === 0 ? (
                  <VolumeX size={16} />
                ) : (
                  <Volume2 size={16} />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={muted ? 0 : volume}
                onChange={(e) => changeVolume(Number(e.target.value))}
                className="w-16 [@media(hover:hover)]:w-0 [@media(hover:hover)]:group-hover/vol:w-16 transition-all duration-200 h-1 accent-[#D4A843] cursor-pointer"
              />
            </div>

            {/* Time */}
            <span className="text-[11px] text-gray-300 tabular-nums ml-1">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Speed */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSpeed(!showSpeed);
                }}
                aria-label="Tốc độ phát"
                className="flex items-center gap-1 text-[11px] text-gray-300 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/10"
              >
                <Gauge size={13} />
                {speed === 1 ? "Tốc độ" : `${speed}x`}
              </button>
              {showSpeed && (
                <div
                  className="absolute bottom-full right-0 mb-1 bg-[#1a1a1a] border border-[#333] rounded-lg py-1 min-w-[90px] shadow-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-3 py-1 text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                    Tốc độ
                  </div>
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      onClick={() => changeSpeed(s)}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                        speed === s
                          ? "text-[#D4A843] font-semibold bg-[#D4A843]/10"
                          : "text-gray-300 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {s === 1 ? "Bình thường" : `${s}x`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
              className="p-1 hover:text-[#D4A843] transition-colors"
            >
              {isFullscreen ? (
                <Minimize size={16} />
              ) : (
                <Maximize size={16} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
