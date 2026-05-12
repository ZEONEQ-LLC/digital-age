"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createPrompt,
  updatePrompt,
  deletePrompt,
  type CreatePromptInput,
  type UpdatePromptPatch,
} from "@/lib/promptActions";
import type { PromptWithAuthor, PromptDifficulty } from "@/lib/promptApi";
import {
  PROMPT_CATEGORIES,
  PROMPT_TESTED_WITH,
  PROMPT_DIFFICULTIES,
} from "@/lib/mappers/promptMappers";

type Mode = "list" | "create" | { type: "edit"; id: string };

type Props = {
  initialPrompts: PromptWithAuthor[];
  isEditor: boolean;
  myAuthorId: string | null;
};

const statusStyles: Record<string, { bg: string; color: string; label: string }> = {
  pending:   { bg: "rgba(255,140,66,0.12)", color: "var(--da-orange)",     label: "Pending"   },
  published: { bg: "rgba(50,255,126,0.10)", color: "var(--da-green)",      label: "Published" },
  featured:  { bg: "rgba(255,140,66,0.18)", color: "var(--da-orange)",     label: "Featured"  },
  rejected:  { bg: "rgba(255,85,85,0.10)",  color: "#ff8080",              label: "Rejected"  },
  archived:  { bg: "rgba(85,85,85,0.18)",   color: "var(--da-muted-soft)", label: "Archived"  },
};

export default function PromptsManager({ initialPrompts, isEditor, myAuthorId }: Props) {
  const router = useRouter();
  const prompts = initialPrompts;
  const [mode, setMode] = useState<Mode>("list");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const editing =
    typeof mode === "object" && mode.type === "edit"
      ? prompts.find((p) => p.id === mode.id) ?? null
      : null;

  const canManage = (p: PromptWithAuthor): boolean => {
    if (isEditor) return true;
    return p.author_id === myAuthorId;
  };

  function handleDelete(p: PromptWithAuthor) {
    if (!confirm(`Prompt „${p.title}" wirklich löschen?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deletePrompt(p.id);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  function handleToggleArchive(p: PromptWithAuthor) {
    setError(null);
    const next = p.status === "archived" ? "published" : "archived";
    startTransition(async () => {
      try {
        await updatePrompt(p.id, { status: next });
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  return (
    <>
      <style>{`
        .ap-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
        .ap-toolbar__btn {
          background: var(--da-green); color: var(--da-dark);
          border: none; padding: 11px 18px;
          border-radius: 4px; font-size: 13px; font-weight: 700;
          cursor: pointer; font-family: inherit;
        }
        .ap-error {
          background: rgba(255,85,85,0.08); color: #ff8080;
          border: 1px solid rgba(255,85,85,0.3);
          padding: 10px 12px; border-radius: 4px;
          font-size: 12px; margin-bottom: 16px;
        }
        .ap-empty {
          background: var(--da-card); border: 1px dashed var(--da-border);
          padding: 32px; border-radius: 8px; text-align: center;
          color: var(--da-muted); font-size: 14px;
        }
        .ap-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 120px 100px 100px 70px auto;
          gap: 14px; padding: 14px;
          background: var(--da-card); border: 1px solid var(--da-border);
          border-radius: 8px; align-items: center;
          margin-bottom: 10px;
        }
        .ap-row__title { color: var(--da-text); font-weight: 600; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ap-row__meta { color: var(--da-muted); font-size: 11px; font-family: var(--da-font-mono); }
        .ap-badge {
          display: inline-block; padding: 3px 8px; border-radius: 999px;
          font-size: 10px; font-weight: 700; letter-spacing: 0.06em;
          font-family: var(--da-font-mono); text-transform: uppercase;
        }
        .ap-actions { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
        .ap-btn {
          background: transparent; color: var(--da-text);
          border: 1px solid var(--da-border);
          padding: 6px 10px; border-radius: 4px;
          font-size: 11px; cursor: pointer; font-family: inherit;
        }
        .ap-btn:hover { border-color: var(--da-muted); }
        .ap-btn--danger { color: #ff8080; border-color: rgba(255,85,85,0.4); }
        .ap-btn--danger:hover { background: rgba(255,85,85,0.08); }
        @media (max-width: 900px) {
          .ap-row { grid-template-columns: 1fr; }
          .ap-row > * { width: 100%; }
        }
      `}</style>

      {error && <div className="ap-error">{error}</div>}

      <div className="ap-toolbar">
        <p style={{ color: "var(--da-muted)", fontSize: 13, fontFamily: "var(--da-font-mono)" }}>
          {prompts.length} {prompts.length === 1 ? "Prompt" : "Prompts"}
        </p>
        <button className="ap-toolbar__btn" onClick={() => setMode("create")}>+ Prompt erstellen</button>
      </div>

      {prompts.length === 0 ? (
        <div className="ap-empty">
          Noch keine Prompts. Leg los mit dem ersten!
        </div>
      ) : (
        prompts.map((p) => {
          const ss = statusStyles[p.status] ?? statusStyles.published;
          const cat = PROMPT_CATEGORIES.find((c) => c.code === p.category)?.label ?? p.category;
          const tool = PROMPT_TESTED_WITH.find((c) => c.code === p.tested_with)?.label ?? p.tested_with;
          const own = canManage(p);
          return (
            <div className="ap-row" key={p.id}>
              <div>
                <div className="ap-row__title">{p.title}</div>
                <div className="ap-row__meta">{cat} · {tool}</div>
              </div>
              <span className="ap-badge" style={{ background: ss.bg, color: ss.color }}>{ss.label}</span>
              <span className="ap-row__meta">{p.uses_count} Uses</span>
              <span className="ap-row__meta">{new Date(p.created_at).toLocaleDateString("de-CH")}</span>
              <span />
              <div className="ap-actions">
                {own && (
                  <>
                    <button className="ap-btn" onClick={() => setMode({ type: "edit", id: p.id })} disabled={pending}>
                      Bearbeiten
                    </button>
                    {p.status !== "pending" && p.status !== "rejected" && (
                      <button className="ap-btn" onClick={() => handleToggleArchive(p)} disabled={pending}>
                        {p.status === "archived" ? "Aktivieren" : "Archivieren"}
                      </button>
                    )}
                    <button className="ap-btn ap-btn--danger" onClick={() => handleDelete(p)} disabled={pending}>
                      Löschen
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })
      )}

      {(mode === "create" || editing) && (
        <PromptFormDrawer
          initial={editing}
          onClose={() => setMode("list")}
          onSaved={() => { setMode("list"); router.refresh(); }}
        />
      )}
    </>
  );
}

type DrawerProps = {
  initial: PromptWithAuthor | null;
  onClose: () => void;
  onSaved: () => void;
};

function PromptFormDrawer({ initial, onClose, onSaved }: DrawerProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.prompt_text ?? "");
  const [context, setContext] = useState(initial?.context ?? "");
  const [example, setExample] = useState(initial?.example_output ?? "");
  const [category, setCategory] = useState(initial?.category ?? PROMPT_CATEGORIES[0].code);
  const [tool, setTool] = useState(initial?.tested_with ?? PROMPT_TESTED_WITH[0].code);
  const [difficulty, setDifficulty] = useState<PromptDifficulty>(
    (initial?.difficulty ?? PROMPT_DIFFICULTIES[0].code) as PromptDifficulty,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        if (initial) {
          const patch: UpdatePromptPatch = {
            title,
            prompt_text: body,
            context,
            example_output: example || null,
            category,
            tested_with: tool,
            difficulty,
          };
          await updatePrompt(initial.id, patch);
        } else {
          const input: CreatePromptInput = {
            title,
            prompt_text: body,
            context,
            example_output: example || null,
            category,
            tested_with: tool,
            difficulty,
          };
          await createPrompt(input);
        }
        onSaved();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  return (
    <>
      <style>{`
        .pmd-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 100; }
        .pmd { position: fixed; top: 0; right: 0; bottom: 0;
          width: 540px; max-width: 100vw;
          background: var(--da-darker); border-left: 1px solid var(--da-border);
          z-index: 101; padding: 24px; overflow-y: auto;
          animation: pmdSlide var(--t-slow) ease;
        }
        @keyframes pmdSlide { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .pmd h3 { color: var(--da-text); font-family: var(--da-font-display); font-size: 18px; margin-bottom: 4px; }
        .pmd .sub { color: var(--da-muted); font-size: 12px; margin-bottom: 24px; }
        .pmd-field { margin-bottom: 16px; }
        .pmd-field label { display: block; color: var(--da-text-strong); font-size: 12px; font-weight: 600; margin-bottom: 6px; }
        .pmd-input, .pmd-select, .pmd-textarea {
          width: 100%; background: var(--da-dark); color: var(--da-text);
          border: 1px solid var(--da-border); border-radius: 4px;
          padding: 10px 12px; font-size: 14px; font-family: inherit; box-sizing: border-box;
        }
        .pmd-textarea { resize: vertical; font-family: var(--da-font-mono); font-size: 13px; line-height: 1.5; }
        .pmd-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .pmd-error {
          background: rgba(255,85,85,0.08); color: #ff8080;
          border: 1px solid rgba(255,85,85,0.3);
          padding: 10px 12px; border-radius: 4px;
          font-size: 12px; margin-bottom: 16px;
        }
        .pmd-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 24px; }
        .pmd-btn-primary {
          background: var(--da-green); color: var(--da-dark);
          border: none; padding: 10px 18px; border-radius: 4px;
          font-size: 13px; font-weight: 700; cursor: pointer;
        }
        .pmd-btn-secondary {
          background: transparent; color: var(--da-text);
          border: 1px solid var(--da-border);
          padding: 9px 16px; border-radius: 4px;
          font-size: 13px; cursor: pointer;
        }
      `}</style>
      <div className="pmd-backdrop" onClick={onClose} />
      <aside className="pmd">
        <h3>{initial ? "Prompt bearbeiten" : "Neuer Prompt"}</h3>
        <p className="sub">{initial ? "Änderungen werden sofort live geschaltet." : "Wird direkt als published gespeichert."}</p>

        {error && <div className="pmd-error">{error}</div>}

        <div className="pmd-field">
          <label>Titel (max 80)</label>
          <input className="pmd-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} disabled={pending} />
        </div>
        <div className="pmd-field">
          <label>Prompt-Text (20–4000 Zeichen)</label>
          <textarea className="pmd-textarea" rows={10} value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} disabled={pending} />
        </div>
        <div className="pmd-field">
          <label>Kontext — wann/wofür</label>
          <textarea className="pmd-textarea" rows={3} value={context} onChange={(e) => setContext(e.target.value)} disabled={pending} />
        </div>
        <div className="pmd-field">
          <label>Beispiel-Output (optional)</label>
          <textarea className="pmd-textarea" rows={3} value={example} onChange={(e) => setExample(e.target.value)} disabled={pending} />
        </div>
        <div className="pmd-row2">
          <div className="pmd-field">
            <label>Kategorie</label>
            <select className="pmd-select" value={category} onChange={(e) => setCategory(e.target.value)} disabled={pending}>
              {PROMPT_CATEGORIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </div>
          <div className="pmd-field">
            <label>Getestet mit</label>
            <select className="pmd-select" value={tool} onChange={(e) => setTool(e.target.value)} disabled={pending}>
              {PROMPT_TESTED_WITH.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </div>
        </div>
        <div className="pmd-field">
          <label>Schwierigkeit</label>
          <select className="pmd-select" value={difficulty} onChange={(e) => setDifficulty(e.target.value as PromptDifficulty)} disabled={pending}>
            {PROMPT_DIFFICULTIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
        </div>

        <div className="pmd-actions">
          <button className="pmd-btn-secondary" onClick={onClose} disabled={pending}>Abbrechen</button>
          <button className="pmd-btn-primary" onClick={save} disabled={pending}>
            {pending ? "Speichert…" : initial ? "Speichern" : "Erstellen"}
          </button>
        </div>
      </aside>
    </>
  );
}
