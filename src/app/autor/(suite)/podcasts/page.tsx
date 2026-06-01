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
  // Embed-Shape gespiegelt aus podcastApi.PodcastWithRecommender.recommended_by
  // (Pick<AuthorRow, ...>) — wird für die optimistische UI nach Create
  // benötigt, damit "Empfohlen von" ohne Reload sofort befüllt ist.
  const myAuthorEmbed = me
    ? {
        id: me.id,
        display_name: me.display_name,
        slug: me.slug,
        handle: me.handle,
        avatar_url: me.avatar_url,
      }
    : null;

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
        myAuthorEmbed={myAuthorEmbed}
      />
    </>
  );
}
