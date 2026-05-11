import { redirect } from "next/navigation";
import { createDraft } from "@/lib/authorActions";

// Server-Component: erzeugt direkt einen Draft und redirected in den Editor.
// `force-dynamic` weil createDraft eine Mutation ist und nicht statisch
// gerendert werden darf.
export const dynamic = "force-dynamic";

export default async function NewArticlePage() {
  const { id } = await createDraft();
  redirect(`/autor/artikel/${id}`);
}
