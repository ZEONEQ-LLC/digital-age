"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import AuthorCard from "@/components/author/AuthorCard";
import MonoCaption from "@/components/author/MonoCaption";
import { updateAuthorProfile } from "@/lib/authorActions";
import { uploadAvatar } from "@/lib/storageActions";
import type { AuthorRow } from "@/lib/authorApi";

// Original-Upload-Größe: bewusst grosszügig, weil der Client direkt vor dem
// Upload via Canvas auf 512×512 JPEG q=0.85 (~80-120 KB) resized. Die DB-
// und Server-Limits (2 MB) prüfen den resized Blob.
const MAX_ORIGINAL_BYTES = 20 * 1024 * 1024;
const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp"];

async function resizeImage(file: File, maxSize = 512): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // document.createElement statt `new Image()` damit nichts mit dem
    // `next/image`-Default-Export kollidiert.
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

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--da-dark)",
  color: "var(--da-text)",
  border: "1px solid var(--da-border)",
  borderRadius: 4,
  padding: "11px 14px",
  fontSize: 14,
  fontFamily: "inherit",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  color: "var(--da-text-strong)",
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 8,
};

function socialOf(row: AuthorRow): Record<string, string | undefined> {
  return (row.social_links ?? {}) as Record<string, string | undefined>;
}

export default function ProfileEditor({ initial }: { initial: AuthorRow }) {
  const initialSocial = socialOf(initial);

  const [displayName, setDisplayName] = useState(initial.display_name);
  const [handle, setHandle] = useState(initial.handle ?? "");
  const [jobTitle, setJobTitle] = useState(initial.job_title ?? "");
  const [location, setLocation] = useState(initial.location ?? "");
  const [bio, setBio] = useState(initial.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initial.avatar_url ?? "");
  const [linkedin, setLinkedin] = useState(initialSocial.linkedin ?? "");
  const [x, setX] = useState(initialSocial.x ?? "");
  const [website, setWebsite] = useState(initialSocial.website ?? "");
  const [mastodon, setMastodon] = useState(initialSocial.mastodon ?? "");

  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadPending, startUpload] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSavedAt(null);
    startTransition(async () => {
      try {
        // avatar_url wird separat via uploadAvatar-Flow gepflegt — hier
        // bewusst nicht im Patch, damit der Upload-Flow autoritativ bleibt.
        await updateAuthorProfile({
          display_name: displayName.trim(),
          handle: handle.trim() || null,
          job_title: jobTitle.trim() || null,
          location: location.trim() || null,
          bio: bio.trim() || null,
          social_links: {
            linkedin: linkedin.trim() || null,
            x: x.trim() || null,
            website: website.trim() || null,
            mastodon: mastodon.trim() || null,
          },
        });
        setSavedAt(new Date().toLocaleTimeString("de-CH"));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
      }
    });
  }

  function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    if (file.size > MAX_ORIGINAL_BYTES) {
      setUploadError("Datei zu gross (max 20 MB Original).");
      e.target.value = "";
      return;
    }
    if (!ALLOWED_MIMES.includes(file.type)) {
      setUploadError("Nur JPEG, PNG oder WebP erlaubt.");
      e.target.value = "";
      return;
    }

    startUpload(async () => {
      try {
        const resized = await resizeImage(file, 512);
        const fd = new FormData();
        // Original-Filename behalten für extension/inhalt; Blob ist JPEG.
        fd.append("file", resized, file.name.replace(/\.[^.]+$/, ".jpg"));
        const { url } = await uploadAvatar(initial.id, fd);
        setAvatarUrl(url);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : "Upload fehlgeschlagen.");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    });
  }

  return (
    <form onSubmit={onSave}>
      <style>{`
        .a-prof__cols {
          display: grid; grid-template-columns: 1fr 280px; gap: 24px; align-items: start;
        }
        .a-prof__row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        .a-prof__aside { position: sticky; top: 24px; display: flex; flex-direction: column; gap: 16px; }
        .a-prof__avatar { width: 100%; aspect-ratio: 1/1; border-radius: 8px; object-fit: cover; display: block; }
        .a-prof__avatar-fb {
          width: 100%; aspect-ratio: 1/1; border-radius: 8px;
          background: var(--da-card);
          display: flex; align-items: center; justify-content: center;
          color: var(--da-faint);
          font-family: var(--da-font-mono);
          font-size: 12px;
        }
        .a-prof__avatar-wrap { position: relative; margin-bottom: 12px; }
        .a-prof__avatar-overlay {
          position: absolute; inset: 0;
          background: rgba(0,0,0,0.55);
          display: flex; align-items: center; justify-content: center;
          color: var(--da-text);
          font-family: var(--da-font-mono);
          font-size: 12px;
          border-radius: 8px;
        }
        .a-prof__avatar-input { display: none; }
        .a-prof__avatar-btn {
          width: 100%; background: transparent; color: var(--da-text);
          border: 1px solid var(--da-border); padding: 10px;
          border-radius: 4px; font-size: 12px; font-weight: 600; cursor: pointer;
          font-family: inherit;
        }
        .a-prof__avatar-btn:hover { border-color: var(--da-green); color: var(--da-green); }
        .a-prof__avatar-btn:disabled { opacity: 0.6; cursor: wait; }
        .a-prof__avatar-hint {
          color: var(--da-muted-soft); font-size: 11px;
          margin-top: 8px; line-height: 1.45;
          font-family: var(--da-font-mono);
        }
        .a-prof__save {
          align-self: flex-start; background: var(--da-green); color: var(--da-dark);
          border: none; padding: 12px 24px; border-radius: 4px;
          font-size: 13px; font-weight: 700; cursor: pointer;
          font-family: inherit;
        }
        .a-prof__save:disabled { opacity: 0.6; cursor: not-allowed; }
        @media (max-width: 1024px) {
          .a-prof__cols { grid-template-columns: 1fr; }
          .a-prof__aside { position: static; }
        }
        @media (max-width: 540px) {
          .a-prof__row { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="a-prof__cols">
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <AuthorCard padding={24}>
            <MonoCaption>Identität</MonoCaption>
            <div className="a-prof__row">
              <div>
                <label style={labelStyle}>Anzeigename</label>
                <input
                  style={inputStyle}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Handle (URL)</label>
                <input
                  style={inputStyle}
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="z.B. ali-soy"
                />
              </div>
            </div>
            <div className="a-prof__row">
              <div>
                <label style={labelStyle}>Job-Titel</label>
                <input
                  style={inputStyle}
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="z.B. Senior Banking Reporter"
                />
              </div>
              <div>
                <label style={labelStyle}>Standort</label>
                <input
                  style={inputStyle}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Zürich"
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Bio</label>
              <textarea
                rows={5}
                style={{ ...inputStyle, resize: "vertical" }}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Wer du bist, woran du arbeitest…"
              />
            </div>
          </AuthorCard>

          <AuthorCard padding={24}>
            <MonoCaption>Social &amp; Web</MonoCaption>
            <div className="a-prof__row">
              <div>
                <label style={labelStyle}>LinkedIn</label>
                <input
                  style={inputStyle}
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  placeholder="linkedin.com/in/…"
                />
              </div>
              <div>
                <label style={labelStyle}>X / Twitter</label>
                <input
                  style={inputStyle}
                  value={x}
                  onChange={(e) => setX(e.target.value)}
                />
              </div>
            </div>
            <div className="a-prof__row" style={{ marginBottom: 0 }}>
              <div>
                <label style={labelStyle}>Website</label>
                <input
                  style={inputStyle}
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://…"
                />
              </div>
              <div>
                <label style={labelStyle}>Mastodon</label>
                <input
                  style={inputStyle}
                  value={mastodon}
                  onChange={(e) => setMastodon(e.target.value)}
                />
              </div>
            </div>
          </AuthorCard>

          {error && (
            <div
              style={{
                background: "rgba(255,92,92,0.12)",
                border: "1px solid var(--da-red, #ff5c5c)",
                color: "var(--da-red, #ff5c5c)",
                padding: "10px 14px",
                borderRadius: 6,
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button type="submit" className="a-prof__save" disabled={pending}>
              {pending ? "Speichert…" : "Änderungen speichern"}
            </button>
            {savedAt && (
              <span style={{ color: "var(--da-green)", fontSize: 12, fontFamily: "var(--da-font-mono)" }}>
                ✓ Gespeichert um {savedAt}
              </span>
            )}
          </div>
        </div>

        <aside className="a-prof__aside">
          <AuthorCard padding={20}>
            <MonoCaption>Avatar</MonoCaption>
            <div className="a-prof__avatar-wrap">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={displayName}
                  width={240}
                  height={240}
                  className="a-prof__avatar"
                  unoptimized
                />
              ) : (
                <div className="a-prof__avatar-fb">Kein Avatar</div>
              )}
              {uploadPending && (
                <div className="a-prof__avatar-overlay">Lädt hoch…</div>
              )}
            </div>
            <input
              ref={fileInputRef}
              className="a-prof__avatar-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onAvatarChange}
            />
            <button
              type="button"
              className="a-prof__avatar-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadPending}
            >
              {uploadPending ? "Lädt hoch…" : avatarUrl ? "Bild ändern" : "Bild hochladen"}
            </button>
            <p className="a-prof__avatar-hint">JPEG, PNG oder WebP · wird auf 512×512 verkleinert</p>
            {uploadError && (
              <p
                style={{
                  color: "var(--da-red, #ff5c5c)",
                  fontSize: 12,
                  marginTop: 8,
                  lineHeight: 1.4,
                }}
              >
                {uploadError}
              </p>
            )}
          </AuthorCard>
          <AuthorCard padding={18} accent="var(--da-green)">
            <MonoCaption color="var(--da-green)">Profil-Vorschau</MonoCaption>
            <p style={{ color: "var(--da-text)", fontSize: 14, fontWeight: 700, marginBottom: 2 }}>
              {displayName || "—"}
            </p>
            {jobTitle && (
              <p style={{ color: "var(--da-orange)", fontSize: 11, fontWeight: 600, marginBottom: 8 }}>
                {jobTitle}
              </p>
            )}
            {bio && (
              <p style={{ color: "var(--da-muted)", fontSize: 12, lineHeight: 1.5 }}>{bio}</p>
            )}
          </AuthorCard>
        </aside>
      </div>
    </form>
  );
}
