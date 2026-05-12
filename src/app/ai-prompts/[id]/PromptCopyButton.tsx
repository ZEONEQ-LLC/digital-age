"use client";

import { useState } from "react";
import { incrementPromptUses } from "@/lib/promptActions";

type Props = {
  id: string;
  body: string;
};

export default function PromptCopyButton({ id, body }: Props) {
  const [copied, setCopied] = useState(false);

  function onClick() {
    navigator.clipboard?.writeText(body).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    incrementPromptUses(id).catch(() => {});
  }

  return (
    <>
      <style>{`
        .pd-copy {
          background: var(--da-card);
          color: var(--da-muted);
          border: 1px solid var(--da-border);
          border-radius: var(--r-sm);
          padding: 6px 12px;
          font-size: 11px; font-weight: 700;
          font-family: var(--da-font-mono);
          letter-spacing: 0.08em; text-transform: uppercase;
          cursor: pointer;
          transition: background var(--t-fast), color var(--t-fast), border-color var(--t-fast);
        }
        .pd-copy:hover { background: var(--da-border); color: var(--da-text); }
        .pd-copy--ok { background: var(--da-green); color: var(--da-dark); border-color: var(--da-green); }
      `}</style>
      <button
        type="button"
        className={`pd-copy${copied ? " pd-copy--ok" : ""}`}
        onClick={onClick}
        aria-label={copied ? "Kopiert" : "Prompt kopieren"}
      >
        {copied ? "✓ Copied" : "Copy"}
      </button>
    </>
  );
}
