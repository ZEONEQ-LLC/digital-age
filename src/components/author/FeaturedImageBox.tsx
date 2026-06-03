"use client";

import { useState } from "react";
import AuthorCard from "./AuthorCard";
import MonoCaption from "./MonoCaption";
import ImageUploader from "@/components/editor/ImageUploader";
import { deleteArticleImage } from "@/lib/storageActions";
import CoverMetadataModal from "./CoverMetadataModal";

export type CoverMetadata = {
  alt: string;
  caption: string;
  source: string;
};

type Props = {
  articleId: string;
  coverImageUrl: string;
  onCoverChange: (url: string) => void;
  metadata: CoverMetadata;
  onMetadataChange: (next: CoverMetadata) => void;
};

function extractFilename(url: string): string | null {
  const match = url.match(/\/articles\/[^/]+\/([^?]+)$/);
  return match ? match[1] : null;
}

export default function FeaturedImageBox({
  articleId,
  coverImageUrl,
  onCoverChange,
  metadata,
  onMetadataChange,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Status-Indikator nur fuer ALT — Caption/Source bleiben optional und
  // beeinflussen den Indikator nicht (Pflicht-Charakter siehe Modal-Label).
  const altSet = metadata.alt.trim().length > 0;

  // Cover-Wechsel und Cover-Entfernen muessen die drei Metadaten-Felder
  // zuruecksetzen, sonst haengt ein ALT vom alten Bild am neuen — Daten-
  // Integritaetsfehler. State-Pfad: hier setzen → EditorClient.setCoverMetadata
  // → buildPatchUnchecked trimmt leeren String zu null → DB speichert null.
  function resetMetadata() {
    onMetadataChange({ alt: "", caption: "", source: "" });
  }

  // Wrapper fuer Upload-Callback: setzt URL UND resettet Metadaten in
  // einem Render-Cycle, damit der State konsistent bleibt.
  function handleCoverUploaded(url: string) {
    onCoverChange(url);
    resetMetadata();
  }

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
      resetMetadata();
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
          onUploadComplete={handleCoverUploaded}
        />
        {coverImageUrl && (
          <>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              style={{
                marginTop: 10,
                width: "100%",
                background: "transparent",
                color: altSet ? "var(--da-green)" : "var(--da-orange)",
                border: `1px solid ${altSet ? "var(--da-green)" : "var(--da-orange)"}`,
                padding: "7px 12px",
                borderRadius: 4,
                fontSize: 11,
                fontFamily: "var(--da-font-mono)",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
              aria-label={
                altSet
                  ? "Bild-Details bearbeiten (Alt-Text gesetzt)"
                  : "Bild-Details bearbeiten (Alt-Text fehlt)"
              }
            >
              <span aria-hidden style={{ fontSize: 13, lineHeight: 1 }}>
                {altSet ? "✓" : "!"}
              </span>
              <span>Bild-Details</span>
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy}
              style={{
                marginTop: 8,
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
          </>
        )}
        <p style={{ color: "var(--da-faint)", fontSize: 10, marginTop: 8, lineHeight: 1.5 }}>
          Wird auf Listing-Pages und im Hero auf der Detail-Page verwendet.
          Speichern nicht vergessen.
        </p>
      </div>
      <CoverMetadataModal
        open={modalOpen}
        initialAlt={metadata.alt}
        initialCaption={metadata.caption}
        initialSource={metadata.source}
        onSave={(next) => {
          onMetadataChange(next);
          setModalOpen(false);
        }}
        onClose={() => setModalOpen(false)}
      />
    </AuthorCard>
  );
}
