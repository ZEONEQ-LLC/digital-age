// Tiptap-Test-Sandbox — isolierte Spielwiese für die geplante Tiptap-
// Migration. Nicht in Sidebar/TopNav verlinkt; direkt via /autor/tiptap-test
// aufrufbar. Default-Editor (EditorClient.tsx) bleibt unberührt.
// Auth-Gate kommt von src/app/autor/(suite)/layout.tsx.

import TiptapTestEditor from "./TiptapTestEditor";

export const metadata = {
  title: "Tiptap Test-Sandbox",
};

export default function TiptapTestPage() {
  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>
      <TiptapTestEditor />
    </div>
  );
}
