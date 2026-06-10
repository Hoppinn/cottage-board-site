# PROJECT_STATE — 코티지보드 현재 상태 보고서

최종 갱신: 2026-06-10 (24차)

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

### 게임 위치
- [x] game-location.html — 이름 검색 → 위치 코드 표시, 섹션별 게임 목록 (코드 레벨)

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
- [ ] addRow / renderGroupView / buildSessionBody 등 함수 모듈화 (현재 미착수, game-reviews.js 960줄로 감소해 우선순위 낮음)
- [x] CSS 인라인 → style.css 통합 (pr-* 클래스) ✅
- [x] initTagInput / attachAc / buildPhotoItemAdder / toInitials / hangulMatch → play-records-utils.js 공유 ✅ (game-reviews.js 1200→960줄, club-history.html 중복 100줄 제거)

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

### 완료된 항목

| # | 항목 | 상태 |
|---|------|------|
| 1 | 헤더 메뉴 축소 (logo 70px, nav 13px) | ✅ |
| 1-2 | 모든 owned-page 헤더 표시 (max-width:719px 스코핑) | ✅ |
| 2 | 메인 hero 텍스트 축소 (42→30px) | ✅ |
| 4 | 배너 높이 2/3 (mini-hero 185px, owned-hero 175px, hero 66svh) | ✅ |
| 5 | 전체더보기 4열 (repeat(4,1fr)) | ✅ |
| 6 | owned-games 필터 기본 접힘 + 텍스트 축소 | ✅ |
| 7 | game-reviews 박스 80% 축소 | ✅ |
| 9 | 요청하기 텍스트 모바일 수준으로 축소 | ✅ |

### 완료된 2차 작업 (2026-06-06)

| # | 항목 | 상태 |
|---|------|------|
| A | index.html hero 헤더 로고 overflow → PC block `.header-logo img` 크기 제한 → 스크린샷 확인 정상 | ✅ |
| B | 메인 hero 높이 — margin-top+bottom + calc(100svh - header - 40px) | ✅ → 여백 더 증가 작업 중 |
| C | page-mini-hero 배너 185→90px + 좌측정렬 + h1 font-size 줄임 | ✅ |
| D | 추천 카드 padding 16→11px, strong 21→14px, description 14→11px | ✅ |
| F | price-hero-card padding/font 20~25% 축소 | ✅ |

### 완료 (3차 작업, 2026-06-06)

| # | 항목 | 상태 |
|---|------|------|
| B2 | 메인 hero 여백 증가 — margin-top +28px, margin-bottom 56px | ✅ |
| G | about-hero 타이틀+서브타이틀 가로 한줄 (HTML wrapper + PC flex-row) + 배너 압축 | ✅ |
| H | owned-page-hero 240→90px + 좌측정렬 | ✅ |
| I | recommend-header--photo 260→90px + 좌측정렬 | ✅ |

### 완료 (4차 작업, 2026-06-06) — PC only

| # | 항목 | 방법 |
|---|------|------|
| J | about-hero "코티지보드 소개" 배너 밖으로 + 배너 압축 | PC: breadcrumb absolute position above card |
| K | price-rules.html 배너 제거 | PC: .page-mini-hero--price display:none |
| L | club.html about-hero "동호회" 배너 밖, h2+sub 한줄 가로 | HTML wrapper + PC absolute breadcrumb |
| M | index.html hero h1+desc `<br>` 제거 (각 한줄화) | HTML |
| N | 모바일 hero 카드 스타일 — 상하좌우 margin + border-radius 14px | ✅ |

### 완료 (5차 작업, 2026-06-06) — 모바일+PC

| # | 항목 | 방법 |
|---|------|------|
| O | about·club·requests 모바일 breadcrumb 카드 위로 분리 | .about-hero position:relative + breadcrumb absolute top:-24px (PC와 동일 패턴) |
| P | price-rules 모바일 배너 제거 | .page-mini-hero--price display:none (기존 PC와 동일, base 추가) |
| Q | requests.html "요청하기" breadcrumb 추가 (모바일+PC) | HTML <nav class="breadcrumb"> 추가 → 자동 카드 위 배치 |
| R | requests.html h2 1줄화 | <br> 제거 + .requests-page .about-hero h2 font-size 축소 |

### TODO (작업 안 함)
- [ ] price-rules.html 사진 중심 재구성 (가격·규칙을 텍스트 대신 사진 위주로 안내)
- [ ] club-rules.html 사진 중심 재구성 (동호회 회칙을 텍스트 대신 사진 위주로 안내)
- [ ] **Kakao OG 이미지 캐시 만료 확인** — bare URL `https://cottageboard.com/` 대상, vercel.json no-store + og-image-3.jpg 적용됨. 24시간 TTL 대기 후 카카오톡에서 재확인 필요. (2026-06-08 적용, 공유 중단 권장)
- [x] 추천>전체더보기 카드 레이아웃 동기화 — game-card 클래스 통일, 그리드 오버라이드 ✅
- [x] 동호회>모임기록 레이아웃 동기화 — 인라인 CSS 제거, history-* 누락 클래스 style.css 추가, collapse 복원 ✅
- [ ] 관리자 페이지 금일이용데이터 미표시 버그 — 원인 불명, 별도 조사
- [x] **이용시간 초 단위 전환** — total_minutes 컬럼을 초 단위로 저장, 1초 이상이면 반영. Supabase 마이그레이션 완료 (×60). 표시: 초/분/시간 단위 자동 변환 ✅
- [x] 추천 필터박스 PC 중앙정렬 수정 (`.recommend-filter` margin:auto 명시, padding-left/right 제거) ✅
- [x] 추천 빈메시지 박스 PC 중앙정렬 — margin:0 auto !important로 글로벌 -18px 덮어쓰기 ✅

### 주의사항
- 720px 블록 기준 (min-width:720px), 900px 아님
- style.css 720px 단일 블록 안에서만 수정
- req-* 는 모바일 수준으로 이미 낮춤 (14-15px)

---

## 변경 이력 (주요 패치)

| 날짜 | 내용 |
|------|------|
| 2026-06-05 | style: PC 스케일업 — hero 100svh, 바텀시트·기록보기·브레드크럼 폰트 1.2~1.3x 확대 (900px 블록) |
| 2026-06-05 | seo: og:image 생성, sitemap 3페이지 추가, og:url 정규화 |
| 2026-06-05 | fix: "위와 동일" 직전 행 복사로 수정 (항상 첫 행이 아닌 바로 앞 행 기준) |
| 2026-06-07 | fix: 모바일 참여자 입력 엔터 태그 미등록 (enterkeyhint=done + isComposing + keyup 패턴, game-reviews.js + club-history.html) |
| 2026-06-07 | fix: 사용시간 카운팅 개선 — startSession flush + pagehide 이벤트 + localStorage 누적분 표시 |
| 2026-06-07 | fix: upsertProfile photo_url 보존 (기존 DB 값 유지) |
| 2026-06-07 | feat: PC 프로필 드롭다운 hover 전환 (mouseenter/mouseleave, matchMedia 감지) |
| 2026-06-08 | fix: style.css 잔여 초록·청록 색상 제거 — history-player-header/history-record-item:hover/pr-rec-sheet-link/pr-game-group-hd/tag-chip 갈색 계열로 교체 |
| 2026-06-08 | fix: vercel.json source → `/(index.html)?` 패턴으로 확장 (bare domain + /index.html 경로도 no-store 적용) |
| 2026-06-08 | fix: club-history 날짜 헤더 색상 — 기본 #2c3e50(청회색), is-open 시 #9e3a2a(갈색)+border-left 강조 (game-reviews pr-sub-hd 패턴 동기화) |
| 2026-06-08 | fix: 이용시간 초 단위 전환 — _popAccumulatedSecs, _syncTimeToDBNow threshold 1초로 낮춤, 표시 시간/분/초 자동 변환. Supabase total_minutes ×60 마이그레이션 완료 |
| 2026-06-08 | fix: 추천 빈메시지 PC 중앙정렬 — 글로벌 margin:0 -18px !important를 PC 미디어쿼리에서 margin:0 auto !important로 덮어쓰기 |
| 2026-06-08 | fix: PC 닉네임 드롭다운 — mouseleave 200ms 딜레이 + dropdown 자체 mouseenter/leave 리스너 추가 (header-dropdown gap 이탈 문제) |
| 2026-06-08 | fix: OG이미지 파일명 og-image-2.jpg로 변경 (카카오톡 CDN 캐시 강제 갱신) + photo-exteriorooo.jpg 1200×630 크롭으로 교체 |
| 2026-06-08 | feat: pages/store/requests*.html → pages/admin/ 리디렉트 파일 생성 (구 카카오톡 링크 404 방지) |
| 2026-06-08 | fix: nickToSave effectiveRealName fallback — realName null 시 data?.real_name 사용, 닉네임 초기화 방지 |
| 2026-06-08 | feat: club.html about 섹션 사진 3장 추가 (game1/2/3.jpg, about-photo-strip 패턴) |
| 2026-06-08 | feat: club-rules.html 하단 사진 3장 추가 (game1/2/3.jpg) |
| 2026-06-08 | fix: 추천 필터박스 PC 중앙정렬 — #recommendFilter ID 셀렉터로 margin:auto 강제, 클래스 기반 규칙 무효화 |
| 2026-06-08 | fix: og-image.jpg 90° 회전 (System.Drawing으로 물리적 회전, EXIF 제거됨) |
| 2026-06-08 | feat: about.html 하단 "가격&규칙 보러가기" 링크 추가 |
| 2026-06-08 | refactor: club-rules.html 사진 추가 롤백 (사진 중심 재구성 예정) |
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
| 2026-06-08 | feat: vercel.json 생성 — 메인페이지 Cache-Control: no-store (Vercel 엣지 캐시 방지, Kakao OG 캐시 갱신 목적) |
| 2026-06-08 | feat: og-image-3.jpg 생성 + 전체 9개 HTML og:image URL 교체 (og-image-2→3, Kakao 프로덕션 캐시 강제 갱신) |
| 2026-06-08 | feat: 추천 오버레이 카드 game-card 동기화 + club-history 인라인 CSS 제거 및 history-* 누락 클래스 style.css 추가 |
| 2026-06-08 | refactor: attachAc/initTagInput/buildPhotoItemAdder → play-records-utils.js 공유 (game-reviews.js 1200→960줄) |
| 2026-06-09 | feat: 발매후 도착예정 상태 추가 — 배지(카드/모달/검색자동완성), CSS 보라색 점선, shelfGroupId 기반 (style.css + script.js) |
| 2026-06-09 | feat: add-game 단일 진입점 — BGG 맞음/틀림 확인 UX, 위치 변경, 번역 재실행 통합 (add-game.js 대규모 개편) |
| 2026-06-09 | data: 게임 데이터 정리 — 발매후 도착예정 6개 추가/변경, 파수꾼 rename 복원, 알렉산드리아 도서관 BGG 교정(432834) + 번역 완료 |
| 2026-06-09 | feat: 배송중/구매예정 배지 — 게임 카드 및 상세 모달에 shelfGroupId 기반 배지 표시 (style.css + script.js + owned-games-page.js) |
| 2026-06-09 | fix: 관리자 분석 전면 재작성 — 사용자별(회원목록+이용상세·날짜별7일)/페이지별(날짜별7일), page_sessions 기록 시작(visibilitychange), 시간 포맷 통일(시/분/초), ban 이벤트 delegation 전환 |
| 2026-06-09 | feat: 오늘 이용시간 표시 — 내활동 패널·관리자 회원카드에 추가. profiles에 today_seconds/today_date 컬럼 필요 (마이그레이션 SQL 추가됨) |
| 2026-06-10 | feat: 홈페이지 이용 가이드 페이지 신설 — pages/info/guide.html, 전체 14개 HTML nav에 코티지보드 소개 하위메뉴로 추가 |
| 2026-06-10 | fix: 동호회 nav is-current 버그 — 스크롤스파이 초기화를 location.hash 기반으로 변경, 초기 IIFE에서 club.html 링크 제외(충돌 방지) |
| 2026-06-10 | data: 맥주와빵 파이프라인 완전 수정 — XLSX 원본과 match-map.json까지 비어앤브레드→맥주와빵 rename + 천국과맥주 삭제, build-master+build-output 재실행 완료 (빌드 롤백 근본 해결) |
| 2026-06-09 | feat: 게임위치 페이지 — game-location.html 코드레벨 구현 (이름 검색+섹션별 게임목록, A~F-1) |
| 2026-06-09 | data: 선반 분류 재편 — 협력→easy_coop(B-1)/hard_coop(C-1) weight 2.5 기준, 방탈출→escape_room(F-1), murder_mystery G→F, etc_space F→G |
| 2026-06-09 | feat: add-game BGG ID 보호 — 기존 게임에 bggId 있으면 --rematch 없이는 BGG 매칭/fetch 건너뜀 |
| 2026-06-08 | feat: add-game CLI 인터랙티브 자동화 — 위치·체감난이도 CLI 입력, BGG 매칭 점수별 확인(80+:확인옵션/55~79:필수/실패:ID입력), forced-bgg-overrides.json 자동 저장, description-translator.js --game-id 옵션 추가, ANTHROPIC_API_KEY 있으면 번역 자동 실행(없으면 경고), --skip-translate 옵션 |
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
