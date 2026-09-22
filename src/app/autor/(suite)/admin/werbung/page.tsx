import PageTitle from "@/components/author/PageTitle";
import { getCampaignsOverview, getAdvertisersLight } from "@/lib/ads/adApi";
import WerbungOverviewClient from "./WerbungOverviewClient";
import WerbungSubNav from "@/components/author/WerbungSubNav";

export default async function WerbungOverviewPage() {
  const [campaigns, advertisers] = await Promise.all([
    getCampaignsOverview(),
    getAdvertisersLight(),
  ]);
  return (
    <>
      <PageTitle
        title="Werbung"
        subtitle="Kampagnen, Buchungen und Kreative verwalten."
        right={<WerbungSubNav />}
      />
      <WerbungOverviewClient initialCampaigns={campaigns} advertisers={advertisers} />
    </>
  );
}
