import { getCurrentAuthor } from "@/lib/mockAuthorApi";
import AuthorSidebar from "./AuthorSidebar";

type AuthorShellProps = {
  children: React.ReactNode;
};

export default function AuthorShell({ children }: AuthorShellProps) {
  const author = getCurrentAuthor();
  return (
    <>
      <style>{`
        .a-shell {
          min-height: 100vh;
          background: var(--da-dark);
        }
        .a-shell__main {
          margin-left: var(--sidebar-w);
          padding: 32px 40px 80px;
          max-width: var(--max-dash);
          animation: da-fadein var(--t-slow) ease;
        }
        @media (max-width: 1024px) {
          .a-shell__main { margin-left: 0; padding: 24px 20px 64px; }
        }
      `}</style>
      <div className="a-shell">
        <AuthorSidebar author={author} />
        <main className="a-shell__main">{children}</main>
      </div>
    </>
  );
}
