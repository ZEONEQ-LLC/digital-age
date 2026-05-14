"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { uploadAvatar } from "@/lib/storageActions";

// Avatar-Upload-Block — wiederverwendbar für Self-Edit (ProfileEditor) und
// Editor-Edit (EditAuthorDrawer). Server-Action `uploadAvatar` prüft die
// Berechtigung (own ODER role=editor), DB-Update + Old-File-Cleanup laufen
// dort. Hier nur Client-Side: Resize via Canvas auf 512×512 JPEG q=0.85.

const MAX_ORIGINAL_BYTES = 20 * 1024 * 1024;
const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp"];

async function resizeImage(file: File, maxSize = 512): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    const url = URL.createObjectURL(file);
    const cleanup = () => URL.revokeObjectURL(url);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        cleanup();
        reject(new Error("Canvas-Context nicht verfügbar."));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          cleanup();
          if (blob) resolve(blob);
          else reject(new Error("Blob-Konvertierung fehlgeschlagen."));
        },
        "image/jpeg",
        0.85,
      );
    };
    img.onerror = () => {
      cleanup();
      reject(new Error("Bild konnte nicht gelesen werden."));
    };
    img.src = url;
  });
}

type Props = {
  authorId: string;
  authorName: string;
  currentAvatarUrl: string;
  onUploaded: (newUrl: string) => void;
};

export default function AvatarUploadBlock({
  authorId,
  authorName,
  currentAvatarUrl,
  onUploaded,
}: Props) {
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl);
  const [error, setError] = useState<string | null>(null);
  const [pending, startUpload] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    if (!ALLOWED_MIMES.includes(file.type)) {
      setError("Nur JPEG, PNG oder WebP erlaubt.");
      return;
    }
    if (file.size > MAX_ORIGINAL_BYTES) {
      setError("Datei zu gross (max 20 MB Original).");
      return;
    }
    startUpload(async () => {
      try {
        const blob = await resizeImage(file);
        const resized = new File([blob], "avatar.jpg", { type: "image/jpeg" });
        const form = new FormData();
        form.append("file", resized);
        const { url } = await uploadAvatar(authorId, form);
        // Cache-Bust damit Browser-Cache nicht das alte Bild zeigt
        const busted = `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`;
        setAvatarUrl(busted);
        onUploaded(busted);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload fehlgeschlagen.");
      }
    });
  }

  return (
    <div style={{ marginBottom: 18 }}>
      <label
        style={{
          display: "block",
          color: "var(--da-faint)",
          fontFamily: "var(--da-font-mono)",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        Avatar
      </label>
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: "50%",
            overflow: "hidden",
            background: "var(--da-dark)",
            border: "1px solid var(--da-border)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--da-muted)",
            fontSize: 28,
            fontWeight: 600,
          }}
        >
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={authorName}
              width={88}
              height={88}
              style={{ objectFit: "cover", width: 88, height: 88 }}
              unoptimized
            />
          ) : (
            authorName.charAt(0).toUpperCase()
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <input
            ref={fileRef}
            type="file"
            accept={ALLOWED_MIMES.join(",")}
            onChange={onPick}
            style={{ display: "none" }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={pending}
            style={{
              background: "var(--da-green)",
              color: "var(--da-dark)",
              border: "none",
              padding: "9px 16px",
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 700,
              cursor: pending ? "wait" : "pointer",
              fontFamily: "inherit",
              opacity: pending ? 0.7 : 1,
            }}
          >
            {pending ? "Lade hoch…" : avatarUrl ? "Bild ändern" : "Bild hochladen"}
          </button>
          <p style={{ color: "var(--da-faint)", fontSize: 11, marginTop: 8, lineHeight: 1.5 }}>
            JPEG, PNG oder WebP. Wird client-side auf 512×512 verkleinert.
          </p>
          {error && (
            <p style={{ color: "var(--da-red)", fontSize: 12, marginTop: 6, fontWeight: 600 }}>
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
