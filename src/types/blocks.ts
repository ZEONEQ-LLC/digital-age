// Block-Tree für den Article-Editor und -Renderer.
// Markdown <-> Block-Conversion in @/lib/markdownBlocks.
// Wurde aus dem ehemaligen @/types/author extrahiert, nachdem die übrigen
// Mock-Types in Session E weggefallen sind.

export type Block =
  | { id: string; type: "heading"; level: 2 | 3; content: string }
  | { id: string; type: "paragraph"; content: string }
  | { id: string; type: "quote"; content: string; attribution?: string }
  | { id: string; type: "list"; items: string[]; ordered: boolean }
  | { id: string; type: "code"; language?: string; content: string }
  | { id: string; type: "image"; src: string; alt: string; caption?: string };

export type BlockType = Block["type"];
