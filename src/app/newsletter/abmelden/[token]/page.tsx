import { redirect } from "next/navigation";
import Link from "next/link";
import NewsTicker from "@/components/NewsTicker";
import Footer from "@/components/Footer";
import { createServiceClient } from "@/lib/supabase/service";
import UnsubscribeConfirmButton from "./UnsubscribeConfirmButton";

type PageProps = { params: Promise<{ token: string }> };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Maskiert die Email für die Anzeige: behält den ersten Buchstaben des
// Local-Parts und die Domain, ersetzt den Rest durch ***. Beispiel:
// `redaktion@zeoneq.com` → `r***@zeoneq.com`.
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  if (local.length <= 1) return `${local}***@${domain}`;
  return `${local[0]}***@${domain}`;
}

export default async function Page({ params }: PageProps) {
  const { token } = await params;

  if (!UUID_RE.test(token)) {
    redirect("/newsletter/abgemeldet");
  }

  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    redirect("/newsletter/abgemeldet");
  }

  const { data: sub } = await supabase
    .from("newsletter_subscribers")
    .select("email, status")
    .eq("confirmation_token", token)
    .maybeSingle();

  // Bereits abgemeldet → direkt auf Bestätigungsseite, keine Re-Bestätigung.
  if (!sub || sub.status === "unsubscribed") {
    redirect("/newsletter/abgemeldet");
  }

  return (
    <main style={{ paddingTop: "64px", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <NewsTicker />
      <section style={{ maxWidth: "640px", margin: "0 auto", padding: "80px 32px", textAlign: "center" }}>
        <div style={{ fontSize: "64px", marginBottom: "24px" }}>👋</div>
        <h1
          style={{
            color: "var(--da-text)",
            fontSize: "36px",
            fontWeight: 700,
            fontFamily: "Space Grotesk, sans-serif",
            marginBottom: "16px",
          }}
        >
          Vom Newsletter abmelden?
        </h1>
        <p style={{ color: "var(--da-muted)", fontSize: "18px", lineHeight: 1.6, marginBottom: "8px" }}>
          Möchtest du dich wirklich vom digital-age-Newsletter abmelden?
        </p>
        <p
          style={{
            color: "var(--da-muted-soft)",
            fontFamily: "var(--da-font-mono)",
            fontSize: "14px",
            marginBottom: "32px",
          }}
        >
          {maskEmail(sub.email)}
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <UnsubscribeConfirmButton token={token} />
          <Link
            href="/"
            style={{
              backgroundColor: "transparent",
              color: "var(--da-muted)",
              border: "1px solid var(--da-border)",
              padding: "12px 24px",
              borderRadius: "4px",
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            Doch nicht
          </Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}
