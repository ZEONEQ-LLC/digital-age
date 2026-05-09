// In-memory mock API for the author suite + external pitch flow.
// State is module-scoped and survives within a single browser session.
// TODO Phase 7+: Replace with Supabase queries (authors, articles, revisions tables).

import type {
  Article,
  Author,
  Block,
  DashboardStats,
  PitchInput,
  Revision,
} from "@/types/author";

const ALI_ID = "auth-editor-ali";
const ANDREAS_ID = "auth-author-andreas";
const MARC_ID = "auth-external-marc";
const LENA_ID = "auth-external-lena";

const aliSoy: Author = {
  id: ALI_ID,
  type: "editor",
  name: "Ali Soy",
  handle: "ali-soy",
  email: "ali@digital-age.ch",
  role: "Founder & Editor in Chief",
  location: "Zürich",
  bio: "Heute haben wir die technischen Werkzeuge und das Wissen (nun ja, gilt nicht für alle), um die Produktivität zu steigern, mehr Transparenz zu schaffen und die Dinge einfacher zu gestalten. Es ist an der Zeit für grosse Veränderungen. Digital aus Überzeugung. Co-Founder & Managing Director von Digital Republic und Dozent an der Hochschule für Wirtschaft Zürich (HWZ).",
  avatar: "https://i.pravatar.cc/200?img=68",
  joinedAt: "2024-01-15T00:00:00Z",
  social: {
    linkedin: "linkedin.com/in/ali-soy",
  },
};

const andreasKamm: Author = {
  id: ANDREAS_ID,
  type: "author",
  name: "Andreas Kamm",
  handle: "andreas-kamm",
  email: "andreas@digital-age.ch",
  role: "Senior Banking Reporter",
  location: "Zürich",
  bio: "As a Journey Strategist and Business Innovation Lead at a leading Swiss bank, I draw on nearly four decades of banking experience and advanced expertise in artificial intelligence. With a postgraduate degree in AI in Finance from HWZ Zurich, I specialize in driving AI-powered transformation and digital innovation in the financial sector. My advisory work centers on designing AI-driven business models and forward-looking digitalization strategies that seamlessly integrate traditional banking with disruptive technologies.",
  avatar: "https://i.pravatar.cc/200?img=12",
  joinedAt: "2024-06-01T00:00:00Z",
};

const marcKeller: Author = {
  id: MARC_ID,
  type: "external",
  name: "Marc Keller",
  handle: "marc-keller-gast",
  email: "marc@helvetia-ai.ch",
  role: "Founder, Helvetia AI",
  location: "Bern, CH",
  bio: "Gründer von Helvetia AI. Beschäftigt sich mit Edge-AI-Anwendungen im Schweizer Mittelstand.",
  avatar: "https://i.pravatar.cc/200?img=12",
  website: "https://helvetia-ai.ch",
  joinedAt: "2026-03-12",
};

const lenaVogt: Author = {
  id: LENA_ID,
  type: "external",
  name: "Lena Vogt",
  handle: "lena-vogt-gast",
  email: "lena@zh-robotics.ch",
  role: "CTO, Zürich Robotics",
  location: "Zürich, CH",
  bio: "CTO bei Zürich Robotics. Forscht an autonomen Robotern für die Lagerlogistik.",
  avatar: "https://i.pravatar.cc/200?img=23",
  website: "https://zh-robotics.ch",
  joinedAt: "2026-02-04",
};

const seedAuthors: Author[] = [aliSoy, andreasKamm, marcKeller, lenaVogt];

const sampleBlocks = (): Block[] => [
  { id: "b1", type: "heading", level: 2, content: "Die Banken haben einen Joker — sie nutzen ihn nur leise" },
  { id: "b2", type: "paragraph", content: "Wer Schweizer Banken in den letzten zwei Jahren über KI sprechen hörte, bekam meist eine vorsichtige Antwort. Hinter den Kulissen ist die Realität deutlich konkreter — und überraschend pragmatisch." },
  { id: "b3", type: "paragraph", content: "In den letzten Monaten habe ich mit AI-Verantwortlichen aus drei der grössten Schweizer Banken gesprochen. Was sie schildern, passt nicht zur PR-Erzählung der Branche." },
  { id: "b4", type: "quote", content: "Wir nutzen kein OpenAI — und das ist eine bewusste Entscheidung, keine Verzögerung.", attribution: "AI-Lead, Schweizer Grossbank" },
  { id: "b5", type: "heading", level: 3, content: "Drei Use Cases, die bereits live sind" },
  { id: "b6", type: "list", ordered: false, items: [
    "Onboarding-Dokumentation: 60% Zeitersparnis im Compliance-Check",
    "KYC-Validierung mit On-Premise-LLM",
    "Reporting-Drafts für Risk Management",
  ] },
  { id: "b7", type: "paragraph", content: "Diese drei Use Cases haben eines gemeinsam: Alle laufen auf gehosteten Modellen mit klar definierten Datenflüssen. Keine SaaS-API. Kein Vendor Lock-In." },
];

const draftBlocks = (): Block[] => [
  { id: "d1", type: "paragraph", content: "Notiz: Predictive Maintenance lohnt sich nicht in jeder Industrie. Recherche-Liste:" },
  { id: "d2", type: "list", ordered: false, items: ["KMU mit Maschinenpark > 5 Mio CHF", "OEE-Daten ab 80 %", "IT-Reife OT-Konvergenz"] },
];

const blocksToMarkdown = (blocks: Block[]): string =>
  blocks.map((b) => {
    switch (b.type) {
      case "heading":
        return `${"#".repeat(b.level)} ${b.content}`;
      case "paragraph":
        return b.content;
      case "quote":
        return b.content
          .split("\n")
          .map((l) => `> ${l}`)
          .join("\n") + (b.attribution ? `\n> — ${b.attribution}` : "");
      case "list":
        return b.items.map((it) => `${b.ordered ? "1." : "-"} ${it}`).join("\n");
      case "code":
        return "```" + (b.language ?? "") + "\n" + b.content + "\n```";
      case "image":
        return `![${b.alt}](${b.src})${b.caption ? `\n*${b.caption}*` : ""}`;
    }
  }).join("\n\n");

const markdownToBlocks = (md: string): Block[] => {
  const lines = md.split("\n");
  const out: Block[] = [];
  let bId = 0;
  const id = () => `mb${Date.now()}-${bId++}`;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) { i++; continue; }

    if (trimmed.startsWith("## ")) {
      out.push({ id: id(), type: "heading", level: 2, content: trimmed.slice(3) });
      i++; continue;
    }
    if (trimmed.startsWith("### ")) {
      out.push({ id: id(), type: "heading", level: 3, content: trimmed.slice(4) });
      i++; continue;
    }
    if (trimmed.startsWith("> ")) {
      const buf: string[] = [];
      let attribution: string | undefined;
      while (i < lines.length && lines[i].trim().startsWith("> ")) {
        const txt = lines[i].trim().slice(2);
        if (txt.startsWith("— ")) attribution = txt.slice(2);
        else buf.push(txt);
        i++;
      }
      out.push({ id: id(), type: "quote", content: buf.join("\n"), attribution });
      continue;
    }
    if (trimmed.startsWith("```")) {
      const lang = trimmed.slice(3) || undefined;
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        buf.push(lines[i]); i++;
      }
      i++;
      out.push({ id: id(), type: "code", language: lang, content: buf.join("\n") });
      continue;
    }
    const ulMatch = /^[-*]\s+/.test(trimmed);
    const olMatch = /^\d+\.\s+/.test(trimmed);
    if (ulMatch || olMatch) {
      const items: string[] = [];
      const ordered = olMatch && !ulMatch;
      while (i < lines.length && (
        (ordered ? /^\d+\.\s+/ : /^[-*]\s+/).test(lines[i].trim())
      )) {
        items.push(lines[i].trim().replace(ordered ? /^\d+\.\s+/ : /^[-*]\s+/, ""));
        i++;
      }
      out.push({ id: id(), type: "list", ordered, items });
      continue;
    }
    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
    if (imgMatch) {
      out.push({ id: id(), type: "image", src: imgMatch[2], alt: imgMatch[1] });
      i++; continue;
    }
    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{2,3}\s|>\s|[-*]\s|\d+\.\s|```|!\[)/.test(lines[i].trim())) {
      buf.push(lines[i]); i++;
    }
    out.push({ id: id(), type: "paragraph", content: buf.join("\n") });
  }

  return out.length ? out : [{ id: id(), type: "paragraph", content: "" }];
};

const wordCountOf = (blocks: Block[], extra = ""): number => {
  const fromBlocks = blocks.reduce((acc, b) => {
    if (b.type === "list") return acc + b.items.join(" ").split(/\s+/).filter(Boolean).length;
    if (b.type === "image") return acc + (b.alt + " " + (b.caption ?? "")).split(/\s+/).filter(Boolean).length;
    if (b.type === "code") return acc + b.content.split(/\s+/).filter(Boolean).length;
    return acc + b.content.split(/\s+/).filter(Boolean).length;
  }, 0);
  const fromExtra = extra.split(/\s+/).filter(Boolean).length;
  return fromBlocks + fromExtra;
};

const seedArticles = (): Article[] => {
  const blocks = sampleBlocks();
  const blocks2 = sampleBlocks();
  const blocks3 = sampleBlocks();
  const blocks4 = draftBlocks();
  const blocks5 = sampleBlocks();
  const blocks6 = sampleBlocks();
  const blocks7 = sampleBlocks();

  return [
    {
      id: "art-1",
      authorId: ALI_ID,
      title: "Wie Schweizer KMU bei Edge-AI vorne dabei sind",
      slug: "schweizer-kmu-edge-ai",
      blocks,
      contentMd: blocksToMarkdown(blocks),
      excerpt: "Drei Use Cases aus dem KMU-Sektor zeigen, warum Edge-AI gerade in der Schweiz funktioniert — leiser, aber wirkungsvoller.",
      cover: "https://picsum.photos/seed/article1/1200/700",
      category: "KI im Business",
      tags: ["Edge AI", "KMU", "Industrie"],
      status: "published",
      createdAt: "2026-04-20T10:00:00Z",
      updatedAt: "2026-04-28T11:30:00Z",
      publishedAt: "2026-04-28",
      wordCount: wordCountOf(blocks),
      readMinutes: 6,
      views: 8420,
      reads: 5891,
      completion: 78,
      avgTime: "4:12",
      seoScore: 87,
      seoTitle: "Schweizer KMU & Edge-AI — digital age",
      seoDescription: "Drei Use Cases aus dem KMU-Sektor: Warum Edge-AI in der Schweiz still und leise funktioniert.",
      seoKeyword: "Edge AI Schweiz",
    },
    {
      id: "art-2",
      authorId: ALI_ID,
      title: "EU AI Act: Was Schweizer Unternehmen jetzt tun müssen",
      slug: "eu-ai-act-schweiz-leitfaden",
      blocks: blocks2,
      contentMd: blocksToMarkdown(blocks2),
      excerpt: "Der EU AI Act betrifft auch Schweizer Firmen mit EU-Kundschaft. Ein Leitfaden für die nächsten 12 Monate.",
      cover: "https://picsum.photos/seed/article2/1200/700",
      category: "Regulierung",
      tags: ["EU AI Act", "Compliance"],
      status: "in_review",
      createdAt: "2026-05-01T09:00:00Z",
      updatedAt: "2026-05-08T03:30:00Z",
      publishedAt: null,
      wordCount: wordCountOf(blocks2),
      readMinutes: 8,
      views: 0,
      reads: 0,
      completion: 0,
      avgTime: "0:00",
      seoScore: 72,
      seoTitle: "EU AI Act Schweiz — Leitfaden",
      seoDescription: "Was Schweizer Unternehmen jetzt tun müssen, um im EU-Geschäft compliant zu bleiben.",
      seoKeyword: "EU AI Act Schweiz",
    },
    {
      id: "art-3",
      authorId: ALI_ID,
      title: "Swiss Hosted GPT — Die Realität hinter dem Versprechen",
      slug: "swiss-hosted-gpt-realitaet",
      blocks: blocks3,
      contentMd: blocksToMarkdown(blocks3),
      excerpt: "Swiss Hosted GPT klingt nach Datensouveränität. Wir haben drei Anbieter unter die Lupe genommen.",
      cover: "https://picsum.photos/seed/article3/1200/700",
      category: "Swiss AI",
      tags: ["Swiss AI", "LLM", "Hosting"],
      status: "changes",
      createdAt: "2026-04-15T08:00:00Z",
      updatedAt: "2026-05-07T14:00:00Z",
      publishedAt: null,
      wordCount: wordCountOf(blocks3),
      readMinutes: 9,
      feedback: "Sehr stark recherchiert. Bitte den Abschnitt zu Latenz konkreter mit Zahlen unterlegen, und das Schluss-Plädoyer etwas neutraler formulieren.",
      views: 0,
      reads: 0,
      completion: 0,
      avgTime: "0:00",
      seoScore: 81,
      seoTitle: "Swiss Hosted GPT — Realität",
      seoDescription: "Drei Anbieter im direkten Vergleich. Was halten die Versprechen bei Latenz, Preis, Datenfluss?",
      seoKeyword: "Swiss Hosted GPT",
    },
    {
      id: "art-4",
      authorId: ALI_ID,
      title: "Predictive Maintenance: Wer sich rechnet — und wer nicht",
      slug: null,
      blocks: blocks4,
      contentMd: blocksToMarkdown(blocks4),
      excerpt: "",
      cover: "https://picsum.photos/seed/article4/1200/700",
      category: "Industrie 4.0",
      tags: ["IoT", "Predictive Maintenance"],
      status: "draft",
      createdAt: "2026-05-08T05:00:00Z",
      updatedAt: "2026-05-08T05:30:00Z",
      publishedAt: null,
      wordCount: wordCountOf(blocks4),
      readMinutes: 2,
      views: 0,
      reads: 0,
      completion: 0,
      avgTime: "0:00",
      seoScore: 0,
      seoTitle: "",
      seoDescription: "",
      seoKeyword: "",
    },
    {
      id: "art-5",
      authorId: ALI_ID,
      title: "Die Zukunft der Arbeit: Augmentation statt Automation",
      slug: "zukunft-arbeit-augmentation",
      blocks: blocks5,
      contentMd: blocksToMarkdown(blocks5),
      excerpt: "Eine ETH-Studie zeigt: KI ersetzt nicht, sie erweitert. Was Schweizer Firmen daraus mitnehmen können.",
      cover: "https://picsum.photos/seed/article5/1200/700",
      category: "Future of Work",
      tags: ["KI", "Arbeit", "ETH"],
      status: "published",
      createdAt: "2026-04-01T08:00:00Z",
      updatedAt: "2026-04-15T10:00:00Z",
      publishedAt: "2026-04-15",
      wordCount: wordCountOf(blocks5),
      readMinutes: 5,
      views: 12750,
      reads: 9890,
      completion: 81,
      avgTime: "3:55",
      seoScore: 92,
      seoTitle: "Augmentation statt Automation — digital age",
      seoDescription: "ETH-Studie zur Zukunft der Arbeit: Warum Augmentation der pragmatische Pfad für Schweizer KMU ist.",
      seoKeyword: "Augmentation Arbeit",
    },
    {
      id: "art-ext-1",
      authorId: MARC_ID,
      title: "Edge-AI im Mittelstand: Ein Praxisbericht aus drei Pilotprojekten",
      slug: "gastbeitrag-edge-ai-mittelstand",
      blocks: blocks6,
      contentMd: blocksToMarkdown(blocks6),
      excerpt: "Drei Mittelstands-Pilotprojekte, ein gemeinsamer Faden: Wer Edge-AI ernst nimmt, gewinnt nicht im Pitch, sondern in der Wartung.",
      cover: "https://picsum.photos/seed/extguest1/1200/700",
      category: "KI im Business",
      tags: ["Edge AI", "Mittelstand", "Praxis"],
      status: "published",
      createdAt: "2026-03-20T09:00:00Z",
      updatedAt: "2026-04-02T12:00:00Z",
      publishedAt: "2026-04-02",
      wordCount: wordCountOf(blocks6),
      readMinutes: 7,
      views: 4210,
      reads: 3022,
      completion: 72,
      avgTime: "5:01",
      seoScore: 78,
      seoTitle: "Edge-AI im Mittelstand — Praxisbericht",
      seoDescription: "Drei Mittelstands-Pilotprojekte: Was Edge-AI in der Wartung wirklich bringt.",
      seoKeyword: "Edge AI Mittelstand",
    },
    {
      id: "art-ext-2",
      authorId: LENA_ID,
      title: "Autonome Lagerroboter: Was im Schweizer KMU funktioniert",
      slug: "gastbeitrag-autonome-lagerroboter",
      blocks: blocks7,
      contentMd: blocksToMarkdown(blocks7),
      excerpt: "Aus der Praxis bei einem Schweizer Mittelständler: Welche Roboter wirklich produktiv werden — und welche im Setup steckenbleiben.",
      cover: "https://picsum.photos/seed/extguest2/1200/700",
      category: "Robotics",
      tags: ["Robotik", "Logistik", "KMU"],
      status: "published",
      createdAt: "2026-02-10T09:00:00Z",
      updatedAt: "2026-02-20T11:00:00Z",
      publishedAt: "2026-02-20",
      wordCount: wordCountOf(blocks7),
      readMinutes: 7,
      views: 3140,
      reads: 2110,
      completion: 67,
      avgTime: "4:34",
      seoScore: 75,
      seoTitle: "Autonome Lagerroboter im KMU",
      seoDescription: "Erfahrungsbericht: Welche Lagerroboter sich für Schweizer KMU rechnen.",
      seoKeyword: "Lagerroboter KMU",
    },
  ];
};

const seedRevisions = (): Revision[] => [
  { id: "rev-1", articleId: "art-1", authorId: ALI_ID, type: "edit",   summary: "+24 / -8 Zeilen · Abschnitt &lsquo;Quotes&rsquo; erweitert",     diffStats: { added: 24, removed: 8 }, createdAt: "2026-04-26T14:32:00Z" },
  { id: "rev-2", articleId: "art-1", authorId: ALI_ID, type: "edit",   summary: "+12 / -3 · SEO-Titel angepasst",                   diffStats: { added: 12, removed: 3 }, createdAt: "2026-04-26T11:18:00Z" },
  { id: "rev-3", articleId: "art-1", authorId: ALI_ID, type: "review", summary: "Annahme der Pitch-Phase",                          createdAt: "2026-04-25T16:45:00Z" },
  { id: "rev-4", articleId: "art-1", authorId: ALI_ID, type: "edit",   summary: "+187 / -0 · Erstentwurf veröffentlicht",          diffStats: { added: 187, removed: 0 }, createdAt: "2026-04-23T09:12:00Z" },
  { id: "rev-5", articleId: "art-1", authorId: ALI_ID, type: "create", summary: "Artikel erstellt",                                 createdAt: "2026-04-23T09:00:00Z" },
];

let articles: Article[] = seedArticles();
let authors: Author[] = [...seedAuthors];
let revisions: Revision[] = seedRevisions();

const cloneArticle = (a: Article): Article => ({ ...a, blocks: a.blocks.map((b) => ({ ...b })), tags: [...a.tags] });
const cloneAuthor = (a: Author): Author => ({ ...a, social: a.social ? { ...a.social } : undefined });

export function getCurrentAuthor(): Author {
  return cloneAuthor(aliSoy);
}

export function getAuthor(id: string): Author | null {
  const a = authors.find((x) => x.id === id);
  return a ? cloneAuthor(a) : null;
}

export function getAuthors(): Author[] {
  return authors.map(cloneAuthor);
}

export function getMyArticles(): Article[] {
  return articles.filter((a) => a.authorId === ALI_ID).map(cloneArticle);
}

export function getArticle(id: string): Article | null {
  const a = articles.find((x) => x.id === id);
  return a ? cloneArticle(a) : null;
}

export function getPublishedExternalArticles(): Article[] {
  return articles
    .filter((a) => a.status === "published")
    .filter((a) => {
      const author = authors.find((x) => x.id === a.authorId);
      return author?.type === "external";
    })
    .map(cloneArticle);
}

export function createDraft(): Article {
  const id = `art-${Date.now()}`;
  const blocks: Block[] = [
    { id: `bl-${Date.now()}`, type: "paragraph", content: "" },
  ];
  const now = new Date().toISOString();
  const draft: Article = {
    id,
    authorId: ALI_ID,
    title: "Unbenannter Artikel",
    slug: null,
    blocks,
    contentMd: "",
    excerpt: "",
    cover: "https://picsum.photos/seed/draft" + id + "/1200/700",
    category: "KI im Business",
    tags: [],
    status: "draft",
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
    wordCount: 0,
    readMinutes: 1,
    views: 0,
    reads: 0,
    completion: 0,
    avgTime: "0:00",
    seoScore: 0,
    seoTitle: "",
    seoDescription: "",
    seoKeyword: "",
  };
  articles = [draft, ...articles];
  revisions = [
    {
      id: `rev-${Date.now()}`,
      articleId: id,
      authorId: ALI_ID,
      type: "create",
      summary: "Artikel erstellt",
      createdAt: now,
    },
    ...revisions,
  ];
  return cloneArticle(draft);
}

export function saveDraft(id: string, patch: Partial<Article>): Article | null {
  const idx = articles.findIndex((a) => a.id === id);
  if (idx < 0) return null;
  const existing = articles[idx];
  const next: Article = {
    ...existing,
    ...patch,
    blocks: patch.blocks ?? existing.blocks,
    tags: patch.tags ?? existing.tags,
    updatedAt: new Date().toISOString(),
  };
  if (patch.blocks) {
    next.contentMd = blocksToMarkdown(next.blocks);
    next.wordCount = wordCountOf(next.blocks, `${next.title} ${next.excerpt}`);
    next.readMinutes = Math.max(1, Math.round(next.wordCount / 220));
  }
  articles = [...articles.slice(0, idx), next, ...articles.slice(idx + 1)];
  return cloneArticle(next);
}

export function submitForReview(id: string): Article | null {
  const idx = articles.findIndex((a) => a.id === id);
  if (idx < 0) return null;
  const existing = articles[idx];
  const next: Article = { ...existing, status: "in_review", updatedAt: new Date().toISOString() };
  articles = [...articles.slice(0, idx), next, ...articles.slice(idx + 1)];
  revisions = [
    {
      id: `rev-${Date.now()}`,
      articleId: id,
      authorId: ALI_ID,
      type: "submit",
      summary: "Zur Review eingereicht",
      createdAt: next.updatedAt,
    },
    ...revisions,
  ];
  return cloneArticle(next);
}

export function deleteArticle(id: string): boolean {
  const before = articles.length;
  articles = articles.filter((a) => a.id !== id);
  return articles.length < before;
}

export function getRevisions(articleId: string): Revision[] {
  return revisions.filter((r) => r.articleId === articleId);
}

export function getDashboardStats(): DashboardStats {
  return {
    views30d: [420, 380, 510, 620, 580, 690, 720, 810, 780, 920, 1080, 1240, 1180, 1340, 1290, 1410, 1480, 1620, 1580, 1720, 1890, 1820, 1950, 2080, 1980, 2150, 2240, 2380, 2410, 2520],
    unique30d: 14800,
    avgReadTime: "4:03",
    newsletterSubs: 284,
  };
}

export function submitExternalPitch(input: PitchInput): { article: Article; author: Author } {
  const now = new Date().toISOString();
  const handle = input.authorName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-gast";
  const newAuthor: Author = {
    id: `auth-external-${Date.now()}`,
    type: "external",
    name: input.authorName,
    handle,
    email: input.authorEmail,
    role: input.authorRole,
    bio: input.authorBio,
    avatar: `https://i.pravatar.cc/200?u=${encodeURIComponent(input.authorEmail)}`,
    website: input.authorWebsite,
    joinedAt: now,
  };
  authors = [...authors, newAuthor];

  const blocks = markdownToBlocks(input.contentMd);
  const article: Article = {
    id: `art-pitch-${Date.now()}`,
    authorId: newAuthor.id,
    title: input.title,
    slug: null,
    blocks,
    contentMd: input.contentMd,
    excerpt: input.excerpt,
    cover: `https://picsum.photos/seed/pitch${Date.now()}/1200/700`,
    category: input.category,
    tags: [],
    status: "in_review",
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
    wordCount: wordCountOf(blocks, `${input.title} ${input.excerpt}`),
    readMinutes: Math.max(1, Math.round(wordCountOf(blocks, input.excerpt) / 220)),
    views: 0,
    reads: 0,
    completion: 0,
    avgTime: "0:00",
    seoScore: 0,
    seoTitle: "",
    seoDescription: "",
    seoKeyword: "",
  };
  articles = [article, ...articles];
  return { article: cloneArticle(article), author: cloneAuthor(newAuthor) };
}

export function blocksAsMarkdown(blocks: Block[]): string {
  return blocksToMarkdown(blocks);
}

export function markdownAsBlocks(md: string): Block[] {
  return markdownToBlocks(md);
}
