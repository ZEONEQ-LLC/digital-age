import Image from "next/image";
import type { Block } from "@/types/author";

type BlockReaderProps = {
  blocks: Block[];
};

export default function BlockReader({ blocks }: BlockReaderProps) {
  return (
    <>
      {blocks.map((b) => {
        switch (b.type) {
          case "heading":
            return b.level === 2 ? (
              <h2 key={b.id} id={b.id} style={{ scrollMarginTop: "calc(var(--nav-h) + 80px)" }}>
                {b.content}
              </h2>
            ) : (
              <h3 key={b.id} id={b.id} style={{ scrollMarginTop: "calc(var(--nav-h) + 80px)" }}>
                {b.content}
              </h3>
            );
          case "paragraph":
            return <p key={b.id}>{b.content}</p>;
          case "quote":
            return (
              <blockquote key={b.id}>
                <span>{b.content}</span>
                {b.attribution && (
                  <footer style={{ display: "block", marginTop: 12, color: "var(--da-muted)", fontStyle: "normal", fontSize: 14 }}>
                    — {b.attribution}
                  </footer>
                )}
              </blockquote>
            );
          case "list":
            return b.ordered ? (
              <ol key={b.id}>
                {b.items.map((it, i) => (
                  <li key={i}>{it}</li>
                ))}
              </ol>
            ) : (
              <ul key={b.id}>
                {b.items.map((it, i) => (
                  <li key={i}>{it}</li>
                ))}
              </ul>
            );
          case "code":
            return (
              <pre key={b.id} style={{ background: "var(--da-card)", border: "1px solid var(--da-border)", borderRadius: 6, padding: "16px 18px", overflow: "auto" }}>
                <code style={{ fontFamily: "var(--da-font-mono)", fontSize: 14, color: "var(--da-green)", background: "transparent", padding: 0 }}>
                  {b.content}
                </code>
              </pre>
            );
          case "image":
            return (
              <figure key={b.id} style={{ margin: "32px 0" }}>
                <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", borderRadius: 8, overflow: "hidden" }}>
                  <Image src={b.src} alt={b.alt} fill sizes="(max-width: 860px) 100vw, 860px" style={{ objectFit: "cover" }} unoptimized />
                </div>
                {b.caption && (
                  <figcaption style={{ marginTop: 10, color: "var(--da-muted)", fontSize: 13, textAlign: "center" }}>
                    {b.caption}
                  </figcaption>
                )}
              </figure>
            );
        }
      })}
    </>
  );
}
