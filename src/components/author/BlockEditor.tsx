"use client";

import Block from "./Block";
import BlockPicker from "./BlockPicker";
import type { Block as BlockT, BlockType } from "@/types/blocks";

type BlockEditorProps = {
  blocks: BlockT[];
  onChange: (next: BlockT[]) => void;
};

const newId = () => `bl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const makeBlock = (type: BlockType, level?: 2 | 3): BlockT => {
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
      return { id: newId(), type: "image", src: "", alt: "", caption: "" };
  }
};

export default function BlockEditor({ blocks, onChange }: BlockEditorProps) {
  const update = (next: BlockT) => {
    onChange(blocks.map((b) => (b.id === next.id ? next : b)));
  };

  const addAfter = (afterId: string, type: BlockType = "paragraph", level?: 2 | 3) => {
    const idx = blocks.findIndex((b) => b.id === afterId);
    const next = [...blocks];
    next.splice(idx + 1, 0, makeBlock(type, level));
    onChange(next);
  };

  const remove = (id: string) => {
    if (blocks.length <= 1) return;
    onChange(blocks.filter((b) => b.id !== id));
  };

  const move = (id: string, dir: -1 | 1) => {
    const idx = blocks.findIndex((b) => b.id === id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

  const append = (type: BlockType, level?: 2 | 3) => {
    onChange([...blocks, makeBlock(type, level)]);
  };

  return (
    <div>
      {blocks.map((b, i) => (
        <Block
          key={b.id}
          block={b}
          onChange={update}
          onAddBelow={(id) => addAfter(id, "paragraph")}
          onDelete={remove}
          onMoveUp={(id) => move(id, -1)}
          onMoveDown={(id) => move(id, 1)}
          isFirst={i === 0}
          isLast={i === blocks.length - 1}
        />
      ))}
      <BlockPicker onPick={append} />
    </div>
  );
}
