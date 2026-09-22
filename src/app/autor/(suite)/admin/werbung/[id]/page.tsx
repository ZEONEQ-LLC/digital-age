import { notFound } from "next/navigation";
import PageTitle from "@/components/author/PageTitle";
import { getCampaignDetail, getAdvertisersLight, getPlacements } from "@/lib/ads/adApi";
import CampaignDetailClient from "./CampaignDetailClient";
import WerbungSubNav from "@/components/author/WerbungSubNav";

type PageProps = { params: Promise<{ id: string }> };

export default async function CampaignDetailPage({ params }: PageProps) {
  const { id } = await params;
  const [detail, advertisers, placements] = await Promise.all([
    getCampaignDetail(id),
    getAdvertisersLight(),
    getPlacements(),
  ]);
  if (!detail) notFound();

  return (
    <>
      <PageTitle
        title={detail.campaign.name}
        subtitle={detail.campaign.is_house ? "House-Kampagne" : detail.advertiserName ?? "Kunden-Kampagne"}
        right={<WerbungSubNav />}
      />
      <CampaignDetailClient detail={detail} advertisers={advertisers} placements={placements} />
    </>
  );
}
