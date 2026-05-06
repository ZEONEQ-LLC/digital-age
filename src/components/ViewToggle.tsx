"use client";

export type ViewMode = "grid" | "list";

type ViewToggleProps = {
  value: ViewMode;
  onChange: (next: ViewMode) => void;
  accent?: string;
};

export default function ViewToggle({ value, onChange, accent = "var(--da-green)" }: ViewToggleProps) {
  const options: Array<{ value: ViewMode; icon: string; label: string }> = [
    { value: "grid", icon: "⊞", label: "Grid-Ansicht" },
    { value: "list", icon: "≡", label: "Listen-Ansicht" },
  ];
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {options.map(({ value: v, icon, label }) => {
        const active = v === value;
        return (
          <button
            key={v}
            type="button"
            aria-label={label}
            aria-pressed={active}
            onClick={() => onChange(v)}
            style={{
              background: active ? accent : "transparent",
              color: active ? "var(--da-dark)" : "var(--da-muted)",
              border: `1px solid ${active ? accent : "var(--da-border)"}`,
              borderRadius: "var(--r-sm)",
              width: 32,
              height: 32,
              cursor: "pointer",
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background var(--t-fast), color var(--t-fast), border-color var(--t-fast)",
            }}
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}
