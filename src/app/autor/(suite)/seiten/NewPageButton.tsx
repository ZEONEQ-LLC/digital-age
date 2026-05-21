"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createPage } from "@/lib/pageActions";

export default function NewPageButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await createPage({ slug: slug.trim(), title: title.trim() });
        setOpen(false);
        router.push(`/autor/seiten/${res.id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unbekannter Fehler.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          background: "var(--da-green)",
          color: "var(--da-dark)",
          border: "none",
          borderRadius: 4,
          padding: "10px 16px",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        + Neue Seite
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            style={{
              background: "var(--da-card)",
              border: "1px solid var(--da-border)",
              borderRadius: 8,
              padding: 24,
              maxWidth: 480,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <h2 style={{ color: "var(--da-text)", fontSize: 18, fontWeight: 700 }}>Neue Seite</h2>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ color: "var(--da-muted)", fontSize: 12 }}>Titel</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="z.B. Über uns"
                style={inputStyle}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ color: "var(--da-muted)", fontSize: 12 }}>
                Slug (URL-Pfad, nur Kleinbuchstaben/Ziffern/Bindestriche)
              </span>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                placeholder="z.B. ueber-uns"
                style={{ ...inputStyle, fontFamily: "var(--da-font-mono)" }}
              />
            </label>

            {error && (
              <p style={{ color: "#ff8e8e", fontSize: 12, margin: 0 }} role="alert">
                {error}
              </p>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                style={cancelBtnStyle}
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={pending || !slug.trim() || !title.trim()}
                style={{
                  ...primaryBtnStyle,
                  opacity: pending || !slug.trim() || !title.trim() ? 0.6 : 1,
                }}
              >
                {pending ? "Erstelle…" : "Anlegen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const inputStyle: React.CSSProperties = {
  background: "var(--da-dark)",
  color: "var(--da-text)",
  border: "1px solid var(--da-border)",
  borderRadius: 4,
  padding: "10px 12px",
  fontSize: 13,
  fontFamily: "inherit",
};

const primaryBtnStyle: React.CSSProperties = {
  background: "var(--da-green)",
  color: "var(--da-dark)",
  border: "none",
  borderRadius: 4,
  padding: "8px 16px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
};

const cancelBtnStyle: React.CSSProperties = {
  background: "transparent",
  color: "var(--da-muted)",
  border: "1px solid var(--da-border)",
  borderRadius: 4,
  padding: "8px 16px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
};
