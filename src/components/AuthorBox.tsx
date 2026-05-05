type AuthorBoxProps = {
  name: string;
  slug: string;
  avatar: string;
  bio: string;
  role?: string;
};

export default function AuthorBox({ name, slug, avatar, bio, role }: AuthorBoxProps) {
  return (
    <div style={{ display: "flex", gap: "20px", alignItems: "flex-start", backgroundColor: "var(--da-card)", border: "1px solid var(--da-border)", borderRadius: "8px", padding: "24px", margin: "48px 0" }}>
      <img src={avatar} alt={name} style={{ width: "72px", height: "72px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
      <div>
        <p style={{ color: "var(--da-green)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "4px" }}>Autor</p>
        <a href={`/autor/${slug}`} style={{ color: "var(--da-text)", fontSize: "20px", fontWeight: 600, textDecoration: "none", display: "block", marginBottom: "4px" }}>{name}</a>
        {role && <p style={{ color: "var(--da-muted)", fontSize: "13px", marginBottom: "12px" }}>{role}</p>}
        <p style={{ color: "var(--da-muted)", fontSize: "14px", lineHeight: 1.6 }}>{bio}</p>
      </div>
    </div>
  );
}
