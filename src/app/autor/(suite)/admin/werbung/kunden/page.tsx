import PageTitle from "@/components/author/PageTitle";
import { getAdvertisersWithContacts } from "@/lib/ads/adApi";
import KundenClient from "./KundenClient";

export default async function KundenPage() {
  const advertisers = await getAdvertisersWithContacts();
  return (
    <>
      <PageTitle title="Werbekunden" subtitle="Kunden und Ansprechpartner verwalten." />
      <KundenClient initialAdvertisers={advertisers} />
    </>
  );
}
