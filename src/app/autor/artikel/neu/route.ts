import { NextResponse } from "next/server";
import { createDraft } from "@/lib/authorActions";

// Route Handler statt Server Component, weil createDraft via revalidatePath
// nicht aus einem render-Kontext aufgerufen werden darf (Next.js 16 wirft
// "Route used revalidatePath during render which is unsupported"). Route
// Handler haben einen request-Kontext und dürfen revalidieren.
//
// Auth-Check passiert intern in createDraft (requireCurrentAuthor) — bei
// fehlender Session wird ein Error geworfen und wir redirecten auf /login.
//
// WICHTIG: Die zugehörigen Links müssen `prefetch={false}` setzen, sonst
// erzeugt Hover/Viewport-Prefetch leere Drafts.
export async function GET(request: Request) {
  try {
    const { id } = await createDraft();
    return NextResponse.redirect(new URL(`/autor/artikel/${id}`, request.url));
  } catch (error) {
    const url = new URL("/login", request.url);
    if (error instanceof Error && error.message === "Nicht eingeloggt.") {
      return NextResponse.redirect(url);
    }
    url.searchParams.set("error", "create_draft_failed");
    return NextResponse.redirect(url);
  }
}
