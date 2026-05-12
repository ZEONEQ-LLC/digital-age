// Minimaler View-Model-Type für den Author-Chip in Sidebar/TopNav.
// Entkoppelt die UI-Components vom mock-Author-Type bzw. von der Supabase-Row.
export type AuthorChip = {
  name: string;
  avatar: string;
  jobTitle?: string;
  userRole: "external" | "author" | "editor";
};
