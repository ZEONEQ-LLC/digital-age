import Link from "next/link";
import NewsTicker from "@/components/NewsTicker";
import Footer from "@/components/Footer";
import type { AiTool, Difficulty, Prompt } from "@/components/PromptCard";
import { getFeaturedPrompts, getPublishedPrompts, type PromptWithAuthor } from "@/lib/promptApi";
import {
  PROMPT_CATEGORIES,
  PROMPT_DIFFICULTIES,
  PROMPT_TESTED_WITH,
} from "@/lib/mappers/promptMappers";
import PromptsBrowser from "./PromptsBrowser";

function lookup(list: readonly { code: string; label: string }[], code: string): string {
  return list.find((it) => it.code === code)?.label ?? code;
}

function toLegacy(row: PromptWithAuthor): Prompt {
  return {
    id: row.id,
    title: row.title,
    body: row.prompt_text,
    category: lookup(PROMPT_CATEGORIES, row.category),
    difficulty: (lookup(PROMPT_DIFFICULTIES, row.difficulty) as Difficulty),
    tool: (lookup(PROMPT_TESTED_WITH, row.tested_with) as AiTool),
    uses: row.uses_count,
    author: row.author?.display_name ?? row.submitter_name ?? "Anonym",
    isTop: row.status === "featured",
  };
}

export default async function AiPromptsPage() {
  const [allRows, featuredRows] = await Promise.all([
    getPublishedPrompts(),
    getFeaturedPrompts(3),
  ]);
  const all = allRows.map(toLegacy);
  const featured = featuredRows.map(toLegacy);

  return (
    <main style={{ paddingTop: "var(--nav-h)", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <NewsTicker />

      <style>{`
        .ap-hero {
          position: relative; overflow: hidden;
          border-bottom: 1px solid var(--da-border);
          padding: 56px var(--sp-8) 48px;
        }
        .ap-hero__grid {
          position: absolute; inset: 0; opacity: 0.05;
          background-image:
            linear-gradient(var(--da-green) 1px, transparent 1px),
            linear-gradient(90deg, var(--da-green) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
        }
        .ap-hero__inner { position: relative; max-width: var(--max-content); margin: 0 auto; }
        .ap-hero__overline {
          color: var(--da-green);
          font-family: var(--da-font-mono);
          font-size: 11px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase;
          margin-bottom: 14px;
        }
        .ap-hero__row {
          display: flex; align-items: flex-end; justify-content: space-between;
          flex-wrap: wrap; gap: var(--sp-6);
        }
        .ap-hero__title {
          color: var(--da-text); font-family: var(--da-font-display);
          font-size: clamp(36px, 5vw, 56px); font-weight: 700;
          line-height: 1.0; letter-spacing: -0.02em;
          margin-bottom: var(--sp-4);
        }
        .ap-hero__title em { font-style: normal; color: var(--da-green); }
        .ap-hero__lead {
          color: var(--da-muted); font-size: 17px; line-height: 1.65; max-width: 560px;
        }
        .ap-hero__cta {
          background: var(--da-green); color: var(--da-dark);
          font-size: 14px; font-weight: 700;
          padding: 13px 26px; border-radius: var(--r-sm);
          text-decoration: none; white-space: nowrap;
        }
        @media (max-width: 720px) {
          .ap-hero { padding: 40px var(--sp-6) 32px; }
        }
      `}</style>

      <section className="ap-hero">
        <div className="ap-hero__grid" aria-hidden />
        <div className="ap-hero__inner">
          <p className="ap-hero__overline">&gt; Tools</p>
          <div className="ap-hero__row">
            <div>
              <h1 className="ap-hero__title">GenAI <em>Prompts</em></h1>
              <p className="ap-hero__lead">
                Getestete Prompts für ChatGPT, Claude und Gemini — kuratiert und von der Community eingereicht.
              </p>
            </div>
            <Link href="/ai-prompts/einreichen" className="ap-hero__cta">+ Prompt einreichen</Link>
          </div>
        </div>
      </section>

      <PromptsBrowser all={all} featured={featured} />

      <div style={{ height: "var(--sp-20)" }} />
      <Footer />
    </main>
  );
}
