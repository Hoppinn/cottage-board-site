-- 019_game_overrides.sql
-- 게임정리(사진) + 룰설명(텍스트)을 관리자 페이지에서 배포 없이 입력할 수 있게 한다.
--
-- 배경: game-sheet.js의 _ORGANIZER_GAMES는 { 게임명: 사진장수 } 하드코딩 + 고정 경로
--       파일이었다(사진 추가 = 배포 필요). 현재 빈 객체({})라 이관할 기존 데이터는 없다.
--       룰설명은 신규 개념 — 기존 룰영상(detail.youtubeUrl)과는 무관, 그대로 둔다.
--
-- game_key는 window.COTTAGE_GAMES[].id(= slugifyKorean(ownedName))를 그대로 쓴다.
-- game_likes.game_id/game_curious.game_id와 동일한 값이라 변환이 필요 없다(db-schema.md).

CREATE TABLE IF NOT EXISTS public.game_overrides (
  game_key             TEXT PRIMARY KEY,
  organizer_photo_urls TEXT[] NOT NULL DEFAULT '{}',
  rule_note            TEXT,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.game_overrides DISABLE ROW LEVEL SECURITY;

-- ── Storage: organizer-photos 버킷 + RLS (supabase-setup.sql의 play-photos 패턴 복제) ──
INSERT INTO storage.buckets (id, name, public)
VALUES ('organizer-photos', 'organizer-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "anon_insert_organizer_photos" ON storage.objects;
CREATE POLICY "anon_insert_organizer_photos"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'organizer-photos');

DROP POLICY IF EXISTS "public_select_organizer_photos" ON storage.objects;
CREATE POLICY "public_select_organizer_photos"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'organizer-photos');

DROP POLICY IF EXISTS "anon_delete_organizer_photos" ON storage.objects;
CREATE POLICY "anon_delete_organizer_photos"
  ON storage.objects FOR DELETE TO anon
  USING (bucket_id = 'organizer-photos');
