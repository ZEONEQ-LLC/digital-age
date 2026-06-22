"use client";

import { createContext } from "react";

// Live `n → Inline-Anzeige-Nummer` fuer Source-Ref-NodeViews im Body-Editor.
// Der TiptapBodyEditor scannt pro Transaktion (read-only) seine daSourceRef-
// Nodes in Auftrittsreihenfolge und legt die Map hier ab; die portalierten
// NodeViews lesen sie via Context und zeigen denselben Auftritts-Rang wie der
// BlockReader auf der oeffentlichen Seite.
//
// null = kein Provider (z.B. Abstract-/Page-Editor) → NodeView faellt auf das
// rohe n zurueck. Das ist dort korrekt, weil deren Renderer (InlineText) die
// Refs ebenfalls roh (positionsbasiert) zeigt. NUR der Body-Editor rendert
// ueber BlockReader und braucht daher das Auftritts-Renumbering.
export const SourceRefDisplayContext = createContext<Map<number, number> | null>(
  null,
);
