// Geteilte Konstanten fuer die Kopplung "Anhoeren-Button -> Podcast-Player"
// auf der Artikelseite. Der ANHOEREN-Button (ListenButton) scrollt zur Box
// mit dieser id und feuert dieses Window-Event; der erste self-hosted
// PodcastPlayer lauscht darauf und startet die Wiedergabe. Rein string-
// basierte Naht, damit weder Button noch Player podcast-spezifisch werden.
export const ARTICLE_PODCAST_ANCHOR = "podcast-zum-beitrag";
export const ARTICLE_PODCAST_PLAY_EVENT = "da:play-article-podcast";
