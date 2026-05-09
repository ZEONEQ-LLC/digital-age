"use client";

import Image from "next/image";
import AuthorLine from "./AuthorLine";

type ArticleCardProps = {
  category: string;
  title: string;
  author: string;
  date: string;
  image: string;
  href?: string;
  featured?: boolean;
  external?: boolean;
};

export default function ArticleCard({ category, title, author, date, image, href = "#", featured = false, external = false }: ArticleCardProps) {
  return (
    <a href={href} style={{ textDecoration: "none", display: "block" }}>
      <div style={{
        backgroundColor: "var(--da-card)",
        borderRadius: "8px",
        overflow: "hidden",
        border: "1px solid var(--da-border)",
        transition: "border-color 0.2s, transform 0.2s",
        height: "100%",
        cursor: "pointer"
      }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--da-green)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--da-border)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
      >
        <div style={{ position: "relative", width: "100%", paddingTop: featured ? "56%" : "52%", overflow: "hidden" }}>
          <Image src={image} alt={title} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" style={{ objectFit: "cover" }} />
          <span style={{ position: "absolute", top: "12px", left: "12px", backgroundColor: "var(--da-green)", color: "var(--da-dark)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", padding: "4px 10px", borderRadius: "4px", zIndex: 1 }}>
            {category}
          </span>
        </div>
        <div style={{ padding: "20px" }}>
          <h3 style={{ color: "var(--da-text)", fontSize: featured ? "20px" : "16px", fontWeight: 600, lineHeight: 1.4, marginBottom: "12px" }}>{title}</h3>
          <div style={{ color: "var(--da-muted)", fontSize: "12px" }}>
            <AuthorLine name={author} external={external} date={date} />
          </div>
        </div>
      </div>
    </a>
  );
}
