import PageTitle from "@/components/author/PageTitle";
import PodcastsManager from "@/components/author/PodcastsManager";
import { getCurrentAuthor } from "@/lib/authorApi";
import { getMyPodcasts } from "@/lib/podcastApi";

export default async function AutorPodcastsPage() {
  const [me, podcasts] = await Promise.all([
    getCurrentAuthor(),
    getMyPodcasts(),
  ]);

  const isEditor = me?.role === "editor";
  const myAuthorId = me?.id ?? null;

  return (
    <>
      <PageTitle
        title="Podcasts"
        subtitle="Empfehlungen aus der Redaktion und unseren Autoren — alle laufen auf /podcasts."
      />
      <PodcastsManager
        initialPodcasts={podcasts}
        isEditor={isEditor}
        myAuthorId={myAuthorId}
      />
    </>
  );
}
