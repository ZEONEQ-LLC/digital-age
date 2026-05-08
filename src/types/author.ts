// TODO Phase 7+: Replace with Supabase row types

export type AuthorType = "internal" | "external";

export type ArticleStatus =
  | "draft"
  | "in_review"
  | "changes"
  | "published"
  | "rejected";

export type Author = {
  id: string;
  type: AuthorType;
  name: string;
  handle: string;
  email: string;
  role?: string;
  location?: string;
  bio: string;
  avatar: string;
  website?: string;
  joinedAt: string;
  social?: {
    linkedin?: string;
    x?: string;
    mastodon?: string;
  };
};

export type Block =
  | { id: string; type: "heading"; level: 2 | 3; content: string }
  | { id: string; type: "paragraph"; content: string }
  | { id: string; type: "quote"; content: string; attribution?: string }
  | { id: string; type: "list"; items: string[]; ordered: boolean }
  | { id: string; type: "code"; language?: string; content: string }
  | { id: string; type: "image"; src: string; alt: string; caption?: string };

export type BlockType = Block["type"];

export type Article = {
  id: string;
  authorId: string;
  title: string;
  slug: string | null;
  blocks: Block[];
  contentMd: string;
  excerpt: string;
  cover: string;
  category: string;
  tags: string[];
  status: ArticleStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  wordCount: number;
  readMinutes: number;
  feedback?: string;
  views: number;
  reads: number;
  completion: number;
  avgTime: string;
  seoScore: number;
  seoTitle: string;
  seoDescription: string;
  seoKeyword: string;
};

export type Revision = {
  id: string;
  articleId: string;
  authorId: string;
  type: "create" | "edit" | "review" | "submit" | "publish";
  summary: string;
  diffStats?: { added: number; removed: number };
  createdAt: string;
};

export type PitchInput = {
  title: string;
  excerpt: string;
  category: string;
  contentMd: string;
  authorName: string;
  authorEmail: string;
  authorRole?: string;
  authorBio: string;
  authorWebsite?: string;
};

export type DashboardStats = {
  views30d: number[];
  unique30d: number;
  avgReadTime: string;
  newsletterSubs: number;
};
