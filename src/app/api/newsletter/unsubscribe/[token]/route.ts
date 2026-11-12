import { NextResponse } from "next/server";
import { unsubscribeByToken } from "@/lib/newsletter/unsubscribePublic";

// One-Click-Abmeldung (RFC 8058) fuer den Header List-Unsubscribe der
// Newsletter-Ausgaben (PR 195). Mailprogramme schicken ein POST mit
// «List-Unsubscribe=One-Click»; das meldet sofort ab. Ein GET (Link-Scanner,
// Klick im Browser) meldet NICHT ab, sondern fuehrt auf die Seite mit
// Bestaetigungsknopf. Gleiche Logik und Rate-Limit wie dort.
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Ctx = { params: Promise<{ token: string }> };

export async function POST(_request: Request, { params }: Ctx) {
  const { token } = await params;
  if (!UUID_RE.test(token)) return new NextResponse(null, { status: 204 });
  const res = await unsubscribeByToken(token);
  if (!res.success) return NextResponse.json({ ok: false }, { status: 500 });
  return new NextResponse("Abgemeldet.", { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}

export async function GET(request: Request, { params }: Ctx) {
  const { token } = await params;
  const target = UUID_RE.test(token) ? `/newsletter/abmelden/${token}` : "/newsletter/abgemeldet";
  return NextResponse.redirect(new URL(target, request.url), 303);
}
