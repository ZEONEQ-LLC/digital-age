"use client";

// Posttexte (Stufe E): Sprachwahl, «Posttexte schreiben», editierbare Texte
// fuer LinkedIn und Instagram. Nicht gespeichert, nur Anzeige und ZIP.

import { useId, useState } from "react";
import { generateSocialPosts } from "@/lib/ai/heroActions";
import type { AiErrorKind } from "@/lib/ai/types";
import type { HeroArticleInput, HeroTakeResult } from "@/lib/hero-studio/types";
import { copyText } from "./HeroTake";

export function aiErrorText(kind: AiErrorKind, what: string): string {
  if (kind === "rate_limit") return "AI-Limit erreicht (20 Aufrufe pro Stunde, mit dem Co-Pilot geteilt). Bitte später erneut versuchen.";
  if (kind === "timeout") return "Zeitüberschreitung. Nochmals versuchen.";
  if (kind === "auth" || kind === "config") return "KI-Service nicht verfügbar.";
  if (kind === "invalid_json") return "Die Antwort war nicht lesbar. Nochmals versuchen.";
  return `${what} konnten nicht erstellt werden. Nochmals versuchen.`;
}

type Props = {
  article: HeroArticleInput;
  take: HeroTakeResult;
  onPosts: (posts: HeroTakeResult["posts"]) => void;
};

export default function HeroPosts({ article, take, onPosts }: Props) {
  const langId = useId();
  const liId = useId();
  const igId = useId();
  const [langSel, setLangSel] = useState<string>(take.posts?.langSel ?? "auto");
  const [running, setRunning] = useState(false);
  const [note, setNote] = useState<{ msg: string; tone?: "busy" | "warn" | "ok" }>({
    msg: take.posts ? "Texte prüfen und bei Bedarf anpassen, Änderungen kommen mit ins Paket." : "Claude schreibt aus dem Beitrag je einen Post für LinkedIn und Instagram. Sie landen auch im Paket.",
  });
  const url = `https://digital-age.ch/artikel/${article.slug}`;

  async function write() {
    if (running) return;
    if (!article.headline.trim()) { setNote({ msg: "Zuerst im Beitrag eine Headline eingeben.", tone: "warn" }); return; }
    const lang = langSel === "de" || langSel === "en" ? langSel : article.lang;
    setRunning(true);
    setNote({ msg: "Claude schreibt die Posts. Das dauert meist 10 bis 30 Sekunden.", tone: "busy" });
    try {
      const res = await generateSocialPosts(article.articleId, {
        headline: article.headline, rubrik: article.rubrik, author: article.author, figure: take.spec.figure ?? "",
        keyword: take.spec.text || article.keyword, lead: article.lead, body: article.body,
      }, lang, article.slug);
      if (!res.ok) { setNote({ msg: aiErrorText(res.error, "Posts"), tone: "warn" }); return; }
      onPosts({ li: res.linkedin, ig: res.instagram, langSel });
      setNote({ msg: `Texte prüfen und bei Bedarf anpassen, Änderungen kommen mit ins Paket. Der Link zeigt auf ${url}.`, tone: "ok" });
    } catch (err) {
      console.error(err);
      setNote({ msg: "Posts konnten nicht erstellt werden. Nochmals versuchen.", tone: "warn" });
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <div className="hs-step-head" style={{ marginTop: 8 }}>
        <span className="hs-sub-h">Posttexte</span>
        <span className="hs-post-ctl">
          <select id={langId} value={langSel} aria-label="Sprache der Posttexte" onChange={(e) => setLangSel(e.target.value)} disabled={running}>
            <option value="auto">Sprache wie Headline</option>
            <option value="de">Deutsch</option>
            <option value="en">Englisch</option>
          </select>
          <button type="button" className="hs-btn small line" onClick={write} disabled={running}>
            {running ? "Schreibt …" : take.posts ? "Neu schreiben" : "Posttexte schreiben"}
          </button>
        </span>
      </div>
      <p className="hs-hint" data-tone={note.tone} role="status">{note.msg}</p>
      {take.posts && (
        <div className="hs-posts">
          <div className="hs-step-head">
            <label className="hs-sub-h" htmlFor={liId}>LinkedIn</label>
            <button type="button" className="hs-btn small ghost" onClick={(ev) => copyText(take.posts?.li ?? "", ev.currentTarget)}>Kopieren</button>
          </div>
          <textarea id={liId} rows={7} value={take.posts.li} onChange={(e) => onPosts({ ...(take.posts as NonNullable<HeroTakeResult["posts"]>), li: e.target.value })} />
          <div className="hs-step-head">
            <label className="hs-sub-h" htmlFor={igId}>Instagram</label>
            <button type="button" className="hs-btn small ghost" onClick={(ev) => copyText(take.posts?.ig ?? "", ev.currentTarget)}>Kopieren</button>
          </div>
          <textarea id={igId} rows={5} value={take.posts.ig} onChange={(e) => onPosts({ ...(take.posts as NonNullable<HeroTakeResult["posts"]>), ig: e.target.value })} />
        </div>
      )}
    </>
  );
}
