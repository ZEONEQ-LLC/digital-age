import { XMLParser } from "fast-xml-parser";
import { readFileSync } from "node:fs";

export type WPPost = {
  guid: string;
  title: string;
  slug: string;
  link: string;
  pubDate: string;
  postDateGmt: string;
  status: string;
  authorEmail: string;
  categories: string[]; // WP-Category-Namen, decoded
  tags: string[];
  contentHtml: string;
  excerpt: string;
  thumbnailId: string | null;
};

export type WPAttachment = {
  id: string;
  url: string;
};

export type WPExport = {
  posts: WPPost[];
  attachmentsById: Map<string, WPAttachment>;
};

type RawItem = {
  title?: string | { "#text"?: string };
  link?: string;
  pubDate?: string;
  "dc:creator"?: string;
  guid?: string | { "#text"?: string };
  description?: string;
  "content:encoded"?: string;
  "excerpt:encoded"?: string;
  "wp:post_id"?: number | string;
  "wp:post_date_gmt"?: string;
  "wp:post_name"?: string;
  "wp:status"?: string;
  "wp:post_type"?: string;
  "wp:attachment_url"?: string;
  "wp:postmeta"?: Array<{ "wp:meta_key": string; "wp:meta_value": string }> | { "wp:meta_key": string; "wp:meta_value": string };
  category?: Array<RawCategory> | RawCategory;
};

type RawCategory = {
  "#text"?: string;
  "@_domain"?: string;
  "@_nicename"?: string;
};

type RawAuthor = {
  "wp:author_login"?: string;
  "wp:author_email"?: string;
};

// CDATA in XML schluckt entity-decoding — `&amp;` bleibt literal. Wir
// dekodieren auf der Stringebene, damit Titel + Categories + Body identisch
// zur User-Sicht im WP-Admin sind.
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

// fast-xml-parser v5 wickelt CDATA-Werte in `{ "#text": "..." }`-Objekte,
// und manche Tags landen als Array von solchen Objekten. flattenText
// extrahiert den Plain-String aus jeder dieser Formen.
function flattenText(v: unknown): string {
  if (v == null) return "";
  if (Array.isArray(v)) return v.map(flattenText).join("");
  if (typeof v === "string") return decodeEntities(v);
  if (typeof v === "number") return String(v);
  if (typeof v === "object" && v !== null && "#text" in v) {
    return flattenText((v as { "#text": unknown })["#text"]);
  }
  return "";
}

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function findMeta(item: RawItem, key: string): string | null {
  const metas = asArray(item["wp:postmeta"]);
  for (const m of metas) {
    if (flattenText(m?.["wp:meta_key"]) === key) {
      const v = flattenText(m?.["wp:meta_value"]);
      return v || null;
    }
  }
  return null;
}

export function parseWPExport(path: string): WPExport {
  const xml = readFileSync(path, "utf8");

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    cdataPropName: "#text",
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: true,
    isArray: (name) => {
      // Felder die mehrfach pro Item vorkommen können
      return ["item", "category", "wp:postmeta", "wp:author"].includes(name);
    },
  });

  const parsed = parser.parse(xml);
  const channel = parsed?.rss?.channel ?? {};
  const items: RawItem[] = asArray(channel.item);
  const authors: RawAuthor[] = asArray(channel["wp:author"]);

  // Author-Login → Email für dc:creator-Lookup
  const authorEmailByLogin = new Map<string, string>();
  for (const a of authors) {
    const login = flattenText(a["wp:author_login"]);
    const email = flattenText(a["wp:author_email"]);
    if (login && email) authorEmailByLogin.set(login, email);
  }

  const attachmentsById = new Map<string, WPAttachment>();
  const posts: WPPost[] = [];

  for (const item of items) {
    const postType = flattenText(item["wp:post_type"]);
    if (postType === "attachment") {
      const id = flattenText(item["wp:post_id"]);
      const url = flattenText(item["wp:attachment_url"]);
      if (id && url) attachmentsById.set(id, { id, url });
      continue;
    }
    if (postType !== "post") continue;

    const rawCats = asArray(item.category);
    const categories: string[] = [];
    const tags: string[] = [];
    for (const c of rawCats) {
      const text = flattenText(c).trim();
      if (!text) continue;
      const domain = c["@_domain"];
      if (domain === "category") categories.push(text);
      else if (domain === "post_tag") tags.push(text);
    }

    const creator = flattenText(item["dc:creator"]);
    const authorEmail = authorEmailByLogin.get(creator) ?? "";

    posts.push({
      guid: flattenText(item.guid),
      title: flattenText(item.title),
      slug: flattenText(item["wp:post_name"]),
      link: flattenText(item.link),
      pubDate: flattenText(item.pubDate),
      postDateGmt: flattenText(item["wp:post_date_gmt"]),
      status: flattenText(item["wp:status"]),
      authorEmail,
      categories,
      tags,
      contentHtml: flattenText(item["content:encoded"]),
      excerpt: flattenText(item["excerpt:encoded"]),
      thumbnailId: findMeta(item, "_thumbnail_id"),
    });
  }

  return { posts, attachmentsById };
}
