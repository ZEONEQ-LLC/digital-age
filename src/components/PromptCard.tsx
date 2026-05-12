"use client";

import { useState } from "react";
import Link from "next/link";
import { incrementPromptUses } from "@/lib/promptActions";

export type Difficulty = "Anfänger" | "Fortgeschritten" | "Expert";
export type AiTool = "ChatGPT" | "Claude" | "Gemini" | "Mehrere";

export type Prompt = {
  id: string;
  title: string;
  body: string;
  contextSnippet?: string;
  category: string;
  difficulty: Difficulty;
  tool: AiTool;
  uses: number;
  author: string;
  isTop: boolean;
};

export const toolColor = (t: AiTool): string =>
  t === "ChatGPT" ? "var(--da-green)" :
  t === "Claude"  ? "var(--da-orange)" :
  t === "Gemini"  ? "var(--da-purple)" :
                    "var(--da-muted-soft)";

export const diffColor = (d: Difficulty): string =>
  d === "Anfänger"        ? "var(--da-green)" :
  d === "Fortgeschritten" ? "var(--da-orange)" :
                            "var(--da-purple)";

export const catColor = (cat: string): string => {
  const map: Record<string, string> = {
    Business:  "var(--da-green)",
    Kreativ:   "var(--da-orange)",
    Code:      "var(--da-purple)",
    Marketing: "var(--da-green)",
    Strategie: "var(--da-purple)",
    Lernen:    "var(--da-orange)",
    Andere:    "var(--da-muted-soft)",
  };
  return map[cat] ?? "var(--da-green)";
};

type PromptCardProps = {
  prompt: Prompt;
  accent?: string;
};

export default function PromptCard({ prompt, accent = "var(--da-green)" }: PromptCardProps) {
  const [copied, setCopied] = useState(false);
  const cc = catColor(prompt.category);
  const dc = diffColor(prompt.difficulty);
  const tc = toolColor(prompt.tool);

  const onCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard?.writeText(prompt.body).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    // Fire-and-forget: uses_count via SECURITY-DEFINER RPC
    incrementPromptUses(prompt.id).catch(() => {});
  };

  return (
    <>
      <style>{`
        .pcard {
          background: var(--da-card);
          border: 1px solid var(--da-border);
          border-radius: var(--r-lg);
          padding: 22px;
          position: relative;
          display: flex;
          flex-direction: column;
          transition: border-color var(--t-base), transform var(--t-base), box-shadow var(--t-base);
          text-decoration: none;
          color: inherit;
          cursor: pointer;
        }
        .pcard:hover {
          border-color: var(--cc);
          transform: translateY(-2px);
          box-shadow: 0 0 0 1px var(--cc);
        }
        .pcard__context {
          color: var(--da-muted-soft);
          font-family: var(--da-font-mono);
          font-size: 11px; line-height: 1.5;
          margin-bottom: 12px;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
        .pcard__top {
          position: absolute; top: 12px; right: 12px;
          background: var(--accent); color: var(--da-dark);
          font-family: var(--da-font-mono);
          font-size: 9px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
          padding: 3px 8px; border-radius: var(--r-xs);
        }
        .pcard__meta {
          display: flex; align-items: center; gap: var(--sp-2);
          margin-bottom: 10px; flex-wrap: wrap;
        }
        .pcard__cat {
          color: var(--cc);
          font-family: var(--da-font-mono);
          font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
        }
        .pcard__sep { color: var(--da-faint); font-size: 10px; }
        .pcard__diff {
          color: var(--dc);
          font-family: var(--da-font-mono);
          font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
        }
        .pcard__title {
          color: var(--da-text);
          font-family: var(--da-font-display);
          font-size: 16px; font-weight: 700; line-height: 1.35;
          margin-bottom: 12px;
        }
        .pcard__code-wrap { position: relative; flex: 1; margin-bottom: 14px; }
        .pcard__code {
          color: var(--da-text-strong);
          font-family: var(--da-font-mono);
          font-size: 12px; line-height: 1.6;
          background: var(--da-dark);
          border: 1px solid var(--da-border);
          padding: 10px 12px;
          border-radius: var(--r-sm);
          overflow: hidden;
          max-height: 96px;
          white-space: pre-wrap;
          word-break: break-word;
          display: -webkit-box;
          -webkit-line-clamp: 4;
          -webkit-box-orient: vertical;
        }
        .pcard__copy {
          position: absolute; top: 6px; right: 6px;
          background: var(--da-card);
          color: var(--da-muted);
          border: 1px solid var(--da-border);
          border-radius: var(--r-xs);
          padding: 3px 8px;
          font-size: 10px; font-weight: 700;
          font-family: var(--da-font-mono);
          letter-spacing: 0.08em; text-transform: uppercase;
          cursor: pointer;
          transition: background var(--t-fast), color var(--t-fast), border-color var(--t-fast);
        }
        .pcard__copy:hover {
          background: var(--da-border);
          color: var(--da-text);
        }
        .pcard__copy--ok {
          background: var(--accent) !important;
          color: var(--da-dark) !important;
          border-color: var(--accent) !important;
        }
        .pcard__foot {
          display: flex; justify-content: space-between; align-items: center;
          padding-top: 10px;
          border-top: 1px solid var(--da-border);
          gap: var(--sp-3);
          flex-wrap: wrap;
        }
        .pcard__tool {
          color: var(--tc);
          font-size: 12px; font-weight: 700;
        }
        .pcard__foot-right { display: flex; gap: 12px; align-items: center; }
        .pcard__uses {
          color: var(--da-faint);
          font-family: var(--da-font-mono);
          font-size: 11px;
        }
        .pcard__author { color: var(--da-muted); font-size: 11px; }
      `}</style>
      <Link
        href={`/ai-prompts/${prompt.id}`}
        className="pcard"
        style={{
          ["--cc" as string]: cc,
          ["--dc" as string]: dc,
          ["--tc" as string]: tc,
          ["--accent" as string]: accent,
        }}
      >
        {prompt.isTop && <span className="pcard__top">Top</span>}
        <div className="pcard__meta">
          <span className="pcard__cat">{prompt.category}</span>
          <span className="pcard__sep">·</span>
          <span className="pcard__diff">{prompt.difficulty}</span>
        </div>
        <h3 className="pcard__title">{prompt.title}</h3>
        {prompt.contextSnippet && (
          <p className="pcard__context">{prompt.contextSnippet}</p>
        )}
        <div className="pcard__code-wrap">
          <pre className="pcard__code">{prompt.body}</pre>
          <button
            type="button"
            className={`pcard__copy${copied ? " pcard__copy--ok" : ""}`}
            onClick={onCopy}
            aria-label={copied ? "Kopiert" : "Prompt kopieren"}
          >
            {copied ? "✓ Copied" : "Copy"}
          </button>
        </div>
        <div className="pcard__foot">
          <span className="pcard__tool">✦ {prompt.tool}</span>
          <div className="pcard__foot-right">
            <span className="pcard__uses">{prompt.uses} uses</span>
            <span className="pcard__sep">·</span>
            <span className="pcard__author">{prompt.author}</span>
          </div>
        </div>
      </Link>
    </>
  );
}
