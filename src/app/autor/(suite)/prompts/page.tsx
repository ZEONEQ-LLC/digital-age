import PageTitle from "@/components/author/PageTitle";
import PromptsManager from "@/components/author/PromptsManager";
import { getCurrentAuthor } from "@/lib/authorApi";
import { getMyPrompts } from "@/lib/promptApi";

export default async function AutorPromptsPage() {
  const [me, prompts] = await Promise.all([
    getCurrentAuthor(),
    getMyPrompts(),
  ]);

  const isEditor = me?.role === "editor";
  const myAuthorId = me?.id ?? null;

  return (
    <>
      <PageTitle
        title="Prompts"
        subtitle="Eigene KI-Prompts verwalten — direkt published, kein Approval nötig."
      />
      <PromptsManager
        initialPrompts={prompts}
        isEditor={isEditor}
        myAuthorId={myAuthorId}
      />
    </>
  );
}
