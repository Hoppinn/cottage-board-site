# PROJECT_STATE — 코티지보드 현재 상태 보고서

최종 갱신: 2026-06-05 (3차)

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
| B-07 | kakao-auth.js:32–35 | 방문 카운트가 기기별 독립 → 멀티기기 사용 시 중복 카운트 가능 |
| B-13 | game-reviews.html 수정폼 | 입력 필드에 id/name 없음 — 접근성 경고 (기능 영향 없음) |

### 하 (UX 불편)

| ID | 위치 | 설명 |
|----|------|------|
| ~~B-08~~ | ~~game-reviews.html~~ | ~~모바일 소프트키보드 "다음"으로 포커스 이탈~~ → **blur 시 값 있으면 re-focus 완료** |
| B-09 | game-reviews.html | 수정폼 게임명 자동완성에 화살표 키 이동 없음 (attachAc 단순 버전) |

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
- [ ] PC 호환성
- [ ] B-13 접근성 경고 — 수정폼 입력 필드 id/name 추가
- [x] 기록 입력폼: 두 번째 게임 행 추가 시 "위와 동일" 버튼 — 인원수·참여자를 첫 행에서 복사 ✅
- [x] 참여자 순서 정규화 — player_names 저장/조회 시 이름 정렬 후 비교, 순서 달라도 동일 그룹으로 통합 (game-reviews.html 렌더링 + 그룹핑 키 모두 적용) ✅

---

## 변경 이력 (주요 패치)

| 날짜 | 내용 |
|------|------|
| 2026-06-05 | feat: 기록 입력폼 "위와 동일" 버튼 (2번째 행 이상에서 첫 행 인원수·참여자 복사) |
| 2026-06-05 | feat: 참여자 순서 정규화 — normalizeNames() 추가, 저장/수정/그룹핑 키 모두 적용 |
| 2026-06-05 | 게임 데이터: 천국과맥주 → 맥주와빵 (Beer & Bread 한국어 이름 수정) |
| 2026-06-05 | fix: 내 활동 이용시간 0분 — startSession을 하루 첫 방문 브랜치에서도 호출 |
| 2026-06-05 | fix: 프로필 사진/닉네임 변경 후 햄버거+토글 유지 — stopPropagation + 동기 복원 |
| 2026-06-05 | feat: getProfileSnapshot 추가, 닉네임도 다기기 동기화 (initKakaoAuth) |
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
