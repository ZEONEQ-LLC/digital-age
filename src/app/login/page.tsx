import NewsTicker from "@/components/NewsTicker";
import Footer from "@/components/Footer";
import LoginForm from "@/components/LoginForm";

type SearchParams = Promise<{ error?: string }>;

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const { error } = await searchParams;

  return (
    <main style={{ paddingTop: "64px", backgroundColor: "var(--da-dark)", minHeight: "100vh" }}>
      <NewsTicker />
      <section style={{ maxWidth: "440px", margin: "0 auto", padding: "64px 32px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1
            style={{
              color: "var(--da-text)",
              fontSize: "32px",
              fontWeight: 700,
              fontFamily: "Space Grotesk, sans-serif",
              marginBottom: "8px",
            }}
          >
            Willkommen zurück
          </h1>
          <p style={{ color: "var(--da-muted)", fontSize: "15px" }}>
            Melde dich in deinem Autoren-Account an
          </p>
        </div>
        <LoginForm initialError={error} />
      </section>
      <Footer />
    </main>
  );
}
