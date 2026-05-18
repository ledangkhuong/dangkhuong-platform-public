"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { IS_SENTRY_ENABLED } from "@/lib/monitoring/sentry";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[ErrorBoundary]", error, errorInfo);

    if (IS_SENTRY_ENABLED) {
      // @ts-expect-error -- @sentry/nextjs may not be installed yet
      import("@sentry/nextjs").then((Sentry: { captureException: (e: Error, o?: unknown) => void }) => {
        Sentry.captureException(error, {
          extra: { componentStack: errorInfo.componentStack },
        });
      }).catch(() => {});
    }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "50vh",
            padding: "2rem",
            backgroundColor: "#0a0a0a",
            color: "#f5f5f5",
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          <div
            style={{
              maxWidth: "28rem",
              textAlign: "center",
              padding: "2.5rem",
              borderRadius: "1rem",
              backgroundColor: "#111111",
              border: "1px solid #222222",
            }}
          >
            <div
              style={{
                fontSize: "3rem",
                marginBottom: "1rem",
              }}
              aria-hidden="true"
            >
              &#9888;
            </div>
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                marginBottom: "0.75rem",
                color: "#f5f5f5",
              }}
            >
              {"Đã xảy ra lỗi"}
            </h2>
            <p
              style={{
                fontSize: "0.95rem",
                color: "#a3a3a3",
                marginBottom: "1.5rem",
                lineHeight: 1.6,
              }}
            >
              {"Rất tiếc, đã có lỗi xảy ra. Vui lòng thử lại."}
            </p>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <pre
                style={{
                  fontSize: "0.75rem",
                  color: "#ef4444",
                  backgroundColor: "#1a1a1a",
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  marginBottom: "1.5rem",
                  textAlign: "left",
                  overflowX: "auto",
                  maxHeight: "10rem",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleRetry}
              style={{
                padding: "0.625rem 1.5rem",
                fontSize: "0.95rem",
                fontWeight: 600,
                color: "#0a0a0a",
                backgroundColor: "#D4A843",
                border: "none",
                borderRadius: "0.5rem",
                cursor: "pointer",
                transition: "background-color 150ms ease",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.backgroundColor = "#FBBF24")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.backgroundColor = "#D4A843")
              }
            >
              {"Thử lại"}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
