-- 방문자 통계: 봇 트래픽 제외 + 회원/비회원 구분 트래킹
-- 실행 조건: 없음 (page_views 기존 테이블 확장)
-- IF NOT EXISTS 보장 → 재실행 안전
--
-- 배경: 2026-06-30 방문자 40명 집계 이상 현상 조사 결과, 36건이 referrer 없음 +
-- 매번 다른 세션으로 사이트 주요 페이지를 순회하는 패턴 — 봇/크롤러 트래픽으로 추정.
-- page_views에는 이를 걸러낼 신호(user-agent, 회원 여부)가 전혀 없어 컬럼을 추가한다.
--
-- 과거 데이터는 소급 보정하지 않는다 — 기존 행은 is_bot=false(기본값)/user_id=NULL로
-- 채워지며(전부 "비회원"으로 잡힘), 신규로 쌓이는 데이터부터 정확한 분류가 적용된다.
-- 봇 판별은 navigator.userAgent의 알려진 크롤러 패턴 매칭 수준("알려진 봇만 제외").

ALTER TABLE public.page_views ADD COLUMN IF NOT EXISTS is_bot BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.page_views ADD COLUMN IF NOT EXISTS user_id TEXT;

-- __visitor__ 마커 집계 쿼리(관리자 요약 카드: 전체/회원/비회원/봇)용 인덱스
CREATE INDEX IF NOT EXISTS page_views_visitor_marker_idx
  ON public.page_views (created_at, is_bot, user_id)
  WHERE page = '__visitor__';
