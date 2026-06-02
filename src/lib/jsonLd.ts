// JSON-LD-Helper für Block-2-Schemas.
//
// Pattern: jede Page baut pro Schema-Typ einen eigenen <script>-Tag mit
// `dangerouslySetInnerHTML={{ __html: buildXxxJsonLd(...) }}`. Eine Page
// mit mehreren Schemas rendert mehrere <script>-Tags nebeneinander —
// kein @graph-Wrapper, weil das den bestehenden Article-Schema-Pfad
// (artikel/[slug]/page.tsx) komplikationslos lässt.
//
// Alle Builder geben einen `JSON.stringify`-fertigen String mit
// `@context: https://schema.org` zurück.

type LdNode = Record<string, unknown>;

function toJsonLd(data: LdNode): string {
  return JSON.stringify({ "@context": "https://schema.org", ...data });
}

// Social-Links sind in authors.social_links als Plain-Text gespeichert
// (Migration-Comment: { linkedin?, x?, mastodon?, github?, website? }).
// Manche Einträge haben `https://`, manche nicht (siehe Ali Soys
// "digital-age.ch" / "linkedin.com/in/ali-soy"). Schema.org verlangt
// absolute URLs für sameAs → wir normalisieren OUTPUT-seitig, kein
// DB-Touch.
export function normalizeSocialUrl(input: string | undefined | null): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (trimmed === "") return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

// ─────────────────────────────────────────────────────────────────────────
// BreadcrumbList
// ─────────────────────────────────────────────────────────────────────────

export type BreadcrumbItem = { name: string; url?: string };

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]): string {
  return toJsonLd({
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => {
      const node: LdNode = {
        "@type": "ListItem",
        position: idx + 1,
        name: item.name,
      };
      if (item.url) node.item = item.url;
      return node;
    }),
  });
}

// ─────────────────────────────────────────────────────────────────────────
// ItemList
// ─────────────────────────────────────────────────────────────────────────

export type ItemListEntry = { url: string; name: string };

export function buildItemListJsonLd(args: {
  items: ItemListEntry[];
  name?: string;
}): string {
  const data: LdNode = {
    "@type": "ItemList",
    itemListElement: args.items.map((it, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      url: it.url,
      name: it.name,
    })),
    numberOfItems: args.items.length,
  };
  if (args.name) data.name = args.name;
  return toJsonLd(data);
}

// ─────────────────────────────────────────────────────────────────────────
// WebSite (Homepage)
// ─────────────────────────────────────────────────────────────────────────
//
// Keine `potentialAction: SearchAction` — die Site hat aktuell keine
// öffentliche Suche; eine fake SearchAction wäre Google-Spam-Verstoß.

export function buildWebsiteJsonLd(args: {
  baseUrl: string;
  name: string;
  description: string;
}): string {
  return toJsonLd({
    "@type": "WebSite",
    name: args.name,
    url: args.baseUrl,
    description: args.description,
    inLanguage: "de-CH",
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Organization (Homepage)
// ─────────────────────────────────────────────────────────────────────────

export function buildOrganizationJsonLd(args: {
  baseUrl: string;
  name: string;
  description: string;
  logoPath: string;
  sameAs: string[];
}): string {
  const data: LdNode = {
    "@type": "Organization",
    name: args.name,
    url: args.baseUrl,
    description: args.description,
    logo: {
      "@type": "ImageObject",
      url: `${args.baseUrl}${args.logoPath}`,
    },
  };
  if (args.sameAs.length > 0) data.sameAs = args.sameAs;
  return toJsonLd(data);
}

// ─────────────────────────────────────────────────────────────────────────
// ProfilePage (Author-Detail)
// ─────────────────────────────────────────────────────────────────────────
//
// Author-URL IMMER /autor/<handle> (Decision-Log #112). Die Page-Route
// nutzt den `[slug]`-Folder-Namen, aber der Wert ist intern das Handle
// (getAuthorByHandle). sameAs[] wird vom Caller bereits normalisiert
// übergeben (normalizeSocialUrl), leeres Array → Property weggelassen.

export function buildProfilePageJsonLd(args: {
  baseUrl: string;
  handle: string;
  displayName: string;
  jobTitle: string | null;
  imageUrl: string | null;
  sameAs: string[];
}): string {
  const url = `${args.baseUrl}/autor/${args.handle}`;
  const person: LdNode = {
    "@type": "Person",
    name: args.displayName,
    url,
  };
  if (args.jobTitle) person.jobTitle = args.jobTitle;
  if (args.imageUrl) {
    person.image = /^https?:\/\//i.test(args.imageUrl)
      ? args.imageUrl
      : `${args.baseUrl}${args.imageUrl.startsWith("/") ? "" : "/"}${args.imageUrl}`;
  }
  if (args.sameAs.length > 0) person.sameAs = args.sameAs;
  person.worksFor = {
    "@type": "Organization",
    name: "digital age",
    url: args.baseUrl,
  };
  return toJsonLd({
    "@type": "ProfilePage",
    mainEntity: person,
  });
}
