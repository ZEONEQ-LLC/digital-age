"use server";

// Server Actions des Hero Studio: KI-Vorschlaege (hero_proposals), Speichern
// der Vorschlaege am Artikel (cover_proposals, keine Revision) und Posttexte
// (social_posts). callLLM: Session-Pflicht, Rate-Limit 20/h pro Autor (mit
// dem Co-Pilot geteilt), Modell-Override im Admin.

import { callLLM } from "@/lib/ai/client";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/database.types";
import type { AiErrorKind } from "@/lib/ai/types";
import {
  HERO_PROPOSALS_MAX_TOKENS, HERO_PROPOSALS_STORE_MAX_BYTES, SOCIAL_POSTS_MAX_TOKENS,
  buildHeroProposalsPrompt, buildHeroProposalsSystem, buildSocialPostsPrompt, buildSocialPostsSystem,
  finishPost, parseHeroProposals, parseHeroProposalsStore, parseSocialPosts,
  type HeroLang, type HeroProposalsInput, type HeroProposalsPayload, type HeroProposalsStore, type SocialPostsInput,
} from "@/lib/ai/heroPrompts";
import { HERO_OWN_ICONS } from "@/lib/hero-studio/enums";
import lucide from "@/lib/hero-studio/data/lucide-icons.json";

// Gueltige Symbolnamen: Lucide-Daten plus die eigenen Symbole der Engine.
const VALID_ICONS: ReadonlySet<string> = new Set([...Object.keys(lucide.icons), ...HERO_OWN_ICONS]);

// Strategie-Override aus ai_config.task_prompt_overrides (Muster highlightActions).
async function getStrategyOverride(id: "hero_proposals" | "social_posts"): Promise<string | undefined> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("ai_config").select("task_prompt_overrides").eq("id", "global").single();
    if (error || !data) return undefined;
    const raw = (data as { task_prompt_overrides?: unknown }).task_prompt_overrides;
    if (!raw || typeof raw !== "object") return undefined;
    const v = (raw as Record<string, unknown>)[id];
    return typeof v === "string" && v.trim() !== "" ? v : undefined;
  } catch {
    return undefined;
  }
}

export type HeroProposalsResult =
  | { ok: true; proposals: HeroProposalsPayload }
  | { ok: false; error: AiErrorKind };

export async function generateHeroProposals(articleId: string, input: HeroProposalsInput, lang: HeroLang): Promise<HeroProposalsResult> {
  const override = await getStrategyOverride("hero_proposals");
  const result = await callLLM({
    system: buildHeroProposalsSystem(lang, override),
    prompt: buildHeroProposalsPrompt(input),
    maxTokens: HERO_PROPOSALS_MAX_TOKENS,
    task: "hero_proposals",
  });
  if (!result.ok) return { ok: false, error: result.kind };
  const proposals = parseHeroProposals(result.text, VALID_ICONS);
  if (!proposals) {
    console.error(`[hero] JSON-Parse failed for article ${articleId}`);
    return { ok: false, error: "invalid_json" };
  }
  return { ok: true, proposals };
}

export type SaveHeroProposalsResult = { ok: true } | { ok: false; error: string };

// Schreibt cover_proposals ueber den Server-Client (RLS). KEIN saveArticle,
// keine Revision (Spalte steht nicht in der Trigger-Feldliste). Schlaegt RLS
// fehl (Autor bei publiziertem Artikel), bleiben die Vorschlaege im Speicher.
export async function saveHeroProposals(articleId: string, store: HeroProposalsStore): Promise<SaveHeroProposalsResult> {
  const clean = parseHeroProposalsStore(store);
  if (!clean) return { ok: false, error: "Vorschläge unvollständig." };
  const json = JSON.parse(JSON.stringify(clean)) as Json;
  if (new TextEncoder().encode(JSON.stringify(json)).length > HERO_PROPOSALS_STORE_MAX_BYTES) return { ok: false, error: "Vorschläge zu gross (max 64 KB)." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("articles").update({ cover_proposals: json }).eq("id", articleId).select("id");
  if (error) return { ok: false, error: error.message };
  if (!data || !data.length) return { ok: false, error: "Keine Berechtigung, die Vorschläge am Beitrag zu speichern." };
  return { ok: true };
}

export type SocialPostsResult =
  | { ok: true; linkedin: string; instagram: string }
  | { ok: false; error: AiErrorKind };

export async function generateSocialPosts(articleId: string, input: SocialPostsInput, lang: HeroLang, slug: string): Promise<SocialPostsResult> {
  const override = await getStrategyOverride("social_posts");
  const result = await callLLM({
    system: buildSocialPostsSystem(lang, override),
    prompt: buildSocialPostsPrompt(input),
    maxTokens: SOCIAL_POSTS_MAX_TOKENS,
    task: "social_posts",
  });
  if (!result.ok) return { ok: false, error: result.kind };
  const posts = parseSocialPosts(result.text);
  if (!posts) {
    console.error(`[hero] posts JSON-Parse failed for article ${articleId}`);
    return { ok: false, error: "invalid_json" };
  }
  const url = `https://digital-age.ch/artikel/${slug}`;
  return { ok: true, linkedin: finishPost(posts.linkedin, url, posts.hashtags), instagram: finishPost(posts.instagram, url, posts.hashtags) };
}
