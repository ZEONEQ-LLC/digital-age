import Link from "next/link";

import Footer from "@/components/Footer";
import HubHero from "@/components/HubHero";
import type { Prompt } from "@/components/PromptCard";
import type { AiTool, Difficulty } from "@/components/promptColors";
import { getFeaturedPrompts, getPublishedPrompts, type PublicPromptWithAuthor } from "@/lib/promptApi";
import {
  PROMPT_CATEGORIES,
  PROMPT_DIFFICULTIES,
  PROMPT_TESTED_WITH,
} from "@/lib/mappers/promptMappers";
import PromptsBrowser from "./PromptsBrowser";
import { buildListingMetadata } from "@/lib/listingMetadata";

export const revalidate = 300;

export const metadata = buildListingMetadata({
  path: "/ai-prompts",
  title: "AI Prompts — Vorlagen für ChatGPT, Claude und Gemini",
  description:
    "Geprüfte AI-Prompts für Schweizer Profis: von Marketing-Briefs bis Engineering-Tasks. Mit Kontext, Beispiel-Output und Schwierigkeitsstufe zum Kopieren.",
});

function lookup(list: readonly { code: string; label: string }[], code: string): string {
  return list.find((it) => it.code === code)?.label ?? code;
}

function snippet(text: string, max = 120): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}

function toLegacy(row: PublicPromptWithAuthor): Prompt {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    body: row.prompt_text,
    contextSnippet: snippet(row.context),
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
      


      <HubHero
        title="GenAI Prompts"
        claim="Getestete Prompts für ChatGPT, Claude und Gemini"
        action={<Link href="/ai-prompts/einreichen" className="hh-btn hh-btn--accent">+ Prompt einreichen</Link>}
      />

      <PromptsBrowser all={all} featured={featured} />

      <div style={{ height: "var(--sp-20)" }} />
      <Footer />
    </main>
  );
}
