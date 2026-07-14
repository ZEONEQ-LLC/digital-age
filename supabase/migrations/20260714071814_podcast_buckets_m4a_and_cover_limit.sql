-- Follow-up zu den Podcast-Buckets (PR #148).
--
-- (1) M4A-Support fuer podcast-audio: audio/x-m4a zur MIME-Whitelist. (mp4
--     und aac waren schon drin; verschiedene Browser melden M4A mal als
--     audio/mp4, mal audio/x-m4a, mal audio/aac.)
--
-- (2) podcast-covers file_size_limit von 2 MB auf 5 MB. Der bisherige Wert
--     war byte-korrekt (2097152 = 2 MB, KEIN Einheiten-Bug), aber zu knapp:
--     canvas.toBlob("image/webp") faellt auf Browsern ohne WebP-Encode
--     (aeltere Safari) still auf PNG zurueck, und ein 1400x1400-PNG sprengt
--     2 MB. Client-seitig wird jetzt zusaetzlich JPEG als Fallback erzeugt;
--     5 MB gibt trotzdem Headroom. Die eigentliche Kontrolle (Quelle <= 2 MB,
--     Crop 1400x1400, Re-Encode) passiert im Client.
--
-- podcast-audio file_size_limit (200 MB) ist byte-korrekt und bleibt. Achtung:
-- das projektweite Storage-Upload-Limit (Dashboard, oft 50 MB Default) cappt
-- Bucket-Limits daruber — bei Audio > 50 MB dort anheben (nicht per Migration
-- moeglich).

update storage.buckets
set allowed_mime_types = array['audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/x-m4a', 'audio/wav']
where id = 'podcast-audio';

update storage.buckets
set file_size_limit = 5242880 -- 5 MB
where id = 'podcast-covers';

-- Rollback:
-- update storage.buckets set file_size_limit = 2097152 where id = 'podcast-covers';
-- update storage.buckets
--   set allowed_mime_types = array['audio/mpeg','audio/mp4','audio/aac','audio/wav']
--   where id = 'podcast-audio';
