"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import AuthorCard from "@/components/author/AuthorCard";
import MonoCaption from "@/components/author/MonoCaption";
import { updateAuthorProfile } from "@/lib/authorActions";
import type { AuthorRow } from "@/lib/authorApi";

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

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSavedAt(null);
    startTransition(async () => {
      try {
        await updateAuthorProfile({
          display_name: displayName.trim(),
          handle: handle.trim() || null,
          job_title: jobTitle.trim() || null,
          location: location.trim() || null,
          bio: bio.trim() || null,
          avatar_url: avatarUrl.trim() || null,
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
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={displayName}
                width={240}
                height={240}
                className="a-prof__avatar"
                unoptimized
                style={{ marginBottom: 12 }}
              />
            ) : (
              <div className="a-prof__avatar-fb" style={{ marginBottom: 12 }}>
                Kein Avatar
              </div>
            )}
            <label style={labelStyle}>Avatar-URL</label>
            <input
              style={inputStyle}
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://…"
            />
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
