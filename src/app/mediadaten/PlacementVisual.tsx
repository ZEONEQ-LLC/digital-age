import Image from "next/image";
import { PLACEMENTS, type PlacementCode } from "@/lib/ads/placements";
import {
  MEDIA_EXAMPLES, RAIL_MIN_WIDTH, RETINA, exampleSize, type MediaExampleKey,
} from "@/lib/ads/mediaKit";

// Schema-Skizzen fuer /mediadaten (reines CSS, dekorativ). Styles liegen in
// page.tsx (md-*). Neutrale Klassennamen, keine Werbe-Begriffe.

// Rahmen im Stil von ModuleCard (kind image): Kicker "Anzeige" ueber dem Motiv.
// "mini" fuer die verkleinerten Skizzen, "mark" = gruen umrandet.
export function MdFrame({
  example, mini = false, mark = false, width, alt = "", priority = false,
}: {
  example: MediaExampleKey;
  mini?: boolean;
  mark?: boolean;
  width?: number | string;
  alt?: string;
  priority?: boolean;
}) {
  const ex = MEDIA_EXAMPLES[example];
  const s = exampleSize(example);
  const cls = `md-frame${mini ? " md-frame--mini" : ""}${mark ? " md-frame--mark" : ""}`;
  return (
    <div className={cls} style={width !== undefined ? { width } : undefined}>
      <span className="md-frame__kicker">Anzeige</span>
      <Image
        className="md-frame__img"
        src={ex.src}
        alt={alt}
        width={s.w * RETINA}
        height={s.h * RETINA}
        unoptimized
        priority={priority}
      />
    </div>
  );
}

type LineTone = "strong" | "green" | "green-soft" | "orange";

function Line({ w, h, tone }: { w: string | number; h?: number; tone?: LineTone }) {
  return <span className={`md-sk-line${tone ? ` md-sk-line--${tone}` : ""}`} style={{ width: w, height: h }} />;
}

function Browser({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`md-sk-browser ${className}`}>
      <div className="md-sk-browser__bar">
        <span className="md-sk-logo" />
        <span className="md-sk-nav" />
        <span className="md-sk-nav" />
        <span className="md-sk-nav" />
      </div>
      <div className="md-sk-browser__body">{children}</div>
    </div>
  );
}

function Phone({ children }: { children: React.ReactNode }) {
  return (
    <div className="md-sk-phone">
      <div className="md-sk-phone__bar">
        <span className="md-sk-logo md-sk-logo--sm" />
        <span className="md-sk-burger" />
      </div>
      <div className="md-sk-phone__body">{children}</div>
    </div>
  );
}

function TeaserCard({ imgH = 70 }: { imgH?: number }) {
  return (
    <div className="md-sk-teaser">
      <div className="md-sk-teaser__img" style={{ height: imgH }} />
      <div className="md-sk-teaser__text"><Line w="90%" tone="strong" /><Line w="60%" tone="strong" /></div>
    </div>
  );
}

function ListRow({ small = false }: { small?: boolean }) {
  return (
    <div className={`md-sk-row${small ? " md-sk-row--sm" : ""}`}>
      <div className="md-sk-row__img" />
      <div className="md-sk-row__text">
        {!small && <Line w="40%" h={4} tone="green-soft" />}
        <Line w="92%" tone="strong" />
        <Line w={small ? "65%" : "45%"} />
      </div>
    </div>
  );
}

function CatRow({ w }: { w: number }) {
  return <div className="md-sk-cat"><Line w={w} h={4} /><Line w={6} h={4} /></div>;
}

function Band({ example, mini }: { example: MediaExampleKey; mini: boolean }) {
  return (
    <div className={`md-band${mini ? " md-band--mini" : ""}`}>
      <div className="md-band__head">
        <span className="md-band__label">Anzeige</span>
        <span className="md-band__hint">Werbung, nicht Teil des Artikels</span>
      </div>
      <MdFrameImage example={example} />
    </div>
  );
}

// Nur das Bild (im Band ersetzt die Kopfzeile den Kicker).
function MdFrameImage({ example }: { example: MediaExampleKey }) {
  const ex = MEDIA_EXAMPLES[example];
  const s = exampleSize(example);
  return <Image className="md-band__img" src={ex.src} alt="" width={s.w * RETINA} height={s.h * RETINA} unoptimized />;
}

function TextLines({ widths }: { widths: string[] }) {
  return <>{widths.map((w, i) => <Line key={i} w={w} />)}</>;
}

function Column({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="md-vis__col">
      <p className="md-vis__label">{label}</p>
      {children}
    </div>
  );
}

// Desktop-Skizze + Mobile-Skizze (ab 768 px sichtbar).
export function PlacementSketch({ code }: { code: PlacementCode }) {
  switch (code) {
    case "home_billboard":
      return (
        <div className="md-vis" aria-hidden="true">
          <Column label="Desktop">
            <Browser>
              <div className="md-sk-grid2"><TeaserCard /><TeaserCard /></div>
              <MdFrame example="billboard" mini mark width="75%" />
              <Line w={90} h={7} tone="strong" />
              <div className="md-sk-grid3"><div className="md-sk-block" /><div className="md-sk-block" /><div className="md-sk-block" /></div>
            </Browser>
          </Column>
          <Column label="Mobile">
            <Phone>
              <TeaserCard imgH={66} />
              <MdFrame example="mobile" mini mark />
              <Line w={70} h={6} tone="strong" />
              <div className="md-sk-block md-sk-block--tall" />
            </Phone>
          </Column>
        </div>
      );
    case "hub_sidebar":
      return (
        <div className="md-vis" aria-hidden="true">
          <Column label="Desktop">
            <Browser>
              <div className="md-sk-head"><Line w={60} h={4} tone="green" /><Line w={180} h={12} tone="strong" /></div>
              <div className="md-sk-split">
                <div className="md-sk-aside" style={{ width: 100 }}>
                  <Line w={50} h={4} tone="strong" />
                  <CatRow w={56} /><CatRow w={48} /><CatRow w={62} /><CatRow w={40} />
                  <MdFrame example="halfpage" mini mark />
                  <div className="md-sk-box" />
                </div>
                <div className="md-sk-main">
                  <ListRow /><ListRow /><ListRow /><ListRow /><ListRow />
                </div>
              </div>
            </Browser>
          </Column>
          <Column label="Mobile">
            <Phone>
              <Line w={90} h={8} tone="strong" />
              <CatRow w={60} /><CatRow w={48} />
              <MdFrame example="rectangle" mini mark />
              <ListRow small /><ListRow small />
            </Phone>
          </Column>
        </div>
      );
    case "swiss_ai_sidebar":
      return (
        <div className="md-vis" aria-hidden="true">
          <Column label="Desktop">
            <Browser>
              <div className="md-sk-head"><Line w={50} h={4} tone="green" /><Line w={120} h={12} tone="strong" /></div>
              <div className="md-sk-split">
                <div className="md-sk-aside" style={{ width: 92 }}>
                  <div className="md-sk-search" />
                  <div className="md-sk-chips"><span /><span /><span /><span /></div>
                  <div className="md-sk-cta"><Line w={30} h={3} tone="orange" /><Line w="80%" h={5} tone="strong" /><Line w="90%" h={3} /><span className="md-sk-cta__btn" /></div>
                  <MdFrame example="rectangle" mini mark />
                </div>
                <div className="md-sk-main md-sk-main--grid">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="md-sk-company"><span className="md-sk-company__logo" /><Line w="70%" h={5} tone="strong" /><Line w="88%" h={4} /></div>
                  ))}
                </div>
              </div>
            </Browser>
          </Column>
          <Column label="Mobile">
            <Phone>
              <div className="md-sk-search" />
              <div className="md-sk-cta md-sk-cta--sm"><Line w="70%" h={4} tone="strong" /><span className="md-sk-cta__btn" /></div>
              <MdFrame example="rectangle" mini mark />
              <div className="md-sk-company md-sk-company--row"><span className="md-sk-company__logo" /><Line w="70%" h={4} tone="strong" /></div>
              <div className="md-sk-company md-sk-company--row"><span className="md-sk-company__logo" /><Line w="60%" h={4} tone="strong" /></div>
            </Phone>
          </Column>
        </div>
      );
    case "article_inline":
      return (
        <div className="md-vis" aria-hidden="true">
          <Column label="Desktop">
            <Browser>
              <div className="md-sk-article">
                <Line w="92%" h={12} tone="strong" /><Line w="60%" h={12} tone="strong" />
                <Line w="35%" h={4} />
                <div className="md-sk-block md-sk-block--img" />
                <TextLines widths={["100%", "96%", "88%", "100%", "70%"]} />
                <Band example="leaderboard" mini />
                <TextLines widths={["100%", "94%", "80%"]} />
              </div>
            </Browser>
          </Column>
          <Column label="Mobile">
            <Phone>
              <TextLines widths={["100%", "92%", "80%"]} />
              <Band example="rectangle" mini />
              <TextLines widths={["100%", "86%", "60%"]} />
            </Phone>
          </Column>
        </div>
      );
    case "rail_left":
    case "rail_right":
      return (
        <div className="md-vis md-vis--rail" aria-hidden="true">
          <Column label={`Bildschirm ab ${RAIL_MIN_WIDTH} px`}>
            <div className="md-sk-screen">
              <div className="md-sk-screen__bar">
                <span className="md-sk-logo" /><span className="md-sk-nav" /><span className="md-sk-nav" /><span className="md-sk-nav" />
              </div>
              <div className="md-sk-screen__content">
                <div className="md-sk-grid2"><TeaserCard imgH={72} /><TeaserCard imgH={72} /></div>
                <Line w={80} h={6} tone="strong" />
                <div className="md-sk-grid3"><div className="md-sk-block" /><div className="md-sk-block" /><div className="md-sk-block" /></div>
              </div>
              <div className="md-sk-rail md-sk-rail--left"><MdFrame example="rail" mini mark /></div>
              <div className="md-sk-rail md-sk-rail--right"><MdFrame example="rail" mini mark /></div>
            </div>
          </Column>
        </div>
      );
  }
}

// Unter 768 px: das Mobile-Motiv in echter Groesse im Modul-Rahmen.
export function PlacementMobileMotif({ code }: { code: PlacementCode }) {
  switch (code) {
    case "home_billboard":
      return (
        <div className="md-motif">
          <MdFrame example="mobile" mark width={`min(100%, ${PLACEMENTS.home_billboard.imageSize.mobile?.w ?? 320}px)`} alt="Mobile-Motiv von handyabo.com" />
        </div>
      );
    case "hub_sidebar":
    case "swiss_ai_sidebar":
      return (
        <div className="md-motif md-motif--center">
          <MdFrame example="rectangle" mark width={`min(100%, ${exampleSize("rectangle").w}px)`} alt="Mobile-Motiv von handyabo.com" />
        </div>
      );
    case "article_inline":
      return (
        <div className="md-motif md-motif--article" aria-hidden="true">
          <TextLines widths={["100%", "88%"]} />
          <div className="md-motif__band"><Band example="rectangle" mini={false} /></div>
          <TextLines widths={["100%", "72%"]} />
        </div>
      );
    case "rail_left":
    case "rail_right":
      return (
        <div className="md-motif md-motif--rail">
          <MdFrame example="rail" mark width={exampleSize("rail").w / 2} alt="Seitenrand-Motiv von handyabo.com, halbe Grösse" />
          <p className="md-motif__note">Beispiel in halber Grösse. Auf dem Handy wirken die übrigen vier Platzierungen.</p>
        </div>
      );
  }
}
