import Link from "next/link";
import NewsTicker from "@/components/NewsTicker";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/server";
import OnboardingMagicLink from "./OnboardingMagicLink";

type SearchParams = Promise<{ token?: string }>;

type InviteLookup = {
  id: string;
  email: string;
  display_name: string | null;
  intended_role: "external" | "author" | "editor";
  invited_by_id: string | null;
  invited_by_name: string | null;
  invited_at: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
};

async function lookupInvite(token: string): Promise<InviteLookup | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_invite_by_token", { p_token: token });
  if (error) return null;
  const row = (data as InviteLookup[] | null)?.[0];
  return row ?? null;
}

function isExpired(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}

const sectionStyle: React.CSSProperties = {
  maxWidth: 520, margin: "0 auto", padding: "64px 32px",
};
const cardStyle: React.CSSProperties = {
  background: "var(--da-card)", border: "1px solid var(--da-border)",
  borderRadius: 8, padding: 32,
};
const titleStyle: React.CSSProperties = {
  color: "var(--da-text)", fontFamily: "var(--da-font-display)",
  fontSize: 26, fontWeight: 700, marginBottom: 12,
};
const leadStyle: React.CSSProperties = {
  color: "var(--da-muted)", fontSize: 15, lineHeight: 1.6, marginBottom: 16,
};
const buttonStyle: React.CSSProperties = {
  display: "inline-block", background: "var(--da-green)",
  color: "var(--da-dark)", padding: "12px 22px", borderRadius: 4,
  fontWeight: 700, fontSize: 14, textDecoration: "none", marginTop: 8,
};

export default async function OnboardingPage({ searchParams }: { searchParams: SearchParams }) {
  const { token } = await searchParams;
  const invite = token ? await lookupInvite(token) : null;

  let view: "invalid" | "accepted" | "valid";
  if (!invite) view = "invalid";
  else if (invite.revoked_at || isExpired(invite.expires_at)) view = "invalid";
  else if (invite.accepted_at) view = "accepted";
  else view = "valid";

  return (
    <main style={{ paddingTop: 64, backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <NewsTicker />
      <section style={sectionStyle}>
        {view === "invalid" && (
          <div style={cardStyle}>
            <h1 style={titleStyle}>Einladung nicht gültig</h1>
            <p style={leadStyle}>
              Diese Einladung ist nicht (mehr) gültig. Mögliche Gründe:
            </p>
            <ul style={{ color: "var(--da-muted)", fontSize: 14, lineHeight: 1.7, paddingLeft: 18, marginBottom: 18 }}>
              <li>Der Link ist nicht korrekt</li>
              <li>Die Einladung wurde widerrufen</li>
              <li>Die Einladung ist abgelaufen</li>
            </ul>
            <p style={{ color: "var(--da-muted-soft)", fontSize: 13, marginBottom: 24 }}>
              Wende dich an die Redaktion, falls du glaubst dass das ein Fehler ist.
            </p>
            <Link href="/" style={buttonStyle}>Zur Startseite</Link>
          </div>
        )}

        {view === "accepted" && (
          <div style={cardStyle}>
            <h1 style={titleStyle}>Einladung bereits eingelöst</h1>
            <p style={leadStyle}>
              Diese Einladung wurde schon eingelöst. Du kannst dich direkt anmelden.
            </p>
            <Link href="/login" style={buttonStyle}>Zum Login</Link>
          </div>
        )}

        {view === "valid" && invite && (
          <div style={cardStyle}>
            <p style={{
              color: "var(--da-green)", fontSize: 11, fontWeight: 700,
              letterSpacing: "0.12em", textTransform: "uppercase",
              fontFamily: "var(--da-font-mono)", marginBottom: 12,
            }}>
              Einladung zu digital age
            </p>
            <h1 style={titleStyle}>Hallo {invite.display_name ?? "und herzlich willkommen"}</h1>
            <p style={leadStyle}>
              {invite.invited_by_name
                ? <>Du wurdest von <strong style={{ color: "var(--da-text)" }}>{invite.invited_by_name}</strong> als{" "}
                  <strong style={{ color: "var(--da-text)" }}>{invite.intended_role === "editor" ? "Editor" : "Author"}</strong> eingeladen.</>
                : <>Du wurdest als <strong style={{ color: "var(--da-text)" }}>{invite.intended_role === "editor" ? "Editor" : "Author"}</strong> eingeladen.</>}
            </p>
            <p style={{ color: "var(--da-muted-soft)", fontSize: 13, marginBottom: 20 }}>
              Wir senden dir einen Magic-Link an die unten angezeigte E-Mail.
              Mit dem Klick auf den Link in der Mail bist du angemeldet — kein Passwort nötig.
            </p>
            <OnboardingMagicLink email={invite.email} />
          </div>
        )}
      </section>
      <Footer />
    </main>
  );
}
