"use client";

import { useEffect, useRef, useCallback, useState } from "react";

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  className?: string;
  /** Timeout in ms before auto-bypassing. Default 8000ms */
  timeout?: number;
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
          size?: "normal" | "compact";
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
  timeout = 8000,
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
    // On Turnstile error, auto-bypass so user can still login
    if (!verifiedRef.current) {
      verifiedRef.current = true;
      onVerify("__turnstile_error__");
      onError?.();
    }
  }, [onVerify, onError]);

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
      size: "normal",
    });
  }, [siteKey, handleVerify, onExpire, handleError]);

  useEffect(() => {
    // Timeout: if Turnstile doesn't verify within timeout, bypass it
    const timer = setTimeout(() => {
      if (!verifiedRef.current) {
        setTimedOut(true);
        verifiedRef.current = true;
        onVerify("__turnstile_timeout__");
      }
    }, timeout);

    return () => clearTimeout(timer);
  }, [timeout, onVerify]);

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

  // If timed out, hide the widget completely
  if (timedOut) return null;

  return <div ref={containerRef} className={className} />;
}
