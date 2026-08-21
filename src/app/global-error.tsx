"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          background: "#F7F7F5",
          color: "#37352F",
        }}
      >
        <main style={{ maxWidth: 480, padding: "2rem", textAlign: "center" }}>
          <p
            style={{
              margin: "0 0 0.5rem",
              fontSize: 12,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#9B9A97",
            }}
          >
            Something went wrong
          </p>
          <h1 style={{ margin: "0 0 0.75rem", fontSize: 28, fontWeight: 600 }}>
            DailyHub hit an error
          </h1>
          <p style={{ margin: "0 0 1.5rem", lineHeight: 1.5, color: "#787774" }}>
            The app could not recover from an unexpected failure. Reload to try
            again.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: "0.5rem 1rem",
              fontSize: 13,
              fontWeight: 500,
              color: "#fff",
              background: "#2383E2",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
