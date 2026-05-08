type MonoCaptionProps = {
  children: React.ReactNode;
  color?: string;
};

export default function MonoCaption({ children, color = "var(--da-faint)" }: MonoCaptionProps) {
  return (
    <p
      style={{
        color,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        fontFamily: "var(--da-font-mono)",
        marginBottom: 12,
      }}
    >
      {children}
    </p>
  );
}
