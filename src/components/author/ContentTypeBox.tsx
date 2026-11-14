"use client";

import { useId, useState, useTransition } from "react";
import AuthorCard from "./AuthorCard";
import MonoCaption from "./MonoCaption";
import { setArticleContentType, type ContentTypeResult } from "@/lib/contentTypeActions";
import { unwrapAction } from "@/lib/actionResult";
import { SHOWCASE_PUBLISHING_ENABLED, contentTypeLabel, type ContentType } from "@/lib/contentType";

// Einordnung eines Artikels (nur Redaktion): redaktionell oder
// Unternehmensbeitrag im Showcase. Wirkt sofort ueber «Einordnung übernehmen»,
// nicht ueber «Speichern»: Der Wechsel verschiebt den Artikel zwischen den
// Listen und setzt die Kategorie.

export type ContentTypeValue = {
  content_type: ContentType;
  startup_id: string | null;
  is_paid: boolean;
};

export type StartupOption = { id: string; name: string; listed: boolean };

type Props = {
  articleId: string;
  articleStatus: string;
  saved: ContentTypeValue;
  startups: StartupOption[];
  editorialCategories: { id: string; name_de: string }[];
  currentCategoryId: string;
  onApplied: (result: ContentTypeResult) => void;
};

export default function ContentTypeBox({
  articleId,
  articleStatus,
  saved,
  startups,
  editorialCategories,
  currentCategoryId,
  onApplied,
}: Props) {
  const [draft, setDraft] = useState<ContentTypeValue>(saved);
  // Rubrik fuer den Wechsel zurueck auf redaktionell.
  const [targetCategory, setTargetCategory] = useState<string>(
    editorialCategories.some((c) => c.id === currentCategoryId) ? currentCategoryId : (editorialCategories[0]?.id ?? ""),
  );
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [pending, startTransition] = useTransition();
  const groupName = useId();
  const startupId = useId();
  const categoryId = useId();

  const savedIsCompany = saved.content_type === "company";
  const isCompany = draft.content_type === "company";
  // S2a: Ein publizierter Artikel stuende als Unternehmensbeitrag ohne
  // Kennzeichnung online. Die Umstellung kommt mit den Showcase-Seiten.
  const companyLocked = !SHOWCASE_PUBLISHING_ENABLED && articleStatus === "published" && !savedIsCompany;

  const dirty =
    draft.content_type !== saved.content_type ||
    (isCompany && (draft.startup_id !== saved.startup_id || draft.is_paid !== saved.is_paid));
  const valid = isCompany ? Boolean(draft.startup_id) : Boolean(targetCategory);
  const savedStartup = startups.find((s) => s.id === saved.startup_id);

  function choose(type: ContentType) {
    setMessage(null);
    setDraft(
      type === "company"
        ? { content_type: "company", startup_id: draft.startup_id ?? saved.startup_id, is_paid: draft.is_paid }
        : { content_type: "editorial", startup_id: null, is_paid: false },
    );
  }

  function apply() {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = unwrapAction(
          await setArticleContentType(articleId, {
            content_type: draft.content_type,
            startup_id: isCompany ? draft.startup_id : null,
            is_paid: isCompany ? draft.is_paid : false,
            category_id: isCompany ? null : targetCategory,
          }),
        );
        onApplied(result);
        setMessage({ text: "Einordnung übernommen", error: false });
      } catch (e) {
        setMessage({ text: e instanceof Error ? e.message : "Das hat nicht geklappt.", error: true });
      }
    });
  }

  return (
    <AuthorCard padding={18}>
      <style>{`
        .ct-box__options { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 4px; }
        @media (max-width: 700px) { .ct-box__options { grid-template-columns: 1fr; } }
        .ct-box__option {
          display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px;
          border: 1px solid var(--da-border); border-radius: 6px; cursor: pointer;
          background: var(--da-darker);
        }
        .ct-box__option--on { border-color: var(--da-green); }
        .ct-box__option--company.ct-box__option--on { border-color: var(--da-orange); }
        .ct-box__option--locked { cursor: not-allowed; opacity: 0.55; }
        .ct-box__option input { margin-top: 3px; }
        .ct-box__title { color: var(--da-text); font-size: 13px; font-weight: 600; display: block; }
        .ct-box__hint { color: var(--da-muted); font-size: 11px; line-height: 1.5; display: block; margin-top: 2px; }
        .ct-box__fields { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 14px; margin-top: 16px; align-items: start; }
        @media (max-width: 700px) {
          .ct-box__fields { grid-template-columns: 1fr; }
          .ct-box__paid { padding-top: 0; }
        }
        .ct-box__label {
          color: var(--da-faint); font-size: 10px; font-weight: 700; font-family: var(--da-font-mono);
          letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 5px; display: block;
        }
        .ct-box__select {
          width: 100%; min-width: 0; background: var(--da-card); border: 1px solid var(--da-border);
          border-radius: 4px; color: var(--da-text); padding: 8px 12px; font-size: 13px; font-family: inherit;
        }
        .ct-box__paid { display: flex; gap: 10px; align-items: flex-start; cursor: pointer; padding-top: 20px; }
        .ct-box__note {
          color: var(--da-muted); font-size: 12px; line-height: 1.55; margin: 16px 0 0;
          padding-left: 12px; border-left: 2px solid var(--da-orange);
        }
        .ct-box__foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 16px; flex-wrap: wrap; }
        .ct-box__state { color: var(--da-muted); font-size: 12px; margin: 0; }
        .ct-box__state strong { color: var(--da-text); font-weight: 600; }
        .ct-box__btn {
          background: var(--da-green); color: var(--da-dark); border: none; border-radius: 4px;
          padding: 8px 16px; font-size: 13px; font-weight: 700; font-family: inherit; cursor: pointer;
        }
        .ct-box__btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .ct-box__msg { font-size: 12px; margin: 10px 0 0; line-height: 1.5; }
      `}</style>

      <MonoCaption>Inhaltstyp</MonoCaption>

      <div className="ct-box__options" role="radiogroup" aria-label="Inhaltstyp">
        <label className={`ct-box__option${!isCompany ? " ct-box__option--on" : ""}`}>
          <input
            type="radio"
            name={groupName}
            checked={!isCompany}
            disabled={pending}
            onChange={() => choose("editorial")}
          />
          <span>
            <span className="ct-box__title">Redaktionell</span>
            <span className="ct-box__hint">Artikel der Redaktion oder von Gastautor:innen, ohne Kennzeichnung.</span>
          </span>
        </label>
        <label
          className={`ct-box__option ct-box__option--company${isCompany ? " ct-box__option--on" : ""}${companyLocked ? " ct-box__option--locked" : ""}`}
        >
          <input
            type="radio"
            name={groupName}
            checked={isCompany}
            disabled={pending || companyLocked}
            onChange={() => choose("company")}
          />
          <span>
            <span className="ct-box__title">Unternehmensbeitrag</span>
            <span className="ct-box__hint">
              {companyLocked
                ? "Publizierte Artikel lassen sich erst umstellen, wenn die Showcase-Seiten live sind."
                : "Ein Unternehmen aus dem Verzeichnis stellt sich vor. Erscheint gekennzeichnet im Showcase."}
            </span>
          </span>
        </label>
      </div>

      {isCompany && (
        <div className="ct-box__fields">
          <div>
            <label className="ct-box__label" htmlFor={startupId}>Unternehmen</label>
            <select
              id={startupId}
              className="ct-box__select"
              value={draft.startup_id ?? ""}
              disabled={pending}
              onChange={(e) => { setMessage(null); setDraft({ ...draft, startup_id: e.target.value || null }); }}
            >
              <option value="">Bitte wählen</option>
              {startups.map((s) => (
                <option key={s.id} value={s.id} disabled={!s.listed}>
                  {s.name}{s.listed ? "" : " (nicht im Verzeichnis)"}
                </option>
              ))}
            </select>
          </div>
          <label className="ct-box__paid">
            <input
              type="checkbox"
              checked={draft.is_paid}
              disabled={pending}
              onChange={(e) => { setMessage(null); setDraft({ ...draft, is_paid: e.target.checked }); }}
              style={{ marginTop: 3 }}
            />
            <span>
              <span className="ct-box__title">Bezahlter Beitrag</span>
              <span className="ct-box__hint">Kennzeichnung «Publireportage» statt «Unternehmensbeitrag».</span>
            </span>
          </label>
        </div>
      )}

      {!isCompany && savedIsCompany && (
        <div className="ct-box__fields">
          <div>
            <label className="ct-box__label" htmlFor={categoryId}>Rubrik nach der Umstellung</label>
            <select
              id={categoryId}
              className="ct-box__select"
              value={targetCategory}
              disabled={pending}
              onChange={(e) => setTargetCategory(e.target.value)}
            >
              {editorialCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name_de}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {isCompany && (
        <p className="ct-box__note">
          Unternehmensbeiträge liegen in der Kategorie «Showcase» und erscheinen weder auf der Startseite noch in
          Rubriken, Tag-Seiten, Autorenprofilen oder im Newsletter-Entwurf. Featured und Hero sind nicht möglich.
          {!SHOWCASE_PUBLISHING_ENABLED && " Publizieren geht erst, wenn die Showcase-Seiten live sind."}
        </p>
      )}

      <div className="ct-box__foot">
        <p className="ct-box__state">
          Gespeichert: <strong>{contentTypeLabel(saved) ?? "Redaktionell"}</strong>
          {savedIsCompany && savedStartup ? ` · ${savedStartup.name}` : ""}
        </p>
        <button type="button" className="ct-box__btn" onClick={apply} disabled={pending || !dirty || !valid}>
          {pending ? "…" : "Einordnung übernehmen"}
        </button>
      </div>

      {message && (
        <p
          className="ct-box__msg"
          role={message.error ? "alert" : "status"}
          style={{ color: message.error ? "var(--da-orange)" : "var(--da-green)" }}
        >
          {message.text}
        </p>
      )}
    </AuthorCard>
  );
}
