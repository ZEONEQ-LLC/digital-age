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

        .a-shell__mobile { display: block; }
        .a-shell__tablet { display: none; }
        .a-shell__desktop { display: none; }
        .a-shell__mobile-main {
          padding: 20px 16px 56px;
          animation: da-fadein var(--t-slow) ease;
        }

        @media (min-width: 768px) {
          .a-shell__mobile { display: none; }
          .a-shell__tablet { display: block; }
        }
        .a-shell__tablet-main {
          padding: 24px 20px 64px;
          max-width: var(--max-dash);
          margin: 0 auto;
          animation: da-fadein var(--t-slow) ease;
        }

        @media (min-width: 1024px) {
          .a-shell__tablet { display: none; }
          .a-shell__desktop { display: block; }
        }
        .a-shell__desktop-main {
          margin-left: var(--sidebar-w);
          padding: 32px 40px 80px;
          max-width: var(--max-dash);
          animation: da-fadein var(--t-slow) ease;
        }
      `}</style>
      <div className="a-shell">
        <div className="a-shell__mobile">
          {mobile === "allow" ? (
            <>
              <AuthorMobileBar author={author} />
              <main className="a-shell__mobile-main">{children}</main>
            </>
          ) : (
            <AuthorMobileBlock />
          )}
        </div>

        <div className="a-shell__tablet">
          <AuthorTopNav author={author} />
          <main className="a-shell__tablet-main">{children}</main>
        </div>

        <div className="a-shell__desktop">
          <AuthorSidebar author={author} />
          <main className="a-shell__desktop-main">{children}</main>
        </div>
      </div>
    </>
  );
}
