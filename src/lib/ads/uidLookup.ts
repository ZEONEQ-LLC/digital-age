import "server-only";
import { XMLParser } from "fast-xml-parser";
import type { UidLookupHit, UidLookupResult } from "@/lib/ads/types";

// UID-Abfrage direkt gegen den oeffentlichen BFS-Webservice (G6). SOAP 1.1,
// ohne Registrierung. Namespaces aus der Diagnose D15 (uid-wse, uid-wse/5,
// eCH-0097/5). Muster fuer Fetch/Timeout/UA: newsTicker/fetcher.ts.
// Nichts wird gecacht oder gespeichert.
const ENDPOINT = "https://www.uid-wse.admin.ch/V5.0/PublicServices.svc";
const NS = "http://www.uid.admin.ch/xmlns/uid-wse";
const TIMEOUT_MS = 8_000;
const USER_AGENT = "digital-age Admin / 1.0 (+https://digital-age.ch)";
const MAX_HITS = 10;

const ERR_UNREACHABLE = "UID-Register nicht erreichbar.";
const ERR_INVALID = "Ungültige Anfrage.";
const ERR_NONE = "Keine Treffer.";

const parser = new XMLParser({
  ignoreAttributes: true,
  removeNSPrefix: true,
  trimValues: true,
  parseTagValue: false, // Zahlen als Strings lassen (UID, PLZ mit fuehrender Null)
});

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function envelope(body: string): string {
  return `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body>${body}</s:Body></s:Envelope>`;
}

function getByUidBody(digits: string): string {
  return envelope(
    `<GetByUID xmlns="${NS}"><uid xmlns:a="http://www.ech.ch/xmlns/eCH-0097/5">` +
      `<a:uidOrganisationIdCategorie>CHE</a:uidOrganisationIdCategorie>` +
      `<a:uidOrganisationId>${esc(digits)}</a:uidOrganisationId></uid></GetByUID>`,
  );
}

function searchBody(name: string): string {
  return envelope(
    `<Search xmlns="${NS}"><searchParameters xmlns:a="${NS}/5">` +
      `<a:uidEntitySearchParameters><a:organisationName>${esc(name)}</a:organisationName>` +
      `</a:uidEntitySearchParameters></searchParameters></Search>`,
  );
}

async function soap(operation: "GetByUID" | "Search", body: string): Promise<{ status: number; text: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: `${NS}/IPublicServices/${operation}`,
        "User-Agent": USER_AGENT,
      },
      body,
      signal: ctrl.signal,
      cache: "no-store",
    });
    return { status: res.status, text: await res.text() };
  } finally {
    clearTimeout(timer);
  }
}

type Rec = Record<string, unknown>;
const rec = (v: unknown): Rec => (v && typeof v === "object" ? (v as Rec) : {});
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : v === undefined || v === null ? [] : [v]);

// eCH-0108 organisationType -> Treffer. Mehrere Adressen: erste LEGAL
// (Sitz), sonst die erste.
function mapOrganisation(orgType: unknown): UidLookupHit | null {
  const outer = rec(orgType);
  const org = rec(outer.organisation);
  const ident = rec(org.organisationIdentification);
  const digits = str(rec(ident.uid).uidOrganisationId);
  if (!digits) return null;
  const name = str(ident.organisationName) ?? str(ident.organisationLegalName);
  if (!name) return null;
  const addresses = arr(org.address).map(rec);
  const addr = addresses.find((a) => str(a.addressCategory) === "LEGAL") ?? addresses[0] ?? {};
  const active = str(rec(outer.uidregInformation).uidregPublicStatus) === "1";
  return {
    uid: `CHE${digits.padStart(9, "0")}`,
    name,
    street: str(addr.street),
    houseNumber: str(addr.houseNumber),
    postOfficeBox: str(addr.postOfficeBoxNumber) ?? str(addr.postOfficeBoxText),
    postalCode: str(addr.swissZipCode) ?? str(addr.foreignZipCode),
    city: str(addr.town),
    country: (str(addr.countryIdISO2) ?? "CH").toUpperCase().slice(0, 2),
    legalFormCode: str(ident.legalForm),
    active,
  };
}

function faultText(parsed: Rec): string | null {
  const fault = rec(rec(rec(parsed.Envelope).Body).Fault);
  return str(fault.faultstring);
}

export async function lookupUid(query: string): Promise<UidLookupResult> {
  const q = (query ?? "").trim();
  if (!q) return { ok: false, error: "Bitte UID oder Firmenname eingeben." };

  const normalized = q.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const uidMatch = normalized.match(/^CHE(\d{9})/);
  let operation: "GetByUID" | "Search";
  let body: string;
  if (uidMatch) {
    operation = "GetByUID";
    body = getByUidBody(uidMatch[1]);
  } else {
    if (q.length < 3) return { ok: false, error: "Mindestens 3 Zeichen für die Namenssuche." };
    operation = "Search";
    body = searchBody(q.slice(0, 120));
  }

  let res: { status: number; text: string };
  try {
    res = await soap(operation, body);
  } catch {
    return { ok: false, error: ERR_UNREACHABLE };
  }

  let parsed: Rec;
  try {
    parsed = rec(parser.parse(res.text));
  } catch {
    return { ok: false, error: ERR_UNREACHABLE };
  }

  if (res.status !== 200) {
    const fs = faultText(parsed) ?? "";
    return { ok: false, error: fs.startsWith("Data_validation") ? ERR_INVALID : ERR_UNREACHABLE };
  }

  const bodyRec = rec(rec(parsed.Envelope).Body);
  let orgs: unknown[];
  if (operation === "GetByUID") {
    orgs = arr(rec(rec(bodyRec.GetByUIDResponse).GetByUIDResult).organisationType);
  } else {
    orgs = arr(rec(rec(bodyRec.SearchResponse).SearchResult).uidEntitySearchResultItem)
      .map((item) => rec(item).organisation);
  }
  const hits = orgs.map(mapOrganisation).filter((h): h is UidLookupHit => h !== null).slice(0, MAX_HITS);
  if (hits.length === 0) return { ok: false, error: ERR_NONE };
  return { ok: true, hits };
}
