# PROJECT_STATE — 코티지보드 현재 상태 보고서

최종 갱신: 2026-06-05 (10차)

---

## 1. 현재 완료 기능

### 핵심 기능
- [x] 카카오 OAuth 로그인/로그아웃
- [x] 닉네임 변경 (localStorage + DB 저장)
- [x] 프로필 사진 변경 (프리셋 20종 + 파일 업로드, localStorage + DB 저장, 다기기 복원)
- [x] 내 활동 패널 (플레이 기록, 코멘트, 모임 참석 통계)
- [x] 유저 차단/해제 (어드민)

### 게임 기록
- [x] 신규 기록 등록 (다중 게임 행, 날짜/그룹명/참여자/인원/시간/점수/후기)
- [x] 사진 다중 업로드 (최대 5장, JSON 배열 저장, 1200px/JPEG 0.85 리사이즈)
- [x] 사진 개별 삭제 (등록 전 미리보기에서 X 버튼)
- [x] 기존 기록 수정 (인라인 수정폼)
- [x] 수정폼 다중 사진 표시 + 개별 삭제 + 신규 추가
- [x] 기록 삭제
- [x] 모임별 보기 (3단 계층: 그룹 > 날짜 > 게임)
- [x] 게임별 보기 (게임 > 모임/인원 > 날짜)
- [x] 단일 게임 플레이 기록 조회 (?game= 파라미터)
- [x] 그룹명 자동완성 (등록폼)
- [x] 게임명 자동완성 (등록폼, 수정폼)
- [x] 참여자 이름 자동완성 (등록폼 + 수정폼)
- [x] 사진 썸네일 표시 (80px, 가로 스크롤, 최대 3장 + +N장 배지, 라이트박스 연동)

### 게임 목록 / 바텀시트
- [x] 전체 게임 목록 (필터: 인원 1인~9인+, 난이도, 분위기, 키워드)
- [x] 게임 바텀시트 (별점, 코멘트, 따봉/비추, 플레이 기록)
- [x] 별점 제출/조회 (로그인 시 user_id 기반, 비로그인 시 세션키 기반 중복 방지)
- [x] 코멘트 등록/삭제/수정 (삭제 권한: 로그인 시 user_id 기반, 비로그인 시 localStorage)
- [x] 따봉/비추 토글
- [x] 추천 게임 인원 필터 (1~4인 정확 매칭, 단체 5인+, 개별 5~9인+, weight 상한 예외 처리)
- [x] 9인+ 필터 — bestPlayers.some(p >= 9), 머더미스터리 weight 예외

### 어드민
- [x] 게임/간식 요청 관리 (계획/완료 처리)
- [x] 건의사항 관리
- [x] 회원 목록 및 차단
- [x] 페이지 분석 대시보드

### 인프라
- [x] 방문자 통계 (페이지뷰, 하루 1회 카운트)
- [x] 체류 시간 누적 (localStorage → DB, 성공 시에만 삭제)
- [x] 닉네임 덮어쓰기 방지 (auth-callback DB 조회 + upsertProfile 보호)
- [x] 구형 localStorage 포맷 마이그레이션 (cottage_played_ → cottage_play_records_)
- [x] sitemap.xml / robots.txt 경로 현행화 (pages/game/, info/, club/, admin/)
- [x] 업로드 전 이미지 리사이즈 (window.resizeImageFile, 1200px, JPEG 0.85)

---

## 2. 현재 버그

### 상 (데이터 손상 위험)

| ID | 위치 | 설명 |
|----|------|------|
| ~~B-02~~ | ~~game-reviews.html~~ | ~~`photo_url = null` 전체 삭제~~ → **parsePhotoUrls + updateGamePlay로 개별 URL 삭제 완료** |
| ~~B-03~~ | ~~supabase-client.js~~ | ~~59초 이하 폐기~~ → **초단위 누적 + 분변환 완료** |

### 중 (기능 결함)

| ID | 위치 | 설명 |
|----|------|------|
| ~~B-04~~ | ~~game-reviews.html~~ | ~~참여자 자동완성이 수정폼에만 있고 등록폼에는 없음~~ → **수정 완료** |
| ~~B-05~~ | ~~kakao-auth.js~~ | ~~프로필 사진 localStorage만~~ → **DB 저장 + 다기기 복원 완료** |
| ~~B-06~~ | ~~supabase-client.js~~ | ~~이용시간 DB 반영 다음날 첫 방문 때만~~ → **_syncTimeToDBNow로 visibilitychange/beforeunload 즉시 반영 완료** |
| ~~B-10~~ | ~~requests-admin.html~~ | ~~kakao-auth-ready 이벤트 수신 — kakao-auth.js는 cottage-auth-changed 발행~~ → **이벤트명 통일 완료** |
| ~~B-11~~ | ~~supabase-client.js~~ | ~~_syncTimeToDBNow update 사용 — 프로필 row 없을 때 조용히 실패 + localStorage 제거~~ → **upsert로 교체 완료** |
| ~~B-12~~ | ~~supabase-client.js~~ | ~~updateProfilePhoto upsert — row 없을 때 INSERT로 기존 필드 null 덮어쓰기~~ → **update로 교체 완료** |
| ~~B-07~~ | ~~kakao-auth.js~~ | ~~방문 카운트 기기별 독립~~ → **로컬 카운터 소스, DB 동기화로 전환. 기기별 독립은 유지되나 DB SELECT null이어도 정확한 값 보존** |
| ~~B-13~~ | ~~game-reviews.html 수정폼~~ | ~~입력 필드 id/name 없음~~ → **레코드 id suffix로 label for + input id/name 추가 완료** |

### 하 (UX 불편)

| ID | 위치 | 설명 |
|----|------|------|
| ~~B-08~~ | ~~game-reviews.html~~ | ~~모바일 소프트키보드 "다음"으로 포커스 이탈~~ → **blur 시 값 있으면 re-focus 완료** |
| ~~B-09~~ | ~~game-reviews.html~~ | ~~수정폼 게임명 자동완성 화살표 키 없음~~ → **attachAc 통합으로 이미 해결** |

---

## 3. 중복 구현

| ID | 항목 | 현황 |
|----|------|------|
| ~~D-01~~ | ~~그룹명 자동완성~~ | ~~등록폼 IIFE / 수정폼 attachAc 이원화~~ → **공용 attachAc로 통합 완료** |
| ~~D-02~~ | ~~게임명 자동완성~~ | ~~등록폼 커스텀 / 수정폼 attachAc 이원화~~ → **공용 attachAc로 통합 완료** |
| ~~D-03~~ | ~~사진 업로드 로직~~ | ~~addPhotoItem / addPieNewItem 2벌~~ → **buildPhotoItemAdder 공통 함수로 통합 완료** |
| ~~D-04~~ | ~~참여자 입력 방식~~ | ~~등록폼 태그칩 / 수정폼 plain input 이원화~~ → **initTagInput 공용화, 수정폼도 태그칩으로 통일 완료** |
| ~~D-05~~ | ~~`getDb()` vs `window.CottageDB`~~ | ~~직접 DB 쿼리 혼용~~ → **getAllPlayRecordsForHub 추가, getDb() 제거 완료** |
| ~~D-06~~ | ~~`escH()` 함수~~ | ~~game-reviews.html / kakao-auth.js 각 독립 정의~~ → **supabase-client.js에 window.escH 전역 통합 완료** |
| ~~D-07~~ | ~~`pie-photo-trigger` vs `pr-photo-trigger` CSS~~ | ~~동일 스타일 두 클래스로 분리~~ → **pr-photo-trigger 단일화 완료** |
| ~~D-08~~ | ~~사진 컴포넌트~~ | ~~`buildPhotoHtml` (game-reviews.html) / club-history.html 인라인 생성 이원화~~ → **buildPhotoHtml + pr-rec-photo-* 클래스로 통일 완료** |

---

## 4. 위험한 데이터 흐름

### 4-1. 닉네임 손상 체인 (다기기 / localStorage 초기화 시)

```
현재 보호 상태:
  → auth-callback: DB 닉네임 조회 fallback 추가됨 (2026-06-04 패치)
  → upsertProfile: DB 닉네임 ≠ 카카오명인 경우 기존 닉네임 유지 (2026-06-04 패치)
```

### 4-2. 이용시간 데이터 소실 (B-01 수정 완료)

```
수정 후 (2026-06-04):
  _popAccumulatedMinutes(): 읽기만 (삭제 안 함)
  DB upsert 성공 시에만 cottage_time_X 삭제
```

### 4-3. photo_url 처리

```
사진 삭제 버튼(🗑) → deletePlayPhoto() → photo_url = null
  → JSON 배열에서 특정 사진만 삭제 불가 → 전체 삭제 (기록 뷰에서는 개별 × 버튼으로 해결)
```

### 4-4. localStorage 의존 기능의 기기 비호환

| 기능 | 기기 A | 기기 B | 결과 |
|------|--------|--------|------|
| 커스텀 닉네임 | 있음 | 없음 | B에서 로그인 시 DB 조회로 복원 (보호) |
| 커스텀 사진 | 있음 | 없음 | B에서 로그인 시 DB 조회로 복원 (✅ 수정) |
| 별점 기록 | 있음 | 없음 | 로그인 시 DB user_id 기반 → B에서도 중복 방지 (✅ 수정) |
| 코멘트 소유권 | 있음 | 없음 | 로그인 시 user_id 기반 → B에서도 삭제 버튼 표시 (✅ 수정) |

---

## 5. 추후 작업 목록

### P1 — 데이터 안정성

- [x] **B-01** 이용시간 localStorage 삭제 타이밍 수정 ✅
- [x] **B-02** 기록 사진 개별 삭제 ✅
- [x] **B-03** 이용시간 초단위 누적 ✅

### P2 — 기능 완성

- [x] **B-04** 등록폼 참여자 자동완성 ✅
- [x] **B-06** 이용시간 당일 반영 ✅
- [x] **B-08** 모바일 참여자 Enter 포커스 유지 ✅

### P3 — 중복 제거

- [x] **D-01/D-02** `attachAc` 공용화 ✅
- [x] **D-03** `buildPhotoItemAdder` 통합 ✅
- [x] **D-04** 수정폼 참여자 태그칩 통일 ✅
- [x] **D-05** getDb() → CottageDB 통일 (getAllPlayRecordsForHub 추가) ✅
- [x] **D-06** `escH` → `window.escH` 전역 통합 ✅
- [x] **D-07** `pie-photo-trigger` → `pr-photo-trigger` 단일화 ✅

### P4 — 선택 개선 (장기)

- [x] 프로필 사진 DB 저장 (profiles.photo_url, 다기기 복원) ✅
- [x] 별점 소유권 user_id 기반 전환 ✅
- [x] 코멘트 소유권 user_id 기반 전환 ✅
- [x] 폴더 구조 개편 → pages/game/, pages/info/, pages/club/, pages/admin/ ✅
- [x] sitemap.xml / robots.txt 경로 현행화 ✅
- [x] 빈 디렉토리(pages/cottage/, pages/store/) 삭제 ✅
- [x] 죽은 CSS 일부 제거 (`.pr-session-group`, `.pr-rec-review-link`, `.rv-game`) ✅
- [x] **D-08** 사진 컴포넌트 공통화 — `buildPhotoHtml` + `pr-rec-photo-*` 클래스 통일 ✅
- [x] `matchRecommendPlayer` → `matchBestPlayers` rename ✅
- [x] 기존 Supabase Storage 사진 일괄 리사이즈 — 전체 20개 모두 이미 1200px 이하, 처리 불필요 ✅
- [ ] 이용시간 기기 중복 카운트 방지 (서버 세션 단위 관리)
- [ ] `window._cottageSessionStart` — kakao-auth.js에서 실사용 중, 제거 불가
- [ ] `getPlayHighlights`, `getGamePlayCount` — script.js에서 호출 중, 제거 불필요
- [x] 자동완성 화살표 선택 후 Enter — initTagInput early return + attachAc 선처리로 수정 ✅
- [x] B-13 접근성 경고 — 수정폼 입력 필드 id/name 추가 ✅
- [x] B-09 수정폼 게임명 자동완성 화살표 키 — attachAc 통합으로 자동 해결 ✅
- [x] 기록 입력폼: 두 번째 게임 행 추가 시 "위와 동일" 버튼 — 인원수·참여자를 첫 행에서 복사 ✅
- [x] 참여자 순서 정규화 — player_names 저장/조회 시 이름 정렬 후 비교, 순서 달라도 동일 그룹으로 통합 (game-reviews.html 렌더링 + 그룹핑 키 모두 적용) ✅

---

## 6. 장기 리팩토링 계획 (다중 세션)

### 목표
- **전체 리팩토링**: game-reviews.html이 1,400줄 이상으로 비대화. JS 분리 및 구조 개선
- **PC 호환성**: 현재 모바일 우선 설계. PC 레이아웃(와이드 뷰), 마우스 UX, 키보드 단축키 대응

### 리팩토링 세부 계획
- [x] game-reviews.html JS → assets/js/game-reviews.js 로 분리 ✅
- [x] script.js → owned-games-page.js + index-page.js 분리 (3,961줄 → 2,123줄) ✅
- [ ] addRow / renderGroupView / buildSessionBody 등 함수 모듈화
- [x] CSS 인라인 → style.css 통합 (pr-* 클래스) ✅
- [ ] initTagInput / attachAc → 별도 utils.js 분리 검토

### PC 호환성 세부 계획
- [x] 뷰포트 768px 이상에서 2컬럼 레이아웃 (게임 목록, 기록 허브) ✅
- [ ] 마우스 hover 상태 전반 점검
- [x] 바텀시트 → PC에서 센터 모달 ✅
- [ ] 키보드 네비게이션 (Tab 순서, Enter 동작)

### 세션별 진행 기록
| 세션 | 날짜 | 작업 범위 |
|------|------|-----------|
| 2026-06-05 세션 1 | 2026-06-05 | 플레이 기록 UX 대규모 개선, 참여자 입력 버그 수정, 방문 일수 카운팅, 관리자 페이지 분석 재구성, MEMBER_ORDER, 입력자 첫번째, 인원칩/첫칩 스타일 |
| 2026-06-05 세션 2 | 2026-06-05 | 전역 초록→갈색 색상 교체 (style.css 46개 색상 변환), 각 페이지 히어로/카드/요청/게임명 색상 정리, 난이도 설명 단축, 관리자 분석 메뉴 개선 |
| 2026-06-05 세션 3 | 2026-06-05 | 리팩토링 1단계: JS → game-reviews.js 분리 + CSS → style.css 통합 (1,507줄 → 114줄) |
| 2026-06-05 세션 4 | 2026-06-05 | 리팩토링 2단계: script.js 모듈 분리 (owned-games-page.js + index-page.js) + PC 레이아웃 (768px+ 2컬럼, 바텀시트 센터 모달) |
| 2026-06-05 세션 5 | 2026-06-05 | PC 스케일업: hero 100svh 복구, 바텀시트·기록보기·브레드크럼 폰트 확대, SEO(og:image, sitemap 3개 추가) |
| 2026-06-05 세션 6 | 2026-06-05 | PC 전체 페이지 글씨 일괄 확대: club/meeting/history/rules/intro/schedule 모든 클래스, inner-page 본문 p·li, 프로필 메뉴 가로 배치, 툴바 토글 복원, 게임카드 확대 |
| 2026-06-05 세션 7 | 2026-06-05 | game-reviews↔club-history 연동: play-records-utils.js 공유 모듈(parsePhotoUrls/buildPhotoHtml/openLightbox), club-history 라이트박스 수정, game-reviews PC 탭 전환(2컬럼→단일패널) |
| *(다음 세션)* | - | **[필수] CSS 아키텍처 리팩토링 + 전 페이지 PC 스케일 동시 적용** — 아래 "다음 세션 필수 작업" 참조 |

---

## ★ 현재 세션 PC 호환 작업 계획 (2026-06-06)

### 완료된 사전 작업
- [x] Step 1: style.css CSS 아키텍처 재구조화 — 9개 900px 블록 → 단일 720px 블록, !important 전부 제거
- [x] Step 2: PC 스케일 기준 — 모바일 ×1.1 (pr-*, sheet-* 적용 완료)

### 협의 확정 작업 목록 (순서대로 진행)

| # | 항목 | 방법 | 결정값 | 상태 |
|---|------|------|--------|------|
| 1 | 헤더 메뉴 축소 | logo clamp(70px), menu a 13px, gap 1vw | 검색 아이콘 720px 내부로 | ✅ |
| 1-2 | 모든 페이지 헤더 표시 | `body.owned-page .header-menu` 모바일 규칙을 max-width:719px 블록으로 스코핑 | - | ✅ |
| 2 | 메인 hero 텍스트 축소 | clamp(42px...) → clamp(30px,4.5vw,44px); desc 동일 비율 | ~30px | ✅ |
| 3 | 추천 "하나이상골라주세요" 중앙정렬 | 미룸 | - | ⏸ |
| 4 | 배너/히어로 높이 2/3 | page-mini-hero 280→185px; owned-page-hero 260→175px; hero 100svh→66svh; about-hero 패딩 2/3 | 전 페이지 통일 | ✅ |
| 4-2 | 추천 게임카드 5열 | 128px 카드 너무 빡빡 → 미룸 | - | ⏸ |
| 5 | 전체더보기 4열 | recommend-overlay-list → repeat(4,1fr) | - | ✅ |
| 6 | owned-games 필터 기본 접힘 + 텍스트 축소 | JS auto-open 제거; filter select 11px/22px; filter-title 12px | - | ✅ |
| 7 | game-reviews 박스 두께 + 전체 축소 | pr-* font-size 80%; padding 80% (session-hd, rec-row 등) | ×0.8 | ✅ |
| 8 | 동호회>모임기록 | TODO — 추후 세션 | - | 📋 |
| 9 | 요청하기 텍스트 추가 축소 | req-* → 모바일 수준(14-15px)으로 낮춤 | - | ✅ |
| 10 | 관리자 금일이용데이터 | TODO — 원인 불명, 추후 조사 | - | 📋 |

### TODO (작업 안 함)
- [ ] 동호회>모임기록 페이지를 game-reviews 레이아웃과 동기화 (별도 세션)
- [ ] 관리자 페이지 금일이용데이터 미표시 버그 (원인 불명, 별도 조사 필요)
- [ ] owned-games 필터 기본 접힘 (Step 3 — 위 6번에서 처리 예정)

### 주의사항
- req-* 는 현재 너무 큰 상태 → 더 줄여야 함 (이전 메모의 "수정 금지" 기준 폐기)
- 720px 블록 기준 (min-width:720px), 900px 아님
- style.css 720px 단일 블록 안에서만 수정

---

## 변경 이력 (주요 패치)

| 날짜 | 내용 |
|------|------|
| 2026-06-05 | style: PC 스케일업 — hero 100svh, 바텀시트·기록보기·브레드크럼 폰트 1.2~1.3x 확대 (900px 블록) |
| 2026-06-05 | seo: og:image 생성, sitemap 3페이지 추가, og:url 정규화 |
| 2026-06-05 | fix: "위와 동일" 직전 행 복사로 수정 (항상 첫 행이 아닌 바로 앞 행 기준) |
| 2026-06-05 | fix: 방문횟수 — 로컬 카운터 소스 전환으로 로그인 유지 상태에서도 날짜별 정확 카운팅 |
| 2026-06-05 | fix: 참여자 자동완성 — 칩 추가 후 input 이벤트 발생시켜 콤보 목록 즉시 갱신 |
| 2026-06-05 | feat: 기록 입력폼 "위와 동일" 버튼 (2번째 행 이상에서 첫 행 인원수·참여자 복사) |
| 2026-06-05 | feat: 참여자 순서 정규화 — normalizeNames() 추가, 저장/수정/그룹핑 키 모두 적용 |
| 2026-06-05 | refactor: style.css 전역 초록→갈색 (--green 변수 교체 + 하드코딩 17종 일괄) |
| 2026-06-05 | fix: about-hero, price-hero-card 그래디언트 갈색화, 游이런것도돼요 체크 앰버 |
| 2026-06-05 | fix: 게임카드/요청명/오버레이 게임명 검정, req-list-count 흰글씨 갈색배경 |
| 2026-06-05 | fix: 난이도 카드 헤비·하드코어 설명 단축, 추천섹션 스크롤 오프셋 |
| 2026-06-05 | 게임 데이터: 천국과맥주 → 맥주와빵 (Beer & Bread 한국어 이름 수정) |
| 2026-06-05 | fix: 내 활동 이용시간 0분 — startSession을 하루 첫 방문 브랜치에서도 호출 |
| 2026-06-05 | fix: 프로필 사진/닉네임 변경 후 햄버거+토글 유지 — stopPropagation + 동기 복원 |
| 2026-06-05 | feat: getProfileSnapshot 추가, 닉네임도 다기기 동기화 (initKakaoAuth) |
| 2026-06-05 | feat: play-records-utils.js 생성 — parsePhotoUrls/buildPhotoHtml/openLightbox 전역 공유 모듈 |
| 2026-06-05 | fix: club-history 라이트박스 수정 (openLightbox 미정의 → window.openLightbox 전역 사용) |
| 2026-06-05 | refactor: game-reviews PC 탭 전환 (2컬럼 사이드바이사이드 → 단일 패널 전체너비, max-width:760px) |
| 2026-06-05 | D-08: buildPhotoHtml + pr-rec-photo-* 클래스로 사진 컴포넌트 통일 (club-history.html) |
| 2026-06-05 | 관리자 3버그 수정: B-10 이벤트명 불일치, B-11 _syncTimeToDBNow update→upsert, B-12 updateProfilePhoto upsert→update |
| 2026-06-05 | 게임 필터 전면 개선: 전체게임 인원 1~9인+ 확장, bestPlayers 우선순위(BGG>XLSX) 복원, 머더미스터리 weight 예외, 추천 드롭다운 자동 닫힘 |
| 2026-06-05 | 사진 UX 개선: 썸네일 전환(80px 가로 스크롤, +N장 배지), 업로드 리사이즈(1200px JPEG 0.85), 일괄 리사이즈 스크립트 추가 |
| 2026-06-05 | 데이터 수정: BGG ID 6건(푸른달, 다윈, 마헤, 고스트, 이매진, 마블좀비), 번역 재생성 12게임 |
| 2026-06-05 | 인프라 정리: sitemap/robots 경로 현행화, 빈 디렉토리 삭제, D-05/D-07 중복 제거, 죽은 CSS 제거 |
| 2026-06-04 | 추천 인원 단체 서브버튼 — 5~9인+ 펼침/접힘, 인라인·모달 통일, 드롭다운 is-open 유지 |
| 2026-06-04 | B-05: 프로필 사진 DB 저장 — profiles.photo_url, 다기기 복원 |
| 2026-06-04 | 별점·코멘트 소유권 서버 기반 전환 — user_id 기반, 비로그인 localStorage 폴백 |
| 2026-06-04 | 폴더 구조 개편: pages/game/, pages/info/, pages/club/, pages/admin/ — 메뉴 기준 재편 |
| 2026-06-04 | 바텀시트: 룰영상 confirm, 분위기태그 confirm→준비중, 책장 보러가기 버튼 추가 |
| 2026-06-04 | 라이트박스: 기록 사진·등록폼 미리보기 클릭 시 전체화면, 스와이프/키보드 지원 |
| 2026-06-04 | B-06: 이용시간 당일 반영 — _syncTimeToDBNow 추가 |
| 2026-06-04 | D-04/D-06/D-01/D-02/D-03 리팩토링 완료 |
| 2026-06-04 | B-01~B-04 수정 완료 |
| 2026-06-04 | 사진 다중 업로드 + JSON 배열 저장 |
| 2026-06-04 | 프로필 닉네임 덮어쓰기 방지 |
