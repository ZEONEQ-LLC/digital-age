import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import QuestionnaireShell, { QuestionnaireNotice } from "@/components/showcase/QuestionnaireShell";
import ShowcaseQuestionnaire from "@/components/showcase/ShowcaseQuestionnaire";
import { getInviteByToken } from "@/lib/showcase/inviteApi";
import { formatLongDate, profileFromStartup } from "@/lib/showcase/questionnaire";

// Fragebogen des Showcase (S3a): nur ueber den Token-Link aus der Einladung
// erreichbar, ohne Login, nie indexiert, ohne Site-Chrome und ohne Tracking
// (CHROMELESS_PREFIXES). Service-Client, force-dynamic.
//
// Unbekannter oder zurueckgezogener Link: 404. Abgelaufen oder schon
// abgeschickt: ein Satz dazu, kein Formular.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Showcase: Fragebogen · digital age",
  robots: { index: false, follow: false, nocache: true },
  // Der Token steht in der Adresse: nie als Verweis an fremde Seiten geben.
  referrer: "same-origin",
};

type PageProps = { params: Promise<{ token: string }> };

export default async function ShowcaseQuestionnairePage({ params }: PageProps) {
  const { token } = await params;
  const invite = await getInviteByToken(token);
  if (!invite || invite.state === "withdrawn") notFound();
  const { row, startup, state } = invite;

  if (state === "expired") {
    return (
      <QuestionnaireShell>
        <QuestionnaireNotice title="Dieser Link ist abgelaufen">
          Die Einladung für {startup.name} gilt nicht mehr. Wenn ihr noch mitmachen wollt,{" "}
          <Link href="/kontakt" style={{ color: "var(--da-green)", fontWeight: 600 }}>schreibt uns</Link>, wir schicken einen neuen Link.
        </QuestionnaireNotice>
      </QuestionnaireShell>
    );
  }

  if (state === "submitted") {
    return (
      <QuestionnaireShell>
        <QuestionnaireNotice title="Der Fragebogen ist abgeschickt">
          Danke. Die Angaben von {startup.name} sind am {formatLongDate(row.submitted_at)} bei uns angekommen. Wir melden uns mit dem Entwurf zur Freigabe. Soll noch etwas geändert werden,{" "}
          <Link href="/kontakt" style={{ color: "var(--da-green)", fontWeight: 600 }}>schreibt uns</Link>.
        </QuestionnaireNotice>
      </QuestionnaireShell>
    );
  }

  return (
    <QuestionnaireShell>
      <ShowcaseQuestionnaire
        token={token}
        company={startup.name}
        profile={profileFromStartup(startup)}
        inviteeName={row.invitee_name ?? ""}
        inviteeEmail={row.invitee_email ?? ""}
        replyBy={formatLongDate(row.reply_by)}
      />
    </QuestionnaireShell>
  );
}
