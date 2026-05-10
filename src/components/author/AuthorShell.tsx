import { getCurrentAuthor } from "@/lib/mockAuthorApi";
import AuthorMobileBlock from "./AuthorMobileBlock";
import AuthorSidebar from "./AuthorSidebar";
import AuthorTopNav from "./AuthorTopNav";

type AuthorShellProps = {
  children: React.ReactNode;
};

export default function AuthorShell({ children }: AuthorShellProps) {
  const author = getCurrentAuthor();
  return (
    <>
      <style>{`
        .a-shell { min-height: 100vh; background: var(--da-dark); }

        /* Mobile: nur Block sichtbar */
        .a-shell__mobile { display: block; }
        .a-shell__tablet { display: none; }
        .a-shell__desktop { display: none; }

        /* Tablet: TopNav + Main, ohne Sidebar */
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

        /* Desktop: Sidebar + Main mit margin */
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
        {/* Smartphone < 768px */}
        <div className="a-shell__mobile">
          <AuthorMobileBlock />
        </div>

        {/* Tablet 768-1024px */}
        <div className="a-shell__tablet">
          <AuthorTopNav author={author} />
          <main className="a-shell__tablet-main">{children}</main>
        </div>

        {/* Desktop ≥ 1024px */}
        <div className="a-shell__desktop">
          <AuthorSidebar author={author} />
          <main className="a-shell__desktop-main">{children}</main>
        </div>
      </div>
    </>
  );
}
