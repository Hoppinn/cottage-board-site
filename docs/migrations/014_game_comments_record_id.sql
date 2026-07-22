-- 014_game_comments_record_id.sql
-- 한 플레이기록(game_play_records)에 여러 사람의 게임평을 달 수 있게 한다.
--
-- 배경: 지금까지 "기록에 달린 게임평" = game_play_records.review_text 하나뿐이라
--       기록 주인의 후기만 표시됐다. game_comments(게임 단위 독립 게임평)에
--       nullable record_id를 붙여, 특정 기록에 매인 게임평을 표현한다.
--       record_id IS NULL 이면 종전과 동일한 "게임 단위 독립 게임평"이다(하위호환).
--
-- record_id는 game_play_records.id(uuid)를 가리키지만 이 프로젝트의 느슨한 결합
-- 관례에 맞춰 FK 제약은 걸지 않는다(text로 저장, 기록 삭제 시 고아가 되면
-- 조회에서 매칭이 안 돼 자연히 독립 게임평처럼 게임시트에만 남는다).

alter table public.game_comments
  add column if not exists record_id text;

create index if not exists game_comments_record_id_idx
  on public.game_comments (record_id);

-- RLS: game_comments는 이미 RLS ENABLED + anon 4정책(insert/select/update/delete).
--      컬럼 추가는 정책에 영향 없음. 새 컬럼도 anon이 그대로 읽고 쓴다.
