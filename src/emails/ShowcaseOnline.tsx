import Layout, { CtaButton, Heading, Paragraph, UrlFallback } from "./_layout";

// Showcase S3b: «Beitrag ist online» an das Unternehmen, einmal beim ersten
// Publizieren. Mit dem Link zum Teilen (UTM fuer LinkedIn) und den drei
// vorbereiteten LinkedIn-Texten. Das Paket mit Bild und Badge folgt mit S4.

export type ShowcaseOnlineProps = {
  firstName: string;
  company: string;
  title: string;
  // Oeffentliche Adresse des Beitrags.
  url: string;
  // Dieselbe Adresse mit Kennung fuer LinkedIn.
  shareUrl: string;
  profileUrl: string;
  linkedin: string[];
};

export const SHOWCASE_ONLINE_SUBJECT = "Euer Beitrag im Showcase ist online";

const TEXT = "#1c1c1e";
const FONT_BODY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

function PostText({ index, text, shareUrl }: { index: number; text: string; shareUrl: string }) {
  return (
    <div className="card-box" style={{ backgroundColor: "#f4f4f5", borderRadius: 6, padding: "14px 16px", margin: "0 0 12px" }}>
      <p className="text-muted" style={{ color: "#52525b", fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, margin: "0 0 6px" }}>
        Text {index}
      </p>
      <p className="text-primary" style={{ color: TEXT, fontFamily: FONT_BODY, fontSize: 14, lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>
        {text}
        {"\n\n"}
        {shareUrl}
      </p>
    </div>
  );
}

export default function ShowcaseOnline({ firstName, company, title, url, shareUrl, profileUrl, linkedin }: ShowcaseOnlineProps) {
  return (
    <Layout previewText={`«${title}» ist erschienen. Hier sind der Link und die Texte zum Teilen.`}>
      <Heading>Euer Beitrag ist online</Heading>
      <Paragraph>Hallo {firstName}</Paragraph>
      <Paragraph>
        Der Beitrag von {company} ist erschienen: <strong>«{title}»</strong>. Danke fürs Mitmachen.
      </Paragraph>
      <CtaButton href={url}>Beitrag ansehen →</CtaButton>
      <UrlFallback url={url} />
      <Paragraph>
        Er ist mit eurem <a href={profileUrl} className="accent-link" style={{ color: "#16a34a" }}>Profil im Verzeichnis</a> verknüpft und als Unternehmensbeitrag gekennzeichnet.
      </Paragraph>
      {linkedin.length > 0 ? (
        <>
          <Paragraph>
            Am meisten Leserinnen und Leser bekommt der Beitrag, wenn ihr ihn in euren Kanälen teilt. Dafür haben wir {linkedin.length === 1 ? "einen Text" : `${linkedin.length} Texte`} für LinkedIn vorbereitet. Nehmt, was passt, und ändert es nach Belieben. Der Link trägt eine Kennung, damit wir sehen, wie viele Aufrufe aus eurem Netzwerk kommen.
          </Paragraph>
          {linkedin.map((t, i) => (
            <PostText key={i} index={i + 1} text={t} shareUrl={shareUrl} />
          ))}
        </>
      ) : (
        <Paragraph>
          Am meisten Leserinnen und Leser bekommt der Beitrag, wenn ihr ihn in euren Kanälen teilt. Nehmt dafür diesen Link, er trägt eine Kennung, damit wir sehen, wie viele Aufrufe aus eurem Netzwerk kommen: {shareUrl}
        </Paragraph>
      )}
      <Paragraph muted small>
        Nach 30 Tagen melden wir uns mit den Zahlen zum Beitrag. Soll etwas korrigiert werden? Antworte einfach auf diese Mail, sie landet bei der Redaktion.
      </Paragraph>
    </Layout>
  );
}
