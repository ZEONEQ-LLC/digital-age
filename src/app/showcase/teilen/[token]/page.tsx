import type { Metadata } from "next";
import { notFound } from "next/navigation";

import KitView from "@/components/showcase/KitView";
import QuestionnaireShell, { QuestionnaireNotice } from "@/components/showcase/QuestionnaireShell";
import { zurichDate } from "@/lib/showcase/kit";
import { getKitByToken } from "@/lib/showcase/kitApi";

// Showcase S4: Teil-Kit fuer das Unternehmen. Nur ueber den Link aus der Mail
// «Beitrag ist online» (kit_token), ohne Login, nie indexiert, ohne
// Site-Chrome und ohne Tracking (CHROMELESS_PREFIXES, robots.txt).
// Zeigt Bild, Texte, Links, Badge und die Zahlen bis gestern.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Showcase: Teilen-Paket · digital age",
  robots: { index: false, follow: false, nocache: true },
  referrer: "same-origin",
};

type PageProps = { params: Promise<{ token: string }> };

export default async function ShowcaseKitPage({ params }: PageProps) {
  const { token } = await params;
  const kit = await getKitByToken(token);
  if (!kit) notFound();
  const { article, company } = kit;

  if (!article || article.status !== "published" || !article.published_at) {
    return (
      <QuestionnaireShell>
        <QuestionnaireNotice title="Der Beitrag ist noch nicht erschienen">
          Sobald der Beitrag von {company.name} online ist, findet ihr hier das Bild, die Texte und die Links zum Teilen.
        </QuestionnaireNotice>
      </QuestionnaireShell>
    );
  }

  return <KitView kit={kit} article={{ ...article, published_at: article.published_at }} today={zurichDate(new Date())} />;
}
