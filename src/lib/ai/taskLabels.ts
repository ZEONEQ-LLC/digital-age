// Anzeigenamen der KI-Aufgaben (AI-Konfiguration, Modell-Check, Mails).
// Record ueber alle AiTask-Werte: der Compiler meldet fehlende.

import type { AiTask } from "@/lib/ai/types";

export const TASK_LABELS: Record<AiTask, string> = {
  seo_pipeline: "SEO-Pipeline (Master)",
  seo_review: "SEO-Verbesserungsvorschläge",
  news_item_generation: "News-Ticker Item-Generation",
  abstract_generate: "Abstract generieren",
  highlight_suggestions: "Highlight-Vorschläge",
  image_alt: "Bild-ALT-Texte",
  podcast_ingest: "Podcast-Empfehlung per Teilen",
  hero_proposals: "Hero Studio — Vorschläge",
  social_posts: "Hero Studio — Posttexte",
  newsletter_draft: "Newsletter-Entwurf",
  platform_research: "KI-Plattformen prüfen (Websuche)",
  prompt_generation: "Prompts der KI-Redaktion",
};
