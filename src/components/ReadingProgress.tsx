"use client";
import { useEffect, useState } from "react";

export default function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const total = el.scrollHeight - el.clientHeight;
      setProgress(total > 0 ? (el.scrollTop / total) * 100 : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: "var(--nav-h)",
        left: 0,
        right: 0,
        zIndex: 180,
        height: "3px",
        background: "var(--da-card)",
      }}
      aria-hidden
    >
      <div
        style={{
          height: "100%",
          background: "var(--da-green)",
          width: `${progress}%`,
          transition: "width 0.1s linear",
        }}
      />
    </div>
  );
}
