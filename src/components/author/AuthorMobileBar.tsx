import Image from "next/image";
import Link from "next/link";
import type { AuthorChip } from "@/types/authorVM";

// Schmale Kopfzeile fuer Suite-Seiten, die auf dem Handy erlaubt sind
// (AuthorShell mobile="allow"). Keine Navigation: die uebrige Suite ist unter
// 768px gesperrt, Links dorthin wuerden nur auf den Sperrbildschirm fuehren.
export default function AuthorMobileBar({ author }: { author: AuthorChip }) {
  return (
    <>
      <style>{`
        .a-mb {
          position: sticky; top: 0; z-index: 30;
          display: flex; align-items: center; gap: 9px;
          padding: 12px 16px;
          background: var(--da-darker);
          border-bottom: 1px solid var(--da-border);
        }
        .a-mb__brand { display: flex; align-items: center; gap: 9px; text-decoration: none; }
        .a-mb__mark {
          width: 26px; height: 26px; background: var(--da-green); border-radius: 4px;
          display: flex; align-items: center; justify-content: center;
          color: var(--da-dark); font-weight: 700; font-size: 13px;
          font-family: var(--da-font-display);
        }
        .a-mb__name {
          color: var(--da-text); font-size: 14px; font-weight: 700;
          font-family: var(--da-font-display); letter-spacing: -0.01em;
        }
        .a-mb__tag {
          color: var(--da-green); font-size: 9px; font-family: var(--da-font-mono);
          font-weight: 700; letter-spacing: 0.1em;
          border: 1px solid var(--da-green); padding: 1px 5px; border-radius: 3px;
        }
        .a-mb__avatar {
          margin-left: auto; width: 30px; height: 30px; border-radius: 50%;
          object-fit: cover; display: block; flex: none;
        }
        .a-mb__avatar--empty {
          background: var(--da-card); color: var(--da-muted);
          display: flex; align-items: center; justify-content: center;
          font-weight: 600; font-size: 13px;
        }
      `}</style>
      <header className="a-mb">
        <Link href="/" className="a-mb__brand">
          <span className="a-mb__mark">d</span>
          <span className="a-mb__name">digital age</span>
          <span className="a-mb__tag">AUTOR</span>
        </Link>
        {author.avatar ? (
          <Image src={author.avatar} alt={author.name} width={30} height={30} className="a-mb__avatar" unoptimized />
        ) : (
          <div className="a-mb__avatar a-mb__avatar--empty" aria-hidden>{author.name.charAt(0).toUpperCase()}</div>
        )}
      </header>
    </>
  );
}
