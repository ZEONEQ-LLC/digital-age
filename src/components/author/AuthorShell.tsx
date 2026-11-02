import { getCurrentAuthor } from "@/lib/authorApi";
import { getPendingApprovalsCount } from "@/lib/podcasts/approvalsApi";
import AuthorMobileBar from "./AuthorMobileBar";
import AuthorMobileBlock from "./AuthorMobileBlock";
import AuthorSidebar from "./AuthorSidebar";
import AuthorTopNav from "./AuthorTopNav";
import type { AuthorChip } from "@/types/authorVM";

type AuthorShellProps = {
  children: React.ReactNode;
  /** "block" (Default): unter 768px Sperrbildschirm. "allow": schmale
   *  Kopfzeile + Inhalt, fuer Seiten wie Freigaben, die aufs Handy gehoeren. */
  mobile?: "block" | "allow";
};

// Der Seiteninhalt steht genau EINMAL im DOM (ein <main>). Nur die Navigation
// wechselt per CSS zwischen Mobile (<768), Tablet (768-1023) und Desktop
// (>=1024). Kein matchMedia, keine Hydration-Unterschiede. Frueher wurde
// {children} pro Breakpoint gerendert (zwei bis drei Instanzen: doppelte
// Tiptap-Editoren, Effects und DOM-IDs).
export default async function AuthorShell({ children, mobile = "block" }: AuthorShellProps) {
  const row = await getCurrentAuthor();
  const pendingApprovals = row?.role === "editor" ? await getPendingApprovalsCount() : 0;
  const author: AuthorChip = {
    name: row?.display_name ?? "Unbekannt",
    avatar: row?.avatar_url ?? "",
    jobTitle: row?.job_title ?? undefined,
    userRole: row?.role ?? "external",
    pendingApprovals,
  };

  return (
    <>
      <style>{`
        .a-shell { min-height: 100vh; background: var(--da-dark); }

        .a-shell__nav-mobile { display: block; }
        .a-shell__nav-tablet { display: none; }
        .a-shell__nav-desktop { display: none; }

        .a-shell__main {
          padding: 20px 16px 56px;
          animation: da-fadein var(--t-slow) ease;
        }
        /* Suite unter 768px: Sperrbildschirm; der Inhalt bleibt gemountet,
           ist aber unsichtbar (wie frueher die versteckten Kopien). */
        @media (max-width: 767px) {
          .a-shell--block .a-shell__main { display: none; }
        }

        @media (min-width: 768px) {
          .a-shell__nav-mobile { display: none; }
          .a-shell__nav-tablet { display: block; }
          .a-shell__main {
            padding: 24px 20px 64px;
            max-width: var(--max-dash);
            margin: 0 auto;
          }
        }

        @media (min-width: 1024px) {
          .a-shell__nav-tablet { display: none; }
          .a-shell__nav-desktop { display: block; }
          .a-shell__main {
            margin: 0 0 0 var(--sidebar-w);
            padding: 32px 40px 80px;
          }
        }
      `}</style>
      <div className={`a-shell a-shell--${mobile}`}>
        <div className="a-shell__nav-mobile">
          {mobile === "allow" ? <AuthorMobileBar author={author} /> : <AuthorMobileBlock />}
        </div>
        <div className="a-shell__nav-tablet">
          <AuthorTopNav author={author} />
        </div>
        <div className="a-shell__nav-desktop">
          <AuthorSidebar author={author} />
        </div>
        <main className="a-shell__main">{children}</main>
      </div>
    </>
  );
}
