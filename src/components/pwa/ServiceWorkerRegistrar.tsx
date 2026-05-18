"use client";

import { useEffect, useState, useCallback } from "react";

export default function ServiceWorkerRegistrar() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(
    null
  );

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // Check for updates periodically (every 60 minutes)
        const interval = setInterval(
          () => {
            registration.update();
          },
          60 * 60 * 1000
        );

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // New version available
              setWaitingWorker(newWorker);
              setUpdateAvailable(true);
            }
          });
        });

        return () => clearInterval(interval);
      })
      .catch((err) => {
        console.error("SW registration failed:", err);
      });
  }, []);

  const handleUpdate = useCallback(() => {
    if (!waitingWorker) return;
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
    setUpdateAvailable(false);
    window.location.reload();
  }, [waitingWorker]);

  const handleDismiss = useCallback(() => {
    setUpdateAvailable(false);
  }, []);

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:max-w-sm">
      <div className="flex items-center gap-3 rounded-xl border border-[#333] bg-[#111] p-4 shadow-2xl">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#D4A843]/10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#D4A843"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white">
            Phiên bản mới có sẵn
          </p>
          <p className="text-xs text-gray-400">
            Tải lại để cập nhật ứng dụng
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            onClick={handleDismiss}
            className="rounded-lg px-3 py-1.5 text-xs text-gray-400 transition-colors hover:text-white"
            aria-label="Để sau"
          >
            Để sau
          </button>
          <button
            onClick={handleUpdate}
            className="rounded-lg bg-[#D4A843] px-3 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-[#c49a3a]"
          >
            Tải lại
          </button>
        </div>
      </div>
    </div>
  );
}
