"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import AuthorShell from "@/components/author/AuthorShell";
import AuthorCard from "@/components/author/AuthorCard";
import MonoCaption from "@/components/author/MonoCaption";
import PageTitle from "@/components/author/PageTitle";
import { getCurrentAuthor } from "@/lib/mockAuthorApi";
import type { Author } from "@/types/author";

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--da-dark)",
  color: "var(--da-text)",
  border: "1px solid var(--da-border)",
  borderRadius: 4,
  padding: "11px 14px",
  fontSize: 14,
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  color: "var(--da-text-strong)",
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 8,
};

export default function ProfilePage() {
  const initial = useMemo(() => getCurrentAuthor(), []);
  const [data, setData] = useState<Author>(initial);
  const [savedToast, setSavedToast] = useState(false);

  const set = <K extends keyof Author>(k: K, v: Author[K]) => setData((p) => ({ ...p, [k]: v }));
  const setSocial = (k: "linkedin" | "x" | "mastodon", v: string) =>
    setData((p) => ({ ...p, social: { ...p.social, [k]: v } }));

  const onSave = () => {
    // mockApi has no setProfile; just simulate.
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2400);
  };

  return (
    <AuthorShell>
      <PageTitle
        title="Profil"
        subtitle={`@${data.handle} · digital-age.ch/autor/${data.handle}`}
      />

      <style>{`
        .a-prof__cols {
          display: grid; grid-template-columns: 1fr 280px; gap: 24px; align-items: start;
        }
        .a-prof__row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        .a-prof__notif {
          display: flex; justify-content: space-between; align-items: center;
          padding: 10px 0; border-bottom: 1px solid var(--da-border);
          color: var(--da-text-strong); font-size: 13px; cursor: pointer;
        }
        .a-prof__notif:last-child { border-bottom: none; }
        .a-prof__aside { position: sticky; top: 24px; display: flex; flex-direction: column; gap: 16px; }
        .a-prof__avatar { width: 100%; aspect-ratio: 1/1; border-radius: 8px; object-fit: cover; display: block; }
        .a-prof__btn-secondary {
          width: 100%; background: transparent; color: var(--da-text);
          border: 1px solid var(--da-border); padding: 10px;
          border-radius: 4px; font-size: 12px; font-weight: 600; cursor: pointer;
          font-family: inherit;
        }
        .a-prof__save {
          align-self: flex-start; background: var(--da-green); color: var(--da-dark);
          border: none; padding: 12px 24px; border-radius: 4px;
          font-size: 13px; font-weight: 700; cursor: pointer;
          font-family: inherit;
        }
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
                <input style={inputStyle} value={data.name} onChange={(e) => set("name", e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Handle</label>
                <input style={inputStyle} value={data.handle} onChange={(e) => set("handle", e.target.value)} />
              </div>
            </div>
            <div className="a-prof__row">
              <div>
                <label style={labelStyle}>Rolle / Titel</label>
                <input style={inputStyle} value={data.role ?? ""} onChange={(e) => set("role", e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Standort</label>
                <input style={inputStyle} value={data.location ?? ""} onChange={(e) => set("location", e.target.value)} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Bio (Markdown unterstützt)</label>
              <textarea
                rows={4}
                style={{ ...inputStyle, resize: "vertical" }}
                value={data.bio}
                onChange={(e) => set("bio", e.target.value)}
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
                  value={data.social?.linkedin ?? ""}
                  onChange={(e) => setSocial("linkedin", e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>X / Twitter</label>
                <input
                  style={inputStyle}
                  value={data.social?.x ?? ""}
                  onChange={(e) => setSocial("x", e.target.value)}
                />
              </div>
            </div>
            <div className="a-prof__row" style={{ marginBottom: 0 }}>
              <div>
                <label style={labelStyle}>Website</label>
                <input
                  style={inputStyle}
                  value={data.website ?? ""}
                  onChange={(e) => set("website", e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Mastodon</label>
                <input
                  style={inputStyle}
                  value={data.social?.mastodon ?? ""}
                  onChange={(e) => setSocial("mastodon", e.target.value)}
                />
              </div>
            </div>
          </AuthorCard>

          <AuthorCard padding={24}>
            <MonoCaption>Benachrichtigungen</MonoCaption>
            {[
              ["E-Mail bei Review-Feedback", true],
              ["E-Mail bei Veröffentlichung", true],
              ["Wöchentlicher Performance-Report", false],
              ["Newsletter über Plattform-Updates", true],
            ].map(([label, def]) => (
              <label key={label as string} className="a-prof__notif">
                <span>{label}</span>
                <input
                  type="checkbox"
                  defaultChecked={def as boolean}
                  style={{ accentColor: "var(--da-green)", width: 16, height: 16 }}
                />
              </label>
            ))}
          </AuthorCard>

          <button type="button" className="a-prof__save" onClick={onSave}>
            Änderungen speichern
          </button>
          {savedToast && (
            <p style={{ color: "var(--da-green)", fontSize: 12, fontFamily: "var(--da-font-mono)" }}>
              ✓ Profil aktualisiert (mock — nicht persistiert)
            </p>
          )}
        </div>

        <aside className="a-prof__aside">
          <AuthorCard padding={20}>
            <MonoCaption>Avatar</MonoCaption>
            <Image
              src={data.avatar}
              alt={data.name}
              width={240}
              height={240}
              className="a-prof__avatar"
              unoptimized
              style={{ marginBottom: 12 }}
            />
            <button type="button" className="a-prof__btn-secondary" disabled title="Upload kommt mit Supabase Storage">
              Bild ändern
            </button>
          </AuthorCard>
          <AuthorCard padding={18} accent="var(--da-green)">
            <MonoCaption color="var(--da-green)">Profil-Vorschau</MonoCaption>
            <p style={{ color: "var(--da-text)", fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{data.name}</p>
            {data.role && (
              <p style={{ color: "var(--da-orange)", fontSize: 11, fontWeight: 600, marginBottom: 8 }}>
                {data.role}
              </p>
            )}
            <p style={{ color: "var(--da-muted)", fontSize: 12, lineHeight: 1.5 }}>{data.bio}</p>
          </AuthorCard>
        </aside>
      </div>
    </AuthorShell>
  );
}
