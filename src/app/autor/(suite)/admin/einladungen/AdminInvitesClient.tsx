"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { InviteWithInviter, InviteStatus } from "@/lib/editorAdminApi";
import { revokeInvite, resendInvite } from "@/lib/inviteActions";
import { buildInviteMessage } from "@/lib/inviteTextTemplate";

type Props = { initialInvites: InviteWithInviter[] };

type FilterKey = "all" | InviteStatus;

const statusStyles: Record<InviteStatus, { bg: string; color: string; label: string }> = {
  pending:  { bg: "rgba(50,255,126,0.12)",  color: "var(--da-green)",      label: "Pending"  },
  accepted: { bg: "rgba(50,255,126,0.06)",  color: "var(--da-muted-soft)", label: "Accepted" },
  expired:  { bg: "rgba(85,85,85,0.18)",    color: "var(--da-faint)",      label: "Expired"  },
  revoked:  { bg: "rgba(255,85,85,0.10)",   color: "#ff8080",              label: "Revoked"  },
};

const roleStyles: Record<"author" | "editor", { color: string; label: string }> = {
  author: { color: "var(--da-green)",  label: "Author"  },
  editor: { color: "var(--da-orange)", label: "Editor"  },
};

const filterOrder: FilterKey[] = ["pending", "accepted", "expired", "revoked", "all"];
const filterLabels: Record<FilterKey, string> = {
  pending: "Pending",
  accepted: "Accepted",
  expired: "Expired",
  revoked: "Revoked",
  all: "Alle",
};

function inviteUrlFor(token: string): string {
  if (typeof window === "undefined") return `/onboarding?token=${token}`;
  return `${window.location.origin}/onboarding?token=${token}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-CH", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminInvitesClient({ initialInvites }: Props) {
  const router = useRouter();
  // Direkt die Prop verwenden — useState würde sich nicht updaten,
  // wenn router.refresh() neue Server-Daten holt.
  const invites = initialInvites;
  const [filter, setFilter] = useState<FilterKey>("pending");
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { all: invites.length, pending: 0, accepted: 0, expired: 0, revoked: 0 };
    for (const i of invites) c[i.status]++;
    return c;
  }, [invites]);

  const filtered = useMemo(() => {
    if (filter === "all") return invites;
    return invites.filter((i) => i.status === filter);
  }, [invites, filter]);

  function copyInviteText(invite: InviteWithInviter) {
    const message = buildInviteMessage({
      recipientName: invite.display_name ?? invite.email.split("@")[0],
      inviterName: invite.invited_by?.display_name ?? "Die Redaktion",
      inviteUrl: inviteUrlFor(invite.token),
      intendedRole: invite.intended_role === "editor" ? "editor" : "author",
    });
    navigator.clipboard.writeText(message);
  }

  function doRevoke(id: string) {
    if (!confirm("Einladung wirklich widerrufen?")) return;
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      try {
        await revokeInvite(id);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setPendingId(null);
      }
    });
  }

  function doResend(id: string) {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      try {
        await resendInvite(id);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <>
      <style>{`
        .a-inv-filter {
          display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 18px;
        }
        .a-inv-chip {
          background: transparent; color: var(--da-muted-soft);
          border: 1px solid var(--da-border);
          padding: 6px 12px; border-radius: 999px;
          font-size: 12px; cursor: pointer;
          font-family: inherit;
          transition: all var(--t-fast);
        }
        .a-inv-chip:hover { color: var(--da-text); border-color: var(--da-muted); }
        .a-inv-chip--active {
          background: var(--da-green); color: var(--da-dark); border-color: var(--da-green);
          font-weight: 600;
        }
        .a-inv-table {
          background: var(--da-darker); border: 1px solid var(--da-border);
          border-radius: 8px; overflow: hidden;
        }
        .a-inv-row {
          display: grid;
          grid-template-columns: 1.8fr 1.2fr 90px 100px 1fr 110px 110px 230px;
          gap: 12px; padding: 12px 16px;
          border-bottom: 1px solid var(--da-border);
          font-size: 12px; color: var(--da-text); align-items: center;
        }
        .a-inv-row:last-child { border-bottom: none; }
        .a-inv-row--head {
          background: var(--da-dark);
          color: var(--da-muted-soft);
          font-family: var(--da-font-mono);
          font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase;
          font-weight: 700;
        }
        .a-inv-email { color: var(--da-text); font-weight: 600; word-break: break-all; }
        .a-inv-name { color: var(--da-muted); }
        .a-inv-badge {
          display: inline-block; padding: 3px 8px; border-radius: 999px;
          font-size: 10px; font-weight: 700; letter-spacing: 0.06em;
          font-family: var(--da-font-mono); text-transform: uppercase;
        }
        .a-inv-actions { display: flex; gap: 6px; flex-wrap: wrap; }
        .a-inv-btn {
          background: transparent; color: var(--da-text);
          border: 1px solid var(--da-border);
          padding: 5px 10px; border-radius: 4px;
          font-size: 11px; cursor: pointer; font-family: inherit;
        }
        .a-inv-btn:hover { border-color: var(--da-muted); }
        .a-inv-btn--danger { color: #ff8080; border-color: rgba(255,85,85,0.4); }
        .a-inv-btn--danger:hover { background: rgba(255,85,85,0.08); }
        .a-inv-empty {
          padding: 32px; text-align: center; color: var(--da-muted-soft); font-size: 13px;
        }
        .a-inv-error {
          background: rgba(255,85,85,0.08); color: #ff8080;
          border: 1px solid rgba(255,85,85,0.3);
          padding: 10px 12px; border-radius: 4px;
          font-size: 12px; margin-bottom: 16px;
        }
        @media (max-width: 1100px) {
          .a-inv-row { grid-template-columns: 1.5fr 100px 100px 1fr 210px; }
          .a-inv-col-name, .a-inv-col-by, .a-inv-col-expires { display: none; }
        }
      `}</style>

      {error && <div className="a-inv-error">{error}</div>}

      <div className="a-inv-filter">
        {filterOrder.map((k) => (
          <button
            key={k}
            className={`a-inv-chip${filter === k ? " a-inv-chip--active" : ""}`}
            onClick={() => setFilter(k)}
          >
            {filterLabels[k]} ({counts[k]})
          </button>
        ))}
      </div>

      <div className="a-inv-table">
        <div className="a-inv-row a-inv-row--head" role="row">
          <span>E-Mail</span>
          <span className="a-inv-col-name">Name</span>
          <span>Rolle</span>
          <span>Status</span>
          <span className="a-inv-col-by">Erstellt von</span>
          <span>Erstellt</span>
          <span className="a-inv-col-expires">Ablauf</span>
          <span>Aktionen</span>
        </div>
        {filtered.length === 0 ? (
          <div className="a-inv-empty">Keine Einladungen in diesem Filter.</div>
        ) : (
          filtered.map((i) => {
            const ss = statusStyles[i.status];
            const ir = i.intended_role === "editor" ? roleStyles.editor : roleStyles.author;
            const canRevoke = i.status === "pending";
            const canResend = i.status === "pending" || i.status === "expired" || i.status === "revoked";
            const canCopy = i.status === "pending";
            const busy = pendingId === i.id;
            return (
              <div className="a-inv-row" key={i.id}>
                <div className="a-inv-email">{i.email}</div>
                <div className="a-inv-name a-inv-col-name">{i.display_name ?? "—"}</div>
                <div><span className="a-inv-badge" style={{ color: ir.color, background: "transparent", border: `1px solid ${ir.color}` }}>{ir.label}</span></div>
                <div><span className="a-inv-badge" style={{ background: ss.bg, color: ss.color }}>{ss.label}</span></div>
                <div className="a-inv-col-by">
                  {i.invited_by ? (
                    <Link href={`/autor/${i.invited_by.slug}`} style={{ color: "var(--da-muted)", textDecoration: "none" }}>
                      {i.invited_by.display_name}
                    </Link>
                  ) : <span style={{ color: "var(--da-faint)" }}>—</span>}
                </div>
                <div style={{ color: "var(--da-muted)" }}>{formatDate(i.invited_at)}</div>
                <div className="a-inv-col-expires" style={{ color: "var(--da-muted)" }}>{formatDate(i.expires_at)}</div>
                <div className="a-inv-actions">
                  {canCopy && (
                    <button className="a-inv-btn" onClick={() => copyInviteText(i)}>Text kopieren</button>
                  )}
                  {canResend && (
                    <button className="a-inv-btn" onClick={() => doResend(i.id)} disabled={busy}>
                      {busy ? "…" : "Neu generieren"}
                    </button>
                  )}
                  {canRevoke && (
                    <button className="a-inv-btn a-inv-btn--danger" onClick={() => doRevoke(i.id)} disabled={busy}>
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
