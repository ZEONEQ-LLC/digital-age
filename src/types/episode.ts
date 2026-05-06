import type { ListenLinksMap } from "@/components/ListenLinks";

export type EpisodeGuest = {
  name: string;
  role: string;
};

export type Episode = {
  id: string;
  number: number;
  title: string;
  description: string;
  cover: string;
  duration: number;
  publishDate: string;
  category: string;
  guest?: EpisodeGuest;
  listenLinks: ListenLinksMap;
  showNotesUrl?: string;
  isLatest?: boolean;
};
