"use client";

/** Last-resort boundary when the root layout itself fails; it renders its own document. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f3f5fb", color: "#0f1a3d" }}>
        <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ maxWidth: 420, textAlign: "center" }}>
            <h1 style={{ fontSize: 30, margin: 0, letterSpacing: "-0.02em" }}>LinguaChat didn&apos;t load</h1>
            <p style={{ color: "#3f4867", lineHeight: 1.5 }}>Something went wrong while starting the app. Reload to try again.</p>
            <button
              type="button"
              onClick={reset}
              style={{ marginTop: 12, height: 44, padding: "0 20px", border: 0, borderRadius: 10, background: "#2340c8", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer" }}
            >
              Reload
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
