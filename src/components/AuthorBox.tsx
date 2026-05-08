import Image from "next/image";
import Link from "next/link";
import ExternalBadge from "./ExternalBadge";

type AuthorBoxProps = {
  name: string;
  slug: string;
  avatar: string;
  bio: string;
  role?: string;
  external?: boolean;
};

export default function AuthorBox({ name, slug, avatar, bio, role, external = false }: AuthorBoxProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: "var(--sp-5)",
        alignItems: "flex-start",
        background: "var(--da-card)",
        border: `1px solid ${external ? "var(--da-orange)" : "var(--da-border)"}`,
        borderRadius: "var(--r-lg)",
        padding: "var(--sp-7)",
        margin: "var(--sp-12) 0",
      }}
    >
      <div style={{ position: "relative", width: 72, height: 72, flexShrink: 0, borderRadius: "50%", overflow: "hidden" }}>
        <Image src={avatar} alt={name} fill sizes="72px" style={{ objectFit: "cover" }} />
      </div>
      <div>
        <p
          style={{
            color: external ? "var(--da-orange)" : "var(--da-green)",
            fontFamily: "var(--da-font-mono)",
            fontSize: "var(--fs-caption)",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: "4px",
          }}
        >
          {external ? "Gastautor" : "Autor"}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: role ? 3 : 10, flexWrap: "wrap" }}>
          <Link
            href={`/autor/${slug}`}
            style={{
              color: "var(--da-text)",
              fontFamily: "var(--da-font-display)",
              fontSize: "19px",
              fontWeight: 700,
            }}
          >
            {name}
          </Link>
          {external && <ExternalBadge size="sm" label="External Contributor" />}
        </div>
        {role && (
          <p style={{ color: "var(--da-muted)", fontSize: "var(--fs-body-sm)", marginBottom: 10 }}>{role}</p>
        )}
        <p style={{ color: "var(--da-muted)", fontSize: "var(--fs-body)", lineHeight: 1.65 }}>{bio}</p>
      </div>
    </div>
  );
}
