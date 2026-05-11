import { redirect } from "next/navigation";
import PageTitle from "@/components/author/PageTitle";
import ProfileEditor from "@/components/author/ProfileEditor";
import { getCurrentAuthor } from "@/lib/authorApi";

export default async function ProfilePage() {
  const me = await getCurrentAuthor();
  if (!me) redirect("/login");

  return (
    <>
      <PageTitle
        title="Profil"
        subtitle={me.handle ? `@${me.handle} · digital-age.ch/autor/${me.handle}` : `${me.email}`}
      />
      <ProfileEditor initial={me} />
    </>
  );
}
