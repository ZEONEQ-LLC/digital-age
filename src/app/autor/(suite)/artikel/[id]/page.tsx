import { notFound } from "next/navigation";
import MobileEditorWarning from "@/components/author/MobileEditorWarning";
import EditorClient from "@/components/author/EditorClient";
import { createClient } from "@/lib/supabase/server";
import {
  getArticleById,
  getCurrentAuthor,
  getRevisions,
} from "@/lib/authorApi";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditorPage({ params }: PageProps) {
  const { id } = await params;

  const [article, revisions, me] = await Promise.all([
    getArticleById(id),
    getRevisions(id),
    getCurrentAuthor(),
  ]);

  if (!article) notFound();

  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, slug, name_de")
    .order("display_order");

  const isEditor = me?.role === "editor";

  // Editor sieht Author-Dropdown → Liste mitgeben. Authors brauchen sie nicht.
  let allAuthors: { id: string; display_name: string; role: string }[] = [];
  if (isEditor) {
    const { data } = await supabase
      .from("authors")
      .select("id, display_name, role")
      .order("display_name");
    allAuthors = data ?? [];
  }

  return (
    <>
      <MobileEditorWarning />
      <div className="a-editor-root">
        <EditorClient
          article={article}
          revisions={revisions}
          categories={categories ?? []}
          isEditor={isEditor}
          allAuthors={allAuthors}
        />
      </div>
    </>
  );
}
