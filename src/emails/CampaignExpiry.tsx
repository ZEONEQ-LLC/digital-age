import Layout, { CtaButton, Heading, Paragraph, UrlFallback } from "./_layout";

// Ablaufwarnung an den Werbekunden (J7): 7 Tage vor Buchungsende, Sie-Form.
type Props = {
  campaignName: string;
  endDate: string;                                    // dd.MM.yyyy (letztes Enddatum)
  bookings: { placementLabel: string; endDate: string }[];
  previewUrl: string;
};

export function subjectFor(campaignName: string, endDate: string): string {
  return `Ihre Kampagne «${campaignName}» endet am ${endDate}`;
}

export default function CampaignExpiry({ campaignName, endDate, bookings, previewUrl }: Props) {
  const multiple = bookings.length > 1;
  return (
    <Layout previewText={`Ihre Kampagne «${campaignName}» endet am ${endDate}`}>
      <Heading>Ihre Kampagne endet bald.</Heading>
      <Paragraph>Guten Tag</Paragraph>
      {multiple ? (
        <>
          <Paragraph>
            Die Buchungen Ihrer Kampagne <strong>«{campaignName}»</strong> auf digital-age.ch laufen in den nächsten Tagen aus:
          </Paragraph>
          {bookings.map((b, i) => (
            <Paragraph key={i}>
              {b.placementLabel} — Ende {b.endDate}
            </Paragraph>
          ))}
        </>
      ) : (
        <Paragraph>
          Ihre Kampagne <strong>«{campaignName}»</strong> auf digital-age.ch endet am <strong>{endDate}</strong>
          {bookings[0] ? ` (${bookings[0].placementLabel})` : ""}.
        </Paragraph>
      )}
      <Paragraph>
        Möchten Sie verlängern oder anpassen? Antworten Sie einfach auf diese E-Mail.
      </Paragraph>
      <CtaButton href={previewUrl}>Zahlen und Motive ansehen →</CtaButton>
      <UrlFallback url={previewUrl} />
      <Paragraph muted small>
        Diese Nachricht wurde automatisch erstellt, weil eine Buchung in sieben Tagen endet.
      </Paragraph>
    </Layout>
  );
}
