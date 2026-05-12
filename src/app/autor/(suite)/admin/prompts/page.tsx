import PageTitle from "@/components/author/PageTitle";
import { getAllPromptsForAdmin } from "@/lib/promptApi";
import AdminPromptsClient from "./AdminPromptsClient";

export default async function AdminPromptsPage() {
  const prompts = await getAllPromptsForAdmin();
  return (
    <>
      <PageTitle
        title="Prompts verwalten"
        subtitle="Approval-Queue, Featured-Toggle und Editorial-Workflow."
      />
      <AdminPromptsClient initialPrompts={prompts} />
    </>
  );
}
