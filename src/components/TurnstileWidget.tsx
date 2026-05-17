"use client";

import { useEffect, useRef, useCallback, useState } from "react";

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  className?: string;
  /** Timeout in ms before showing load error. Default 10000ms */
  timeout?: number;
  /** Widget appearance: "always" shows the widget, "interaction-only" shows only when
   *  Cloudflare needs user interaction, "execute" is fully invisible. Default: "interaction-only" */
  appearance?: "always" | "interaction-only" | "execute";
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "dark" | "light" | "auto";
          size?: "normal" | "compact" | "invisible";
          appearance?: "always" | "interaction-only" | "execute";
        }
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

export default function TurnstileWidget({
  onVerify,
  onExpire,
  onError,
  className = "",
  timeout = 10000,
  appearance = "interaction-only",
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const renderedRef = useRef(false);
  const verifiedRef = useRef(false);
  const [timedOut, setTimedOut] = useState(false);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const handleVerify = useCallback(
    (token: string) => {
      verifiedRef.current = true;
      onVerify(token);
    },
    [onVerify]
  );

  const handleError = useCallback(() => {
    // On Turnstile error, don't bypass - show error and let user retry
    if (!verifiedRef.current) {
      console.warn("[Turnstile] Widget encountered an error");
      setTimedOut(true);
      onError?.();
    }
  }, [onError]);

  const renderWidget = useCallback(() => {
    if (
      !containerRef.current ||
      !window.turnstile ||
      !siteKey ||
      renderedRef.current
    )
      return;

    renderedRef.current = true;
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: handleVerify,
      "expired-callback": onExpire,
      "error-callback": handleError,
      theme: "dark",
      size: appearance === "execute" ? "invisible" : "normal",
      appearance,
    });
  }, [siteKey, handleVerify, onExpire, handleError]);

  useEffect(() => {
    // Timeout: if Turnstile doesn't load within timeout, show error
    const timer = setTimeout(() => {
      if (!verifiedRef.current) {
        console.warn("[Turnstile] Widget load timeout");
        setTimedOut(true);
        // Don't set any token - keep the form disabled
      }
    }, timeout);

    return () => clearTimeout(timer);
  }, [timeout]);

  useEffect(() => {
    // If Turnstile is already loaded, render immediately
    if (window.turnstile) {
      renderWidget();
      return;
    }

    // Otherwise, load the script
    const existingScript = document.querySelector(
      'script[src*="turnstile"]'
    );
    if (!existingScript) {
      window.onTurnstileLoad = renderWidget;
      const script = document.createElement("script");
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad";
      script.async = true;
      script.defer = true;
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
    } else {
      // Script exists but Turnstile may not be ready yet
      const interval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(interval);
          renderWidget();
        }
      }, 100);
      return () => clearInterval(interval);
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
        renderedRef.current = false;
      }
    };
  }, [renderWidget]);

  if (!siteKey) return null;

  // If timed out or errored, show a message and let user retry
  if (timedOut) {
    return (
      <div className={className}>
        <p className="text-sm text-red-400">
          Security check failed to load.{" "}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="underline text-red-300 hover:text-red-200"
          >
            Reload page to retry
          </button>
        </p>
      </div>
    );
  }

  return <div ref={containerRef} className={className} />;
}
