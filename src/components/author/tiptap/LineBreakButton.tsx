"use client";

import { useCurrentEditor } from "@tiptap/react";
import { Button } from "@/components/tiptap-ui-primitive/button";
import { CornerDownLeftIcon } from "@/components/tiptap-icons/corner-down-left-icon";

// Zeilenumbruch (hardBreak) als Toolbar-Knopf. Auf der iPad-Bildschirmtastatur
// ist Shift-Enter unzuverlaessig (Backlog 26.10.2026); der Knopf setzt denselben
// Node wie Shift-Enter. blocksToTiptap bildet hardBreak symmetrisch auf "\n"
// ab, der Umbruch ueberlebt Speichern und Neuladen.
export default function LineBreakButton() {
  const { editor } = useCurrentEditor();
  return (
    <Button
      type="button"
      variant="ghost"
      tooltip="Zeilenumbruch (Shift+Enter)"
      aria-label="Zeilenumbruch einfügen"
      disabled={!editor}
      onClick={() => editor?.chain().focus().setHardBreak().run()}
    >
      <CornerDownLeftIcon className="tiptap-button-icon" />
    </Button>
  );
}
