import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import NewsTicker from "@/components/NewsTicker";
import Footer from "@/components/Footer";
import { catColor, diffColor, toolColor, type AiTool, type Difficulty } from "@/components/promptColors";
import { getPromptById } from "@/lib/promptApi";
import {
  PROMPT_CATEGORIES,
  PROMPT_DIFFICULTIES,
  PROMPT_TESTED_WITH,
} from "@/lib/mappers/promptMappers";
import PromptCopyButton from "./PromptCopyButton";

type Params = Promise<{ id: string }>;

function lookup(list: readonly { code: string; label: string }[], code: string): string {
  return list.find((it) => it.code === code)?.label ?? code;
}

function visiblePrompt(id: string) {
  return getPromptById(id).then((row) => {
    if (!row) return null;
    if (row.status !== "published" && row.status !== "featured") return null;
    return row;
  });
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const row = await visiblePrompt(id);
  if (!row) return { title: "Prompt nicht gefunden — digital-age.ch" };
  return {
    title: `${row.title} — digital-age.ch`,
    description: row.context.slice(0, 160),
  };
}

export default async function PromptDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const row = await visiblePrompt(id);
  if (!row) notFound();

  const cat = lookup(PROMPT_CATEGORIES, row.category);
  const tool = lookup(PROMPT_TESTED_WITH, row.tested_with) as AiTool;
  const diff = lookup(PROMPT_DIFFICULTIES, row.difficulty) as Difficulty;
  const cc = catColor(cat);
  const dc = diffColor(diff);
  const tc = toolColor(tool);
  const isFeatured = row.status === "featured";
  const author = row.author;
  const submitterName = !author ? (row.submitter_name ?? "Anonym") : null;
  const submitterUrl = !author ? row.submitter_url : null;

  return (
    <main style={{ paddingTop: "var(--nav-h)", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <NewsTicker />

      <style>{`
        .pd-shell { max-width: 820px; margin: 0 auto; padding: 56px var(--sp-8) 96px; }
        .pd-crumb {
          color: var(--da-muted-soft);
          font-family: var(--da-font-mono);
          font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase;
          text-decoration: none;
          margin-bottom: 28px; display: inline-block;
        }
        .pd-crumb:hover { color: var(--da-green); }
        .pd-meta {
          display: flex; align-items: center; gap: var(--sp-2);
          margin-bottom: 14px; flex-wrap: wrap;
        }
        .pd-cat {
          color: var(--cc);
          font-family: var(--da-font-mono);
          font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
        }
        .pd-sep { color: var(--da-faint); font-size: 11px; }
        .pd-diff {
          color: var(--dc);
          font-family: var(--da-font-mono);
          font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
        }
        .pd-feat {
          background: var(--da-green); color: var(--da-dark);
          font-family: var(--da-font-mono);
          font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
          padding: 3px 8px; border-radius: var(--r-xs);
        }
        .pd-title {
          color: var(--da-text);
          font-family: var(--da-font-display);
          font-size: clamp(28px, 4vw, 40px); font-weight: 700;
          line-height: 1.15; letter-spacing: -0.01em;
          margin-bottom: 32px;
        }
        .pd-block { margin-bottom: 32px; }
        .pd-block__label {
          color: var(--da-faint);
          font-family: var(--da-font-mono);
          font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
          margin-bottom: 10px;
        }
        .pd-block__prose {
          color: var(--da-text);
          font-size: 16px; line-height: 1.7;
          white-space: pre-wrap;
        }
        .pd-code-wrap { position: relative; }
        .pd-code-head {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 10px;
        }
        .pd-code {
          color: var(--da-text-strong);
          font-family: var(--da-font-mono);
          font-size: 13px; line-height: 1.65;
          background: var(--da-card);
          border: 1px solid var(--da-border);
          padding: 18px 20px;
          border-radius: var(--r-lg);
          white-space: pre-wrap;
          word-break: break-word;
          overflow-x: auto;
        }
        .pd-example {
          color: var(--da-muted);
          font-family: var(--da-font-mono);
          font-size: 12px; line-height: 1.65;
          background: var(--da-darker);
          border: 1px solid var(--da-border);
          padding: 16px 18px;
          border-radius: var(--r-sm);
          white-space: pre-wrap;
          word-break: break-word;
        }
        .pd-foot {
          margin-top: 40px; padding-top: 20px;
          border-top: 1px solid var(--da-border);
          display: flex; align-items: center; justify-content: space-between;
          gap: var(--sp-3); flex-wrap: wrap;
        }
        .pd-foot__tool {
          color: var(--tc); font-size: 13px; font-weight: 700;
        }
        .pd-foot__right { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
        .pd-foot__uses {
          color: var(--da-faint);
          font-family: var(--da-font-mono);
          font-size: 12px;
        }
        .pd-foot__author { color: var(--da-text-strong); font-size: 13px; }
        .pd-foot__author a { color: var(--da-green); text-decoration: none; }
        .pd-foot__author a:hover { text-decoration: underline; }
        .pd-back {
          margin-top: 48px; display: inline-block;
          color: var(--da-muted-soft);
          font-family: var(--da-font-mono);
          font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
          text-decoration: none;
        }
        .pd-back:hover { color: var(--da-green); }
      `}</style>

      <section
        className="pd-shell"
        style={{
          ["--cc" as string]: cc,
          ["--dc" as string]: dc,
          ["--tc" as string]: tc,
        }}
      >
        <Link href="/ai-prompts" className="pd-crumb">← Alle Prompts</Link>

        <div className="pd-meta">
          <span className="pd-cat">{cat}</span>
          <span className="pd-sep">·</span>
          <span className="pd-diff">{diff}</span>
          {isFeatured && (
            <>
              <span className="pd-sep">·</span>
              <span className="pd-feat">Top</span>
            </>
          )}
        </div>

        <h1 className="pd-title">{row.title}</h1>

        <div className="pd-block">
          <p className="pd-block__label">Kontext & Anwendung</p>
          <p className="pd-block__prose">{row.context}</p>
        </div>

        <div className="pd-block pd-code-wrap">
          <div className="pd-code-head">
            <p className="pd-block__label" style={{ marginBottom: 0 }}>Prompt-Text</p>
            <PromptCopyButton id={row.id} body={row.prompt_text} />
          </div>
          <pre className="pd-code">{row.prompt_text}</pre>
        </div>

        {row.example_output && (
          <div className="pd-block">
            <p className="pd-block__label">Beispiel-Output</p>
            <pre className="pd-example">{row.example_output}</pre>
          </div>
        )}

        <div className="pd-foot">
          <span className="pd-foot__tool">✦ {tool}</span>
          <div className="pd-foot__right">
            <span className="pd-foot__uses">{row.uses_count} uses</span>
            <span className="pd-sep">·</span>
            <span className="pd-foot__author">
              {author ? (
                <Link href={`/autor/${author.slug}`}>{author.display_name}</Link>
              ) : submitterUrl ? (
                <a href={submitterUrl} target="_blank" rel="noreferrer" style={{ color: "var(--da-green)", textDecoration: "none" }}>
                  {submitterName}
                </a>
              ) : (
                submitterName
              )}
            </span>
          </div>
        </div>

        <Link href="/ai-prompts" className="pd-back">← Zurück zu allen Prompts</Link>
      </section>

      <Footer />
    </main>
  );
}
