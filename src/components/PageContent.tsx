import Link from "next/link";
import ArticleBody from "./ArticleBody";
import BlockReader from "./BlockReader";
import type { BlockDocument } from "@/types/blocks";

// Wiederverwendbarer Renderer für Pages (Über uns, Impressum, …) und für
// den Editor-Vorschau-Tab. Setzt H1 + Lead + Body in derselben 860px-
// Content-Spalte, gleicher horizontalen Position wie der Article-Header.
// Bewusst kein Hero-Bild, keine Author-Bar, keine Share-Buttons, keine
// TOC — Pages tragen das nicht.

type PageContentProps = {
  title: string;
  lead?: string | null;
  doc: BlockDocument;
  // Breadcrumb "Home / <Titel>" oberhalb des H1. Default an, im Editor-
  // Vorschau-Tab abschaltbar.
  showBreadcrumb?: boolean;
};

export default function PageContent({
  title,
  lead,
  doc,
  showBreadcrumb = true,
}: PageContentProps) {
  return (
    <div style={{ maxWidth: "860px", margin: "0 auto", padding: "52px var(--sp-8) var(--sp-12)" }}>
      {showBreadcrumb && (
        <nav
          aria-label="Breadcrumb"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "var(--sp-6)",
          }}
        >
          <Link href="/" style={{ color: "var(--da-muted)", fontSize: "var(--fs-body-sm)" }}>
            Home
          </Link>
          <span style={{ color: "var(--da-faint)", fontSize: "var(--fs-body-sm)" }}>/</span>
          <span
            style={{
              color: "var(--da-green)",
              fontFamily: "var(--da-font-mono)",
              fontSize: "var(--fs-body-sm)",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            {title}
          </span>
        </nav>
      )}

      <h1
        style={{
          color: "var(--da-text)",
          fontFamily: "var(--da-font-display)",
          fontSize: "clamp(30px, 4vw, 48px)",
          fontWeight: 700,
          lineHeight: 1.15,
          letterSpacing: "-0.02em",
          marginBottom: lead ? "var(--sp-6)" : "var(--sp-10)",
        }}
      >
        {title}
      </h1>

      {lead && (
        <p
          style={{
            color: "#c0c0c0",
            fontSize: "20px",
            lineHeight: 1.65,
            marginBottom: "var(--sp-10)",
            fontWeight: 300,
          }}
        >
          {lead}
        </p>
      )}

      <ArticleBody>
        <BlockReader doc={doc} />
      </ArticleBody>
    </div>
  );
}
