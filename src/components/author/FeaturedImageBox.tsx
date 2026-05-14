"use client";

import { useState } from "react";
import AuthorCard from "./AuthorCard";
import MonoCaption from "./MonoCaption";
import ImageUploader from "@/components/editor/ImageUploader";
import { deleteArticleImage } from "@/lib/storageActions";

type Props = {
  articleId: string;
  coverImageUrl: string;
  onCoverChange: (url: string) => void;
};

function extractFilename(url: string): string | null {
  const match = url.match(/\/articles\/[^/]+\/([^?]+)$/);
  return match ? match[1] : null;
}

export default function FeaturedImageBox({ articleId, coverImageUrl, onCoverChange }: Props) {
  const [busy, setBusy] = useState(false);

  async function handleRemove() {
    if (!coverImageUrl) return;
    if (!confirm("Beitragsbild entfernen?")) return;
    setBusy(true);
    try {
      const filename = extractFilename(coverImageUrl);
      if (filename) {
        try {
          await deleteArticleImage(articleId, filename);
        } catch {
          // best-effort — Storage-Delete fehlschlag soll DB-Patch nicht blockieren
        }
      }
      onCoverChange("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthorCard padding={18}>
      <MonoCaption>Beitragsbild</MonoCaption>
      <div style={{ marginTop: 4 }}>
        <ImageUploader
          articleId={articleId}
          currentImageUrl={coverImageUrl || undefined}
          onUploadComplete={onCoverChange}
        />
        {coverImageUrl && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={busy}
            style={{
              marginTop: 10,
              width: "100%",
              background: "transparent",
              color: "var(--da-muted-soft)",
              border: "1px solid var(--da-border)",
              padding: "7px 12px",
              borderRadius: 4,
              fontSize: 11,
              fontFamily: "var(--da-font-mono)",
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.5 : 1,
            }}
          >
            {busy ? "Entferne…" : "Bild entfernen"}
          </button>
        )}
        <p style={{ color: "var(--da-faint)", fontSize: 10, marginTop: 8, lineHeight: 1.5 }}>
          Wird auf Listing-Pages und im Hero auf der Detail-Page verwendet.
          Speichern nicht vergessen.
        </p>
      </div>
    </AuthorCard>
  );
}
