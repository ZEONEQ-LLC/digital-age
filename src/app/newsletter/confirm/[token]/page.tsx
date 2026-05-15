import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { sendWelcomeMail } from "@/lib/newsletter/mail";

type PageProps = { params: Promise<{ token: string }> };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Public-Confirmation-Route. Idempotent: zweimaliger Klick auf den Link
// triggert keinen zweiten Welcome-Mail-Versand. Service-Role bypassed RLS;
// die einzige öffentliche Operation ist Token-Lookup → Status-Update.
export default async function Page({ params }: PageProps) {
  const { token } = await params;

  if (!UUID_RE.test(token)) {
    redirect("/newsletter/abgelaufen");
  }

  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    redirect("/newsletter/abgelaufen");
  }

  const { data: sub } = await supabase
    .from("newsletter_subscribers")
    .select(
      "id, email, status, confirmation_expires_at, confirmation_token",
    )
    .eq("confirmation_token", token)
    .maybeSingle();

  if (!sub) {
    redirect("/newsletter/abgelaufen");
  }

  if (sub.status === "confirmed") {
    redirect("/newsletter/bestaetigt");
  }
  if (sub.status === "unsubscribed") {
    redirect("/newsletter/abgelaufen");
  }
  if (new Date(sub.confirmation_expires_at).getTime() < Date.now()) {
    redirect("/newsletter/abgelaufen");
  }

  const { error: updateError } = await supabase
    .from("newsletter_subscribers")
    .update({
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", sub.id)
    .eq("status", "pending"); // Schutz vor Race: nur wenn noch pending

  if (updateError) {
    redirect("/newsletter/abgelaufen");
  }

  // Welcome-Mail fire-and-forget. Failure ist nicht-kritisch — User sieht
  // trotzdem die bestätigt-Seite.
  await sendWelcomeMail({ email: sub.email, token });

  redirect("/newsletter/bestaetigt");
}
