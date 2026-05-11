"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createDraft } from "@/lib/mockAuthorApi";

export default function NewArticlePage() {
  const router = useRouter();

  useEffect(() => {
    const draft = createDraft();
    router.replace(`/autor/artikel/${draft.id}`);
  }, [router]);

  return (
    <main style={{ padding: 64, color: "var(--da-muted)", fontFamily: "var(--da-font-mono)", fontSize: 13 }}>
      Erstelle neuen Entwurf …
    </main>
  );
}
