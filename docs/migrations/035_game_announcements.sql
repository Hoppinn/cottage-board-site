-- 게임 공지(새 게임·도착) — 회원 종 알림 소스.
-- 게임 관리 GUI의 「사이트에 올리기」가 push 성공 뒤에만 INSERT한다(game-system/admin-gui/publish.js).
-- 받는 사람은 new_game(game_requests.added_at)과 같이 로그인 회원 전체.
-- 운영 적용: 2026-10-23 사용자가 SQL 편집기에서 실행. 정의는 계획 문서
-- (docs/superpowers/plans/2026-10-23-game-admin-gui.md Task 6)의 것이며, 컬럼 5개는 anon
-- REST select로 각각 200(없는 컬럼 대조군 400), 테이블은 count exact 200·*/0으로 확인했다.
-- ⚠️ 실행한 SQL 원문은 저장되지 않았다 — 아래 정책 이름은 실행본과 다를 수 있다(재구축 시 무해).
-- RLS: 이 프로젝트 기본(DISABLE)과 달리 켠다 — 회원 브라우저가 anon 키로 지우거나 고치지
-- 못하게 하려는 것. 정책은 SELECT·INSERT만, 대상은 anon(이 프로젝트엔 authenticated 역할이 없다).

CREATE TABLE IF NOT EXISTS game_announcements (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kind           text NOT NULL CHECK (kind IN ('new', 'arrived')),
  game_names     text[] NOT NULL,
  location_label text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE game_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY game_announcements_select ON game_announcements
  FOR SELECT TO anon USING (true);

CREATE POLICY game_announcements_insert ON game_announcements
  FOR INSERT TO anon WITH CHECK (true);
