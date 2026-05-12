import type { PromptWithAuthor, PromptDifficulty } from "@/lib/promptApi";

export type PromptCardVM = {
  id: string;
  title: string;
  prompt_text: string;
  context: string;
  example_output: string | null;
  category: string;
  category_label: string;
  tested_with: string;
  tested_with_label: string;
  difficulty: PromptDifficulty;
  difficulty_label: string;
  uses_count: number;
  is_featured: boolean;
  author_display: string;
  author_slug: string | null;
  author_avatar: string | null;
  author_is_internal: boolean;
};

export const PROMPT_CATEGORIES: readonly { code: string; label: string }[] = [
  { code: "business",   label: "Business" },
  { code: "kreativ",    label: "Kreativ" },
  { code: "code",       label: "Code" },
  { code: "marketing",  label: "Marketing" },
  { code: "strategie",  label: "Strategie" },
  { code: "lernen",     label: "Lernen" },
  { code: "andere",     label: "Andere" },
];

export const PROMPT_TESTED_WITH: readonly { code: string; label: string }[] = [
  { code: "chatgpt",  label: "ChatGPT" },
  { code: "claude",   label: "Claude" },
  { code: "gemini",   label: "Gemini" },
  { code: "mehrere",  label: "Mehrere" },
];

export const PROMPT_DIFFICULTIES: readonly { code: PromptDifficulty; label: string }[] = [
  { code: "beginner",     label: "Anfänger" },
  { code: "intermediate", label: "Fortgeschritten" },
  { code: "expert",       label: "Expert" },
];

function lookupLabel(list: readonly { code: string; label: string }[], code: string): string {
  return list.find((it) => it.code === code)?.label ?? code;
}

export function promptToCardVM(row: PromptWithAuthor): PromptCardVM {
  const author = row.author;
  return {
    id: row.id,
    title: row.title,
    prompt_text: row.prompt_text,
    context: row.context,
    example_output: row.example_output,
    category: row.category,
    category_label: lookupLabel(PROMPT_CATEGORIES, row.category),
    tested_with: row.tested_with,
    tested_with_label: lookupLabel(PROMPT_TESTED_WITH, row.tested_with),
    difficulty: row.difficulty,
    difficulty_label: lookupLabel(PROMPT_DIFFICULTIES, row.difficulty),
    uses_count: row.uses_count,
    is_featured: row.status === "featured",
    author_display: author?.display_name ?? row.submitter_name ?? "Anonym",
    author_slug: author?.slug ?? null,
    author_avatar: author?.avatar_url ?? null,
    author_is_internal: author !== null,
  };
}
