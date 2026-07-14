import Image from "next/image";
import Link from "next/link";

// "Verwandter Artikel"-Karte (Cover + Titel + Teaser). Extrahiert aus dem
// internalArticleCard-Block in BlockReader, damit sie auch ausserhalb des
// Artikel-Bodys wiederverwendet werden kann (z.B. Podcast-Detailseite).
// Praesentationskomponente ohne State — server- wie client-seitig nutzbar.
type Props = {
  slug: string;
  title: string;
  coverUrl?: string | null;
  excerpt?: string | null;
  // Umgebender Abstand; im Artikel-Body "28px 0", auf anderen Seiten anpassbar.
  margin?: string;
};

export default function InternalArticleCard({
  slug,
  title,
  coverUrl,
  excerpt,
  margin = "28px 0",
}: Props) {
  return (
    <Link
      href={`/artikel/${slug}`}
      style={{
        display: "flex",
        gap: 16,
        alignItems: "center",
        background: "var(--da-card)",
        border: "1px solid var(--da-border)",
        borderRadius: 8,
        padding: 16,
        margin,
        textDecoration: "none",
        color: "var(--da-text)",
      }}
    >
      {coverUrl && (
        <div style={{ position: "relative", flex: "0 0 120px", width: 120, height: 80, borderRadius: 4, overflow: "hidden" }}>
          <Image src={coverUrl} alt="" fill sizes="120px" style={{ objectFit: "cover" }} unoptimized />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "var(--da-green)", fontSize: 10, fontFamily: "var(--da-font-mono)", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>
          Verwandter Artikel
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, fontFamily: "var(--da-font-display)", marginBottom: 4 }}>
          {title}
        </div>
        {excerpt && (
          <div style={{ color: "var(--da-muted)", fontSize: 13, lineHeight: 1.5 }}>
            {excerpt}
          </div>
        )}
      </div>
    </Link>
  );
}
