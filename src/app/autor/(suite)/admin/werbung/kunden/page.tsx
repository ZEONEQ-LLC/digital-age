import PageTitle from "@/components/author/PageTitle";
import { getAdvertisersWithContacts } from "@/lib/ads/adApi";
import KundenClient from "./KundenClient";
import WerbungSubNav from "@/components/author/WerbungSubNav";

export default async function KundenPage() {
  const advertisers = await getAdvertisersWithContacts();
  return (
    <>
      <PageTitle title="Werbekunden" subtitle="Kunden und Ansprechpartner verwalten." right={<WerbungSubNav />} />
      <KundenClient initialAdvertisers={advertisers} />
    </>
  );
}
