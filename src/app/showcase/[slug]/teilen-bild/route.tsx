import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { contentTypeLabel } from "@/lib/contentType";
import { getShowcaseArticleBySlug } from "@/lib/showcaseApi";
import { getBaseUrl } from "@/lib/siteUrl";

// Showcase S4: Teilen-Bild (1200 x 630) fuer Unternehmensbeitraege. Steht als
// og:image auf /showcase/<slug> und als Download im Teil-Kit. Immer mit der
// Kennzeichnung, damit ein geteilter Beitrag auch auf LinkedIn als
// Unternehmensbeitrag erkennbar bleibt (ein eigenes Teilen-Bild des Editors
// gilt hier bewusst nicht).
//
// Schriften: statische TTF in assets/fonts (Satori liest kein WOFF2).
// Logo des Unternehmens nur als PNG oder JPEG (Satori kann kein WebP), sonst
// die Initiale wie im Verzeichnis.

export const revalidate = 600;

const W = 1200;
const H = 630;
const BG = "#1c1c1e";
const TEXT = "#f5f5f7";
const MUTED = "#a1a1aa";
const LINE = "#3a3a3c";
const ORANGE = "#ff8c42";

const fontsDir = join(process.cwd(), "assets/fonts");
const fontsPromise = Promise.all([
  readFile(join(fontsDir, "SpaceGrotesk-Bold.ttf")),
  readFile(join(fontsDir, "Inter-Regular.ttf")),
  readFile(join(fontsDir, "Inter-SemiBold.ttf")),
]);
const siteLogoPromise = readFile(join(process.cwd(), "public/images/digital age Logo green dark bg.png"), "base64");

function imageType(buf: Uint8Array): "png" | "jpeg" | null {
  if (buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  return null;
}

async function companyLogo(url: string | null, baseUrl: string): Promise<string | null> {
  if (!url) return null;
  try {
    let buf: Uint8Array;
    if (url.startsWith("/")) {
      buf = await readFile(join(process.cwd(), "public", decodeURIComponent(url.split("?")[0])));
    } else if (/^https:\/\//.test(url)) {
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) return null;
      const len = Number(res.headers.get("content-length") ?? 0);
      if (len > 1_500_000) return null;
      buf = new Uint8Array(await res.arrayBuffer());
    } else {
      return null;
    }
    const type = imageType(buf);
    if (!type || buf.length > 1_500_000) return null;
    return `data:image/${type};base64,${Buffer.from(buf).toString("base64")}`;
  } catch (err) {
    console.error("[teilen-bild] Logo nicht lesbar:", baseUrl, err instanceof Error ? err.message : err);
    return null;
  }
}

// Titelgroesse nach Laenge, damit auch lange Titel in hoechstens vier Zeilen passen.
function titleSize(title: string): number {
  const n = title.length;
  if (n <= 50) return 64;
  if (n <= 80) return 56;
  if (n <= 110) return 48;
  return 42;
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getShowcaseArticleBySlug(slug);
  if (!article) return new Response("Nicht gefunden", { status: 404 });

  const [[grotesk, interRegular, interSemi], siteLogo] = await Promise.all([fontsPromise, siteLogoPromise]);
  const baseUrl = getBaseUrl();
  const logo = await companyLogo(article.startup.logo_url, baseUrl);
  const label = contentTypeLabel(article) ?? "Unternehmensbeitrag";
  const company = article.startup.name;
  const title = article.title.length > 160 ? `${article.title.slice(0, 157).trimEnd()} …` : article.title;
  const host = baseUrl.replace(/^https?:\/\//, "");

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: "flex", flexDirection: "column", background: BG, padding: "56px 72px", fontFamily: "Inter" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`data:image/png;base64,${siteLogo}`} width={113} height={70} alt="" />
          <div style={{ display: "flex", color: MUTED, fontSize: 22, fontWeight: 600, letterSpacing: 3 }}>SHOWCASE</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "center" }}>
          <div style={{ display: "flex", color: ORANGE, fontSize: 26, fontWeight: 600, marginBottom: 22 }}>
            {`${label} von ${company}`}
          </div>
          <div
            style={{
              display: "flex",
              color: TEXT,
              fontFamily: "Space Grotesk",
              fontWeight: 700,
              fontSize: titleSize(title),
              lineHeight: 1.12,
              letterSpacing: -1,
              maxWidth: 1040,
            }}
          >
            {title}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", borderTop: `2px solid ${LINE}`, paddingTop: 26 }}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} width={56} height={56} alt="" style={{ borderRadius: 8, objectFit: "contain", background: "#ffffff" }} />
          ) : (
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 8,
                border: `2px solid ${LINE}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: TEXT,
                fontFamily: "Space Grotesk",
                fontSize: 28,
              }}
            >
              {company.charAt(0).toUpperCase()}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 18, flexGrow: 1 }}>
            <div style={{ display: "flex", color: TEXT, fontSize: 26, fontWeight: 600 }}>{company}</div>
            {article.startup.city && <div style={{ display: "flex", color: MUTED, fontSize: 20 }}>{article.startup.city}</div>}
          </div>
          <div style={{ display: "flex", color: MUTED, fontSize: 22 }}>{`${host}/showcase`}</div>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: [
        { name: "Space Grotesk", data: grotesk, weight: 700, style: "normal" },
        { name: "Inter", data: interRegular, weight: 400, style: "normal" },
        { name: "Inter", data: interSemi, weight: 600, style: "normal" },
      ],
      headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400" },
    },
  );
}
