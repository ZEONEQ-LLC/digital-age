import PageTitle from "@/components/author/PageTitle";
import { getAllStartupsForAdmin, getFeaturedStartupCount } from "@/lib/startupApi";
import AdminStartupsClient from "./AdminStartupsClient";

export default async function AdminStartupsPage() {
  const [startups, featuredCount] = await Promise.all([
    getAllStartupsForAdmin(),
    getFeaturedStartupCount(),
  ]);
  return (
    <>
      <PageTitle
        title="Swiss AI Startups verwalten"
        subtitle="Approval-Queue, Spotlight-Toggle und Editorial-Workflow."
      />
      <AdminStartupsClient initialStartups={startups} initialFeaturedCount={featuredCount} />
    </>
  );
}
