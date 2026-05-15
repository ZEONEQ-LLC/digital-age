"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { unsubscribeByToken } from "@/lib/newsletter/unsubscribePublic";

export default function UnsubscribeConfirmButton({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await unsubscribeByToken(token);
      router.push("/newsletter/abgemeldet");
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      style={{
        backgroundColor: "var(--da-green)",
        color: "var(--da-dark)",
        padding: "12px 24px",
        borderRadius: "4px",
        border: "none",
        fontSize: "14px",
        fontWeight: 700,
        cursor: pending ? "wait" : "pointer",
        opacity: pending ? 0.7 : 1,
      }}
    >
      {pending ? "Wird abgemeldet…" : "Ja, abmelden"}
    </button>
  );
}
