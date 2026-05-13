import PageTitle from "@/components/author/PageTitle";
import { getAllStartupsForAdmin } from "@/lib/startupApi";
import AdminStartupsClient from "./AdminStartupsClient";

export default async function AdminStartupsPage() {
  const startups = await getAllStartupsForAdmin();
  return (
    <>
      <PageTitle
        title="Swiss AI Startups verwalten"
        subtitle="Approval-Queue, Spotlight-Toggle und Editorial-Workflow."
      />
      <AdminStartupsClient initialStartups={startups} />
    </>
  );
}
