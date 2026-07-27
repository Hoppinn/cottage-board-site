-- 017_meeting_votes_half_hour.sql
-- 모임 가능 시간 등록을 30분 단위로 지원한다.
--
-- 배경: time_start/time_end가 integer(시 단위, 9~23)라 정시로만 등록 가능했다.
--       numeric(4,1)로 바꿔 9.5(=9시30분) 같은 값을 담는다. 기존 정수값(9, 22 등)은
--       암묵 캐스팅되어 데이터 손실 없음. 소비하는 JS(getMeetingVotes/upsertMeetingVote)는
--       값을 그대로 패스스루하므로 이 컬럼 타입만 바뀌면 자동으로 소수를 실어 나른다.

alter table public.meeting_votes
  alter column time_start type numeric(4,1),
  alter column time_end   type numeric(4,1);

-- RLS: 컬럼 타입 변경이라 정책에 영향 없음(014·015·016과 동일 판단).
