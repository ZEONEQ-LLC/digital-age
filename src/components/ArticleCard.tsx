"use client";

type ArticleCardProps = {
  category: string;
  title: string;
  author: string;
  date: string;
  image: string;
  href?: string;
  featured?: boolean;
};

export default function ArticleCard({ category, title, author, date, image, href = "#", featured = false }: ArticleCardProps) {
  return (
    <a href={href} style={{ textDecoration: "none", display: "block" }}>
      <div style={{
        backgroundColor: "#2a2a2e",
        borderRadius: "8px",
        overflow: "hidden",
        border: "1px solid #3a3a3e",
        transition: "border-color 0.2s, transform 0.2s",
        height: "100%",
        cursor: "pointer"
      }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#32ff7e"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#3a3a3e"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
      >
        <div style={{ position: "relative", width: "100%", paddingTop: featured ? "56%" : "52%", overflow: "hidden" }}>
          <img src={image} alt={title} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          <span style={{ position: "absolute", top: "12px", left: "12px", backgroundColor: "#32ff7e", color: "#1c1c1e", fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", padding: "4px 10px", borderRadius: "4px" }}>
            {category}
          </span>
        </div>
        <div style={{ padding: "20px" }}>
          <h3 style={{ color: "#ffffff", fontSize: featured ? "20px" : "16px", fontWeight: 600, lineHeight: 1.4, marginBottom: "12px" }}>{title}</h3>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#b0b0b0", fontSize: "12px" }}>
            <span>{author}</span>
            <span style={{ color: "#3a3a3e" }}>•</span>
            <span>{date}</span>
          </div>
        </div>
      </div>
    </a>
  );
}
