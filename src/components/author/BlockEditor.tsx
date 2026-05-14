"use client";

import Block from "./Block";
import BlockPicker from "./BlockPicker";
import type {
  Block as BlockT,
  BlockDocument,
  BlockType,
} from "@/types/blocks";

type BlockEditorProps = {
  doc: BlockDocument;
  onChange: (next: BlockDocument) => void;
  articleId: string;
  onRequestArticlePick?: (onPick: (r: import("@/lib/articleSearchActions").ArticleSearchResult) => void) => void;
  onRequestSourcePick?: (insertMarker: (n: number) => void) => void;
};

const newId = () => `bl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const makeBlock = (type: BlockType, level?: 2 | 3 | 4): BlockT => {
  switch (type) {
    case "heading":
      return { id: newId(), type: "heading", level: level ?? 2, content: "" };
    case "paragraph":
      return { id: newId(), type: "paragraph", content: "" };
    case "quote":
      return { id: newId(), type: "quote", content: "" };
    case "list":
      return { id: newId(), type: "list", ordered: false, items: [""] };
    case "code":
      return { id: newId(), type: "code", content: "" };
    case "image":
      return {
        id: newId(),
        type: "image",
        url: "",
        filename: "",
        alt: "",
        size: "full",
        alignment: "center",
      };
    case "statbox":
      return {
        id: newId(),
        type: "statbox",
        items: [
          { value: "", label: "" },
          { value: "", label: "" },
          { value: "", label: "" },
        ],
      };
    case "disclaimer":
      return { id: newId(), type: "disclaimer", text: "" };
    case "internalArticleCard":
      return {
        id: newId(),
        type: "internalArticleCard",
        articleSlug: "",
        cachedTitle: "",
      };
    case "divider":
      return { id: newId(), type: "divider", variant: "full" };
  }
};

export default function BlockEditor({ doc, onChange, articleId, onRequestArticlePick, onRequestSourcePick }: BlockEditorProps) {
  const blocks = doc.blocks;
  const setBlocks = (next: BlockT[]) => onChange({ ...doc, blocks: next });

  const update = (next: BlockT) => {
    setBlocks(blocks.map((b) => (b.id === next.id ? next : b)));
  };

  const addAfter = (afterId: string, type: BlockType = "paragraph", level?: 2 | 3 | 4) => {
    const idx = blocks.findIndex((b) => b.id === afterId);
    const next = [...blocks];
    next.splice(idx + 1, 0, makeBlock(type, level));
    setBlocks(next);
  };

  const remove = (id: string) => {
    if (blocks.length <= 1) return;
    setBlocks(blocks.filter((b) => b.id !== id));
  };

  const move = (id: string, dir: -1 | 1) => {
    const idx = blocks.findIndex((b) => b.id === id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[idx], next[target]] = [next[target], next[idx]];
    setBlocks(next);
  };

  const append = (type: BlockType, level?: 2 | 3 | 4) => {
    setBlocks([...blocks, makeBlock(type, level)]);
  };

  // Wenn doc keine Blocks hat, einen leeren Paragraph als Start zeigen.
  const visibleBlocks = blocks.length > 0 ? blocks : [makeBlock("paragraph")];

  return (
    <div>
      {visibleBlocks.map((b, i) => (
        <Block
          key={b.id}
          block={b}
          articleId={articleId}
          onRequestArticlePick={onRequestArticlePick}
          onRequestSourcePick={onRequestSourcePick}
          onChange={(next) => {
            // Falls visible aus dem leeren Fallback kommt → kein
            // entsprechender Eintrag in blocks. Dann ersten Edit als Insert
            // behandeln.
            if (blocks.length === 0) {
              setBlocks([next]);
              return;
            }
            update(next);
          }}
          onAddBelow={(id) => addAfter(id, "paragraph")}
          onDelete={remove}
          onMoveUp={(id) => move(id, -1)}
          onMoveDown={(id) => move(id, 1)}
          isFirst={i === 0}
          isLast={i === visibleBlocks.length - 1}
        />
      ))}
      <BlockPicker onPick={append} />
    </div>
  );
}
