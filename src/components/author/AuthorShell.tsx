import { getCurrentAuthor } from "@/lib/authorApi";
import AuthorMobileBlock from "./AuthorMobileBlock";
import AuthorSidebar from "./AuthorSidebar";
import AuthorTopNav from "./AuthorTopNav";
import type { AuthorChip } from "@/types/authorVM";

type AuthorShellProps = {
  children: React.ReactNode;
};

export default async function AuthorShell({ children }: AuthorShellProps) {
  const row = await getCurrentAuthor();
  const author: AuthorChip = {
    name: row?.display_name ?? "Unbekannt",
    avatar: row?.avatar_url ?? "",
    jobTitle: row?.job_title ?? undefined,
    userRole: row?.role ?? "external",
  };

  return (
    <>
      <style>{`
        .a-shell { min-height: 100vh; background: var(--da-dark); }

        .a-shell__mobile { display: block; }
        .a-shell__tablet { display: none; }
        .a-shell__desktop { display: none; }

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
          <AuthorMobileBlock />
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
