"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AuthorWithCount, AuthorRole } from "@/lib/editorAdminApi";
import {
  createAuthorPlaceholder,
  createAuthorWithInvite,
  generateInviteForExistingPlaceholder,
} from "@/lib/inviteActions";
import {
  updateAuthorAsEditor,
  deleteAuthorAsEditor,
  type AuthorAdminPatch,
} from "@/lib/authorAdminActions";
import { buildInviteMessage } from "@/lib/inviteTextTemplate";
import AvatarUploadBlock from "@/components/author/AvatarUploadBlock";

type Props = { initialAuthors: AuthorWithCount[]; inviterName: string };

type ModalMode = "closed" | "form" | "success";
type ModalForm = { email: string; display_name: string; intended_role: "author" | "editor" };
type SuccessResult = {
  token: string;
  email: string;
  display_name: string;
  intended_role: "author" | "editor";
};

const roleStyles: Record<AuthorRole, { bg: string; color: string; label: string }> = {
  external: { bg: "rgba(85,85,85,0.18)", color: "var(--da-muted-soft)", label: "External" },
  author:   { bg: "rgba(50,255,126,0.10)", color: "var(--da-green)",     label: "Author" },
  editor:   { bg: "rgba(255,140,66,0.14)", color: "var(--da-orange)",    label: "Editor" },
};

function inviteUrlFor(token: string): string {
  if (typeof window === "undefined") return `/onboarding?token=${token}`;
  return `${window.location.origin}/onboarding?token=${token}`;
}

export default function AdminAuthorsClient({ initialAuthors, inviterName }: Props) {
  const router = useRouter();
  // Direkt die Prop verwenden — useState würde nur den initialen Mount-Wert
  // halten und sich nicht updaten, wenn router.refresh() neue Server-Daten holt.
  const authors = initialAuthors;

  const [modalMode, setModalMode] = useState<ModalMode>("closed");
  const [modalForm, setModalForm] = useState<ModalForm>({ email: "", display_name: "", intended_role: "author" });
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<SuccessResult | null>(null);
  const [modalPending, startModalTransition] = useTransition();

  const [drawerAuthorId, setDrawerAuthorId] = useState<string | null>(null);
  const drawerAuthor = drawerAuthorId ? authors.find((a) => a.id === drawerAuthorId) ?? null : null;

  function openAddModal() {
    setModalForm({ email: "", display_name: "", intended_role: "author" });
    setModalError(null);
    setModalSuccess(null);
    setModalMode("form");
  }

  function closeModal() {
    setModalMode("closed");
    setModalError(null);
    setModalSuccess(null);
  }

  function submitOnlySave() {
    setModalError(null);
    startModalTransition(async () => {
      try {
        await createAuthorPlaceholder(modalForm);
        closeModal();
        router.refresh();
      } catch (e) {
        setModalError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  function submitWithInvite() {
    setModalError(null);
    startModalTransition(async () => {
      try {
        const { invite } = await createAuthorWithInvite(modalForm);
        setModalSuccess({
          token: invite.token,
          email: invite.email,
          display_name: invite.display_name ?? modalForm.display_name,
          intended_role: modalForm.intended_role,
        });
        setModalMode("success");
        router.refresh();
      } catch (e) {
        setModalError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  function copyInviteMessage(opts: { token: string; display_name: string; intended_role: "author" | "editor" }) {
    const message = buildInviteMessage({
      recipientName: opts.display_name,
      inviterName,
      inviteUrl: inviteUrlFor(opts.token),
      intendedRole: opts.intended_role,
    });
    navigator.clipboard.writeText(message);
  }

  return (
    <>
      <style>{`
        .a-adm-header { display: flex; justify-content: flex-end; margin-bottom: 18px; }
        .a-adm-btn-primary {
          background: var(--da-green); color: var(--da-dark);
          border: none; padding: 10px 16px; border-radius: 4px;
          font-size: 13px; font-weight: 700; cursor: pointer;
        }
        .a-adm-btn-primary:hover { filter: brightness(1.08); }
        .a-adm-btn-secondary {
          background: transparent; color: var(--da-text);
          border: 1px solid var(--da-border);
          padding: 8px 14px; border-radius: 4px;
          font-size: 13px; cursor: pointer;
        }
        .a-adm-btn-secondary:hover { border-color: var(--da-muted); }
        .a-adm-btn-danger {
          background: transparent; color: #ff5555;
          border: 1px solid rgba(255,85,85,0.4);
          padding: 8px 14px; border-radius: 4px;
          font-size: 13px; cursor: pointer;
        }
        .a-adm-btn-danger:hover { background: rgba(255,85,85,0.08); }
        .a-adm-table {
          background: var(--da-darker); border: 1px solid var(--da-border);
          border-radius: 8px; overflow: hidden;
        }
        .a-adm-row {
          display: grid;
          grid-template-columns: 56px 1.6fr 1.5fr 110px 110px 80px 180px;
          align-items: center; gap: 12px;
          padding: 12px 16px;
          border-bottom: 1px solid var(--da-border);
          font-size: 13px; color: var(--da-text);
        }
        .a-adm-row:last-child { border-bottom: none; }
        .a-adm-row--head {
          background: var(--da-dark);
          color: var(--da-muted-soft);
          font-family: var(--da-font-mono);
          font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase;
          font-weight: 700;
        }
        .a-adm-avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; display: block; }
        .a-adm-avatar-fb {
          width: 40px; height: 40px; border-radius: 50%;
          background: var(--da-card); color: var(--da-muted);
          display: flex; align-items: center; justify-content: center;
          font-weight: 600; font-size: 14px;
        }
        .a-adm-name { color: var(--da-text); font-weight: 600; }
        .a-adm-handle { color: var(--da-faint); font-size: 11px; font-family: var(--da-font-mono); }
        .a-adm-email { color: var(--da-muted); font-size: 12px; word-break: break-all; }
        .a-adm-badge {
          display: inline-block; padding: 3px 8px; border-radius: 999px;
          font-size: 10px; font-weight: 700; letter-spacing: 0.06em;
          font-family: var(--da-font-mono); text-transform: uppercase;
        }
        .a-adm-actions { display: flex; gap: 6px; flex-wrap: wrap; }

        .a-adm-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.6);
          z-index: 100;
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
        }
        .a-adm-modal {
          background: var(--da-darker); border: 1px solid var(--da-border);
          border-radius: 8px; max-width: 480px; width: 100%;
          padding: 28px;
        }
        .a-adm-modal h3 {
          color: var(--da-text); font-family: var(--da-font-display);
          font-size: 20px; font-weight: 700; margin-bottom: 6px;
        }
        .a-adm-modal p.lead { color: var(--da-muted); font-size: 13px; margin-bottom: 20px; }
        .a-adm-field { margin-bottom: 16px; }
        .a-adm-field label {
          display: block; color: var(--da-text-strong);
          font-size: 12px; font-weight: 600; margin-bottom: 6px;
        }
        .a-adm-input, .a-adm-select {
          width: 100%; background: var(--da-dark); color: var(--da-text);
          border: 1px solid var(--da-border); border-radius: 4px;
          padding: 10px 12px; font-size: 14px; font-family: inherit;
          box-sizing: border-box;
        }
        .a-adm-error {
          background: rgba(255,85,85,0.08); color: #ff8080;
          border: 1px solid rgba(255,85,85,0.3);
          padding: 10px 12px; border-radius: 4px;
          font-size: 12px; margin-bottom: 16px;
        }
        .a-adm-modal-actions {
          display: flex; gap: 10px; justify-content: flex-end; margin-top: 22px;
        }

        .a-adm-url-box {
          background: var(--da-dark); border: 1px solid var(--da-border);
          border-radius: 4px; padding: 12px;
          font-family: var(--da-font-mono); font-size: 11px;
          color: var(--da-text); word-break: break-all;
          margin-bottom: 12px;
        }

        .a-adm-drawer-backdrop {
          position: fixed; inset: 0; background: rgba(0,0,0,0.6);
          z-index: 100;
        }
        .a-adm-drawer {
          position: fixed; top: 0; right: 0; bottom: 0;
          width: 460px; max-width: 100vw;
          background: var(--da-darker); border-left: 1px solid var(--da-border);
          z-index: 101; padding: 24px;
          overflow-y: auto;
          animation: drawerSlide var(--t-slow) ease;
        }
        @keyframes drawerSlide {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .a-adm-drawer h3 {
          color: var(--da-text); font-family: var(--da-font-display);
          font-size: 18px; margin-bottom: 4px;
        }
        .a-adm-drawer .sub { color: var(--da-muted); font-size: 12px; margin-bottom: 24px; }

        @media (max-width: 900px) {
          .a-adm-row { grid-template-columns: 48px 1fr 90px 70px 1fr; }
          .a-adm-col-email, .a-adm-col-status { display: none; }
        }
      `}</style>

      <div className="a-adm-header">
        <button className="a-adm-btn-primary" onClick={openAddModal}>+ Autor hinzufügen</button>
      </div>

      <div className="a-adm-table">
        <div className="a-adm-row a-adm-row--head" role="row">
          <span aria-hidden />
          <span>Name</span>
          <span className="a-adm-col-email">E-Mail</span>
          <span>Rolle</span>
          <span className="a-adm-col-status">Status</span>
          <span>Artikel</span>
          <span>Aktionen</span>
        </div>
        {authors.map((a) => {
          const isActive = !!a.user_id;
          const rs = roleStyles[a.role];
          return (
            <div className="a-adm-row" key={a.id}>
              {a.avatar_url ? (
                <Image src={a.avatar_url} alt={a.display_name} width={40} height={40} className="a-adm-avatar" unoptimized />
              ) : (
                <div className="a-adm-avatar-fb">{a.display_name.charAt(0).toUpperCase()}</div>
              )}
              <div>
                <div className="a-adm-name">{a.display_name}</div>
                {a.handle && <div className="a-adm-handle">@{a.handle}</div>}
              </div>
              <div className="a-adm-email a-adm-col-email">{a.email}</div>
              <div>
                <span className="a-adm-badge" style={{ background: rs.bg, color: rs.color }}>{rs.label}</span>
              </div>
              <div className="a-adm-col-status">
                <span style={{ color: isActive ? "var(--da-green)" : "var(--da-faint)", fontSize: 12 }}>
                  {isActive ? "● Aktiv" : "○ Placeholder"}
                </span>
              </div>
              <div style={{ color: "var(--da-muted)" }}>{a.article_count}</div>
              <div className="a-adm-actions">
                <button className="a-adm-btn-secondary" onClick={() => setDrawerAuthorId(a.id)}>Bearbeiten</button>
              </div>
            </div>
          );
        })}
      </div>

      {modalMode === "form" && (
        <div className="a-adm-overlay" onClick={closeModal}>
          <div className="a-adm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Autor hinzufügen</h3>
            <p className="lead">Neuen Author anlegen — optional sofort eine Einladung erzeugen.</p>
            {modalError && <div className="a-adm-error">{modalError}</div>}
            <div className="a-adm-field">
              <label>Anzeigename *</label>
              <input
                className="a-adm-input"
                value={modalForm.display_name}
                onChange={(e) => setModalForm({ ...modalForm, display_name: e.target.value })}
                placeholder="Max Mustermann"
                disabled={modalPending}
              />
            </div>
            <div className="a-adm-field">
              <label>E-Mail *</label>
              <input
                className="a-adm-input"
                type="email"
                value={modalForm.email}
                onChange={(e) => setModalForm({ ...modalForm, email: e.target.value })}
                placeholder="max@beispiel.ch"
                disabled={modalPending}
              />
            </div>
            <div className="a-adm-field">
              <label>Rolle *</label>
              <select
                className="a-adm-select"
                value={modalForm.intended_role}
                onChange={(e) => setModalForm({ ...modalForm, intended_role: e.target.value as "author" | "editor" })}
                disabled={modalPending}
              >
                <option value="author">Author</option>
                <option value="editor">Editor</option>
              </select>
            </div>
            <div className="a-adm-modal-actions">
              <button className="a-adm-btn-secondary" onClick={closeModal} disabled={modalPending}>Abbrechen</button>
              <button className="a-adm-btn-secondary" onClick={submitOnlySave} disabled={modalPending}>
                {modalPending ? "Speichert…" : "Nur speichern"}
              </button>
              <button className="a-adm-btn-primary" onClick={submitWithInvite} disabled={modalPending}>
                {modalPending ? "Speichert…" : "Speichern + Einladung"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalMode === "success" && modalSuccess && (
        <div className="a-adm-overlay" onClick={closeModal}>
          <div className="a-adm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Author angelegt</h3>
            <p className="lead">Einladung für <strong>{modalSuccess.email}</strong> wurde erzeugt. Kopiere den Text und sende ihn per Mail/Chat.</p>
            <div className="a-adm-url-box">{inviteUrlFor(modalSuccess.token)}</div>
            <div className="a-adm-modal-actions">
              <button
                className="a-adm-btn-secondary"
                onClick={() => navigator.clipboard.writeText(inviteUrlFor(modalSuccess.token))}
              >
                Nur URL kopieren
              </button>
              <button
                className="a-adm-btn-primary"
                onClick={() => copyInviteMessage(modalSuccess)}
              >
                Text kopieren
              </button>
              <button className="a-adm-btn-secondary" onClick={closeModal}>Schließen</button>
            </div>
          </div>
        </div>
      )}

      {drawerAuthor && (
        <EditAuthorDrawer
          author={drawerAuthor}
          inviterName={inviterName}
          onClose={() => setDrawerAuthorId(null)}
          onSaved={() => { setDrawerAuthorId(null); router.refresh(); }}
          onDeleted={() => { setDrawerAuthorId(null); router.refresh(); }}
        />
      )}
    </>
  );
}

type DrawerProps = {
  author: AuthorWithCount;
  inviterName: string;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
};

function EditAuthorDrawer({ author, inviterName, onClose, onSaved, onDeleted }: DrawerProps) {
  const router = useRouter();
  const social = (author.social_links ?? {}) as Record<string, string | undefined>;
  const [displayName, setDisplayName] = useState(author.display_name);
  const [email, setEmail] = useState(author.email);
  const [handle, setHandle] = useState(author.handle ?? "");
  const [jobTitle, setJobTitle] = useState(author.job_title ?? "");
  const [location, setLocation] = useState(author.location ?? "");
  const [bio, setBio] = useState(author.bio ?? "");
  const [role, setRole] = useState<AuthorRole>(author.role);
  const [linkedin, setLinkedin] = useState(social.linkedin ?? "");
  const [twitter, setTwitter] = useState(social.twitter ?? "");
  const [website, setWebsite] = useState(social.website ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [generatedInviteToken, setGeneratedInviteToken] = useState<string | null>(null);

  function save() {
    setError(null);
    const social_links: Record<string, string> = {};
    if (linkedin.trim()) social_links.linkedin = linkedin.trim();
    if (twitter.trim()) social_links.twitter = twitter.trim();
    if (website.trim()) social_links.website = website.trim();

    const patch: AuthorAdminPatch = {
      display_name: displayName,
      email,
      handle: handle.trim() || null,
      job_title: jobTitle.trim() || null,
      location: location.trim() || null,
      bio: bio.trim() || null,
      role,
      social_links: Object.keys(social_links).length > 0 ? social_links : null,
    };

    startTransition(async () => {
      try {
        await updateAuthorAsEditor(author.id, patch);
        onSaved();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  function remove() {
    if (!confirm(`Author "${author.display_name}" wirklich löschen?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteAuthorAsEditor(author.id);
        onDeleted();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  function generateInvite() {
    setError(null);
    startTransition(async () => {
      try {
        const invite = await generateInviteForExistingPlaceholder(author.id);
        setGeneratedInviteToken(invite.token);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  function copyGeneratedInvite() {
    if (!generatedInviteToken) return;
    const message = buildInviteMessage({
      recipientName: author.display_name,
      inviterName,
      inviteUrl: inviteUrlFor(generatedInviteToken),
      intendedRole: author.role === "editor" ? "editor" : "author",
    });
    navigator.clipboard.writeText(message);
  }

  return (
    <>
      <div className="a-adm-drawer-backdrop" onClick={onClose} />
      <aside className="a-adm-drawer">
        <h3>Author bearbeiten</h3>
        <p className="sub">{author.email}</p>

        {error && <div className="a-adm-error">{error}</div>}

        {!author.user_id && (
          <div style={{ background: "rgba(255,140,66,0.10)", border: "1px solid rgba(255,140,66,0.3)", borderRadius: 4, padding: 12, marginBottom: 20, fontSize: 12, color: "var(--da-orange)" }}>
            Placeholder-Author (noch kein Login). {generatedInviteToken ? (
              <>
                <div style={{ marginTop: 8 }}>Neue Einladung:</div>
                <div className="a-adm-url-box" style={{ marginTop: 6, marginBottom: 6 }}>{inviteUrlFor(generatedInviteToken)}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="a-adm-btn-secondary" onClick={() => navigator.clipboard.writeText(inviteUrlFor(generatedInviteToken))}>Nur URL</button>
                  <button className="a-adm-btn-primary" onClick={copyGeneratedInvite}>Text kopieren</button>
                </div>
              </>
            ) : (
              <button className="a-adm-btn-secondary" onClick={generateInvite} disabled={pending} style={{ marginLeft: 8 }}>
                Einladung generieren
              </button>
            )}
          </div>
        )}

        <AvatarUploadBlock
          authorId={author.id}
          authorName={author.display_name}
          currentAvatarUrl={author.avatar_url ?? ""}
          onUploaded={() => router.refresh()}
        />

        <div className="a-adm-field">
          <label>Anzeigename</label>
          <input className="a-adm-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} disabled={pending} />
        </div>
        <div className="a-adm-field">
          <label>E-Mail</label>
          <input className="a-adm-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={pending} />
        </div>
        <div className="a-adm-field">
          <label>Handle (für /autor/&lt;handle&gt;)</label>
          <input className="a-adm-input" value={handle} onChange={(e) => setHandle(e.target.value)} disabled={pending} />
        </div>
        <div className="a-adm-field">
          <label>Rolle</label>
          <select className="a-adm-select" value={role} onChange={(e) => setRole(e.target.value as AuthorRole)} disabled={pending}>
            <option value="external">External</option>
            <option value="author">Author</option>
            <option value="editor">Editor</option>
          </select>
        </div>
        <div className="a-adm-field">
          <label>Job-Titel</label>
          <input className="a-adm-input" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} disabled={pending} />
        </div>
        <div className="a-adm-field">
          <label>Standort</label>
          <input className="a-adm-input" value={location} onChange={(e) => setLocation(e.target.value)} disabled={pending} />
        </div>
        <div className="a-adm-field">
          <label>Bio</label>
          <textarea
            className="a-adm-input"
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            disabled={pending}
            style={{ resize: "vertical", fontFamily: "inherit" }}
          />
        </div>
        <div className="a-adm-field">
          <label>LinkedIn</label>
          <input className="a-adm-input" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="linkedin.com/in/…" disabled={pending} />
        </div>
        <div className="a-adm-field">
          <label>Twitter / X</label>
          <input className="a-adm-input" value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="x.com/…" disabled={pending} />
        </div>
        <div className="a-adm-field">
          <label>Website</label>
          <input className="a-adm-input" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" disabled={pending} />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 24 }}>
          <button className="a-adm-btn-danger" onClick={remove} disabled={pending}>Löschen</button>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="a-adm-btn-secondary" onClick={onClose} disabled={pending}>Abbrechen</button>
            <button className="a-adm-btn-primary" onClick={save} disabled={pending}>
              {pending ? "Speichert…" : "Speichern"}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
