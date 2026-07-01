# 관리자 분석 카운팅 기준 통합 Plan

작성일: 2026-07-02

## 현재 목표

관리자 분석 페이지에서 `명`과 `회`가 서로 다른 기준으로 계산되어 생기는 불일치를 줄이고, 운영자가 실제로 판단하기 좋은 구조로 압축한다.

완료 조건:
- 유입 요약/차트에서 `직접 방문 11명(7회)`처럼 `명 > 회`가 되는 표시를 없앤다.
- 비회원은 같은 기기/브라우저/localStorage 유지 시 같은 `session_key`로 집계된다는 기준을 문서와 화면 계산에 맞춘다.
- 관리자/로컬 카운팅 제외 기준은 유지한다.
- 분석 탭 구조를 `요약 / 방문자 / 유입·페이지 / 행동` 중심으로 정리할 수 있는 기반을 만든다.

## 읽은 파일

- `docs/PROJECT_STRUCTURE.md` §6, §6-1
- `docs/PROJECT_STATE.md` §0, 방문자 통계/알려진 제한사항/변경 이력
- `docs/db-schema.md` `page_views`, `page_sessions`, `page_events`, `anon_sessions`
- `docs/js-api.md` `trackPageView`, `trackEvent`, `startSession`, `getPageAnalytics`
- `docs/ls-schema.md` `cottage_session_id`, `cottage_visited_{date}`, `cottage_pv_{date}_{source}_{page}`, `cottage_is_admin`

## 원인 가설

현재 분석 화면은 방문 관련 지표를 두 장부에서 섞어 읽는다.

- `page_views.__visitor__`: 하루 1회 방문자 마커. 현재 `page_views`에는 `session_key`가 없어 비회원 고유 식별이 약하다.
- `page_sessions`: 페이지 체류/이탈 기록. `session_key`가 있어 비회원 식별은 가능하지만, 페이지를 떠나거나 heartbeat가 동작해야 쌓인다.

그 결과 유입 카드/차트에서:
- `회`는 `__visitor__` 마커 수
- `명`은 `page_sessions.user_id || page_sessions.session_key` 고유값

처럼 계산되어 `11명(7회)` 같은 역전이 생길 수 있다.

## 변경할 대상

1. DB 스키마
   - 기존 `page_views` 테이블 확장: `session_key text nullable` 추가
   - 신규 테이블 없음
   - 이유: `__visitor__` 방문자 마커 한 행만으로도 회원/비회원 고유 방문자를 계산하기 위함

2. 추적 로직
   - `trackPageView(page, referrer, extra={})` 호출 시 `session_key`를 함께 저장
   - `__visitor__` 마커 extra에 `session_key` 포함
   - 기존 `cottage_session_id` localStorage 키 재사용, 신규 localStorage 키 없음

3. 관리자 분석 화면
   - 유입의 `명/회`를 `filteredVisitor(__visitor__)` 한 기준에서 계산
   - `명`: `user_id || session_key` 고유값
   - `회`: `__visitor__` 마커 행 수
   - `session_key`가 없는 과거 `__visitor__` 행은 행 단위 fallback으로 세어 `명 > 회`가 되지 않게 처리

4. 관리자 분석 구조
   - 이번 작업에서는 대규모 UI 리팩토링은 하지 않는다.
   - 우선 표시 기준을 맞춘 뒤, `요약 / 방문자 / 유입·페이지 / 행동` 재구성은 다음 작업 후보로 문서화한다.

## 새로 생성

- `docs/PLAN_admin_analytics_counting.md`
  - 세션 복원 비용이 높고 DB/API/관리자 화면이 같이 걸린 작업이라 체크포인트 역할로 생성한다.
- `docs/migrations/007_page_views_session_key.sql`
  - `page_views.session_key` 추가 SQL

## 영향 파일

- `assets/js/supabase-client.js`
  - `trackPageView`
  - `__visitor__` 마커 생성부
- `pages/admin/requests-admin.html`
  - `page_views` select 컬럼
  - 유입 요약 카드
  - 유입 차트
  - 유입×페이지 상세
  - 방문자 구성 도넛
- `docs/db-schema.md`
- `docs/js-api.md`
- `docs/ls-schema.md`
- `docs/PROJECT_STRUCTURE.md`
- `docs/PROJECT_STATE.md`

## 위험요소

- 실제 Supabase DB에 `page_views.session_key` 컬럼이 없으면, 코드만 먼저 배포했을 때 insert/select 에러가 날 수 있다.
- 과거 `page_views` 데이터에는 `session_key`가 없으므로 과거 일자 분석은 완전히 복원되지 않는다.
- `session_key`는 localStorage 기반이라 시크릿 모드, 브라우저 변경, 데이터 삭제, 다른 기기에서는 다른 방문자로 잡힌다.
- `page_views`에 `session_key`를 추가해도 개인정보는 아니지만, 같은 브라우저를 장기 식별하는 값이므로 관리자 화면 외 노출 금지 원칙을 유지한다.

## 첫 번째로 실패할 가능성이 높은 지점

Supabase 운영 DB에 `session_key` 컬럼이 아직 없는 상태에서 관리자 페이지가 `page_views.session_key`를 select하거나 insert하는 경우.

대응:
- SQL 마이그레이션 파일을 먼저 만들고, 실제 DB 적용 전까지는 배포 순서를 주의한다.
- 코드에서는 기존 `extra` 병합 구조를 유지해 호출 호환성을 깨지 않는다.

## 롤백 방법

- 코드 롤백: `trackPageView`의 `session_key` 저장과 관리자 화면의 `session_key` 기반 집계를 이전 커밋으로 되돌린다.
- DB 롤백: 필요 시 `alter table public.page_views drop column if exists session_key;`
- 데이터 삭제는 하지 않는다.

## 다음 작업 후보

1. [x] `page_views.session_key` 마이그레이션 작성 및 문서 반영
2. [x] 추적 로직에 `session_key` 저장 추가
3. [x] 관리자 분석 유입 `명/회` 계산 기준 통일
4. [ ] 실제 Supabase 운영 DB에 `docs/migrations/007_page_views_session_key.sql` 적용
5. [ ] 브라우저에서 관리자 분석 화면 수치/콘솔 확인
6. [ ] 관리자 분석 탭 구조 압축안 적용 여부 결정

## 이번 세션 적용 내용

- `docs/migrations/007_page_views_session_key.sql` 작성.
- `trackPageView()`가 기본적으로 `session_key`를 저장하도록 변경.
- 운영 DB에 아직 `session_key` 컬럼이 없어도 기존 방문 기록 insert/select가 깨지지 않도록 fallback 추가.
- 관리자 분석의 주요유입/유입 차트/유입×페이지 상세를 `__visitor__` 기준으로 통일.

## 확인 필요

- Supabase SQL Editor에서 `docs/migrations/007_page_views_session_key.sql` 적용.
- 적용 후 5500 관리자 페이지에서 직접 방문 표시가 `명 <= 회`로 나오는지 확인.
- 과거 NULL 행은 행 단위 fallback이라 과거 수치는 완전한 복원이 아니라 표시 안정화로 봐야 한다.
