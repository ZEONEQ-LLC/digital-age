import { Section } from "react-email";
import Layout, { CtaButton, Heading, Paragraph } from "./_layout";

type Props = {
  title: string;
  decision: "approved" | "changes";
  name: string;
  note: string | null;
  when: string;
  editorUrl: string;
};

export const SUBJECT_APPROVED = "Freigabe";
export const SUBJECT_CHANGES = "Änderungswunsch";

function metaRow(label: string, value: string) {
  return (
    <Section style={{ marginBottom: 10 }}>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        <strong className="text-primary" style={{ color: "#1c1c1e", fontWeight: 600 }}>{label}:</strong>{" "}
        <span className="text-primary" style={{ color: "#1c1c1e", whiteSpace: "pre-wrap" }}>{value}</span>
      </p>
    </Section>
  );
}

// Meldung an die Redaktion: Rueckmeldung ueber den Vorschau-Link eines
// Beitrags. Veroeffentlicht wird weiterhin im Editor.
export default function ArticlePreviewResponse({ title, decision, name, note, when, editorUrl }: Props) {
  const approved = decision === "approved";
  return (
    <Layout previewText={approved ? `${name} hat «${title}» freigegeben.` : `${name} wünscht Änderungen an «${title}».`}>
      <Heading>{approved ? "Beitrag freigegeben" : "Änderungen gewünscht"}</Heading>
      <Paragraph muted small>
        {approved
          ? "Die Rückmeldung kam über den Vorschau-Link. Der Beitrag ist noch nicht veröffentlicht: Das machst du im Editor."
          : "Die Rückmeldung kam über den Vorschau-Link. Nach dem Überarbeiten zeigt derselbe Link den neuen Stand."}
      </Paragraph>

      {metaRow("Beitrag", title)}
      {metaRow(approved ? "Freigegeben von" : "Von", name)}
      {metaRow("Zeit", when)}
      {note ? metaRow(approved ? "Bemerkung" : "Änderungswunsch", note) : null}

      <CtaButton href={editorUrl}>{approved ? "Im Editor öffnen und veröffentlichen →" : "Im Editor öffnen →"}</CtaButton>
    </Layout>
  );
}
