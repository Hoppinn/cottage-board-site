# PROJECT_STATE — 코티지보드 현재 상태 보고서

최종 갱신: 2026-06-04 (라이트박스 + 텍스트 수정)

---

## 1. 현재 완료 기능

### 핵심 기능
- [x] 카카오 OAuth 로그인/로그아웃
- [x] 닉네임 변경 (localStorage + DB 저장)
- [x] 프로필 사진 변경 (프리셋 20종 + 파일 업로드, localStorage만)
- [x] 내 활동 패널 (플레이 기록, 코멘트, 모임 참석 통계)
- [x] 유저 차단/해제 (어드민)

### 게임 기록
- [x] 신규 기록 등록 (다중 게임 행, 날짜/그룹명/참여자/인원/시간/점수/후기)
- [x] 사진 다중 업로드 (최대 5장, JSON 배열 저장)
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

### 게임 목록 / 바텀시트
- [x] 전체 게임 목록 (필터: 인원, 난이도, 분위기, 키워드)
- [x] 게임 바텀시트 (별점, 코멘트, 따봉/비추, 플레이 기록)
- [x] 별점 제출/조회 (세션 키 기반 중복 방지)
- [x] 코멘트 등록/삭제/수정
- [x] 따봉/비추 토글

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
| B-05 | kakao-auth.js:35 | 프로필 사진이 localStorage에만 저장 → 다기기 접속 시 항상 카카오 기본 사진으로 표시 |
| ~~B-06~~ | ~~supabase-client.js~~ | ~~이용시간 DB 반영 다음날 첫 방문 때만~~ → **_syncTimeToDBNow로 visibilitychange/beforeunload 즉시 반영 완료** |
| B-07 | kakao-auth.js:32–35 | 방문 카운트가 기기별 독립 → 멀티기기 사용 시 중복 카운트 가능 |

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
| D-05 | `getDb()` vs `window.CottageDB` | 직접 DB 쿼리(`getDb()`)와 CottageDB 래퍼 혼용 — `review_text` 같은 추가 컬럼이 필요한 경우 직접 쿼리 사용 |
| ~~D-06~~ | ~~`escH()` 함수~~ | ~~game-reviews.html / kakao-auth.js 각 독립 정의~~ → **supabase-client.js에 window.escH 전역 통합 완료** |
| D-07 | `pie-photo-trigger` vs `pr-photo-trigger` CSS | 동일한 스타일을 두 클래스로 분리 |

---

## 4. 위험한 데이터 흐름

### 4-1. 닉네임 손상 체인 (다기기 / localStorage 초기화 시)

```
다른 기기로 로그인
  → auth-callback: cottage_custom_nick_X 없음
  → [수정 전] nickname = 카카오 기본명
  → upsertProfile(userId, 카카오명)
  → DB.profiles.nickname = 카카오명 (커스텀 닉네임 덮어씌워짐)

현재 보호 상태:
  → auth-callback: DB 닉네임 조회 fallback 추가됨 (2026-06-04 패치)
  → upsertProfile: DB 닉네임 ≠ 카카오명인 경우 기존 닉네임 유지 (2026-06-04 패치)
```

### 4-2. 이용시간 데이터 소실 (B-01 수정 완료)

```
수정 전:
  _popAccumulatedMinutes(): cottage_time_X 읽기 + 즉시 removeItem()
  → DB upsert 실패 시 시간 영구 소실

수정 후 (2026-06-04):
  _popAccumulatedMinutes(): 읽기만 (삭제 안 함)
  DB upsert 성공 시에만 cottage_time_X 삭제
  → 실패 시 localStorage 유지 → 다음 upsertProfile 재시도 시 반영
```

### 4-3. photo_url 처리 불일치 (수정폼)

```
수정폼 저장 후 → photo_url 갱신
  → recordsData[idx].photo_url 로컬 캐시 갱신
  → 이후 렌더링은 parsePhotoUrls()로 처리됨 (현재 OK)

사진 삭제 버튼(🗑) → deletePlayPhoto() → photo_url = null
  → recordsData[idx].photo_url = null
  → JSON 배열에서 특정 사진 하나만 삭제 불가 → 전체 삭제됨 (B-02 미수정)
```

### 4-4. localStorage 의존 기능의 기기 비호환

| 기능 | 기기 A | 기기 B | 결과 |
|------|--------|--------|------|
| 커스텀 닉네임 | 있음 | 없음 | B에서 로그인 시 카카오 닉네임 → DB 조회로 복원 시도 (현재 보호) |
| 커스텀 사진 | 있음 | 없음 | B에서 항상 카카오 기본 사진 (DB 저장 없음) |
| 별점 기록 | 있음 | 없음 | B에서 동일 게임 재평가 가능 |
| 코멘트 소유권 | 있음 | 없음 | B에서 내 코멘트 삭제 버튼 안 보임 |

---

## 5. 추후 작업 목록

### P1 — 데이터 안정성 (즉시)

- [x] **B-01** 이용시간 localStorage 삭제 타이밍 수정 — DB upsert 성공 후 삭제 ✅ 완료
- [x] **B-02** 기록 표시 사진 개별 삭제 — parsePhotoUrls + updateGamePlay 적용 ✅ 완료
- [x] **B-03** 이용시간 초단위 누적, DB 반영 시 분변환 (`cottage_time_sec_`) ✅ 완료

### P2 — 기능 완성 (단기)

- [x] **B-04** 등록폼 참여자 자동완성 — attachAc 공용화와 함께 해결 ✅ 완료
- [x] **B-06** 이용시간 당일 반영 — _syncTimeToDBNow, visibilitychange + beforeunload 즉시 DB 반영 ✅ 완료
- [x] **B-08** 모바일 참여자 Enter 포커스 유지 — blur 시 re-focus ✅ 완료

### P3 — 중복 제거 (중기)

- [x] **D-01/D-02** `attachAc` 공용 함수로 외부 스코프 이동 + 등록폼/수정폼 공유 ✅ 완료
- [x] **D-03** `buildPhotoItemAdder` 공통 함수로 통합 ✅ 완료
- [x] **D-04** 수정폼 참여자 태그칩 통일 — initTagInput 외부 스코프 이동, 수정폼 적용 ✅ 완료
- [x] **D-06** `escH` → `window.escH` 전역 통합 (supabase-client.js) ✅ 완료

### P4 — 선택 개선 (장기)

- [ ] 프로필 사진 DB 저장 (profiles 테이블에 photo_url 컬럼 추가)
- [ ] 별점, 코멘트 소유권을 localStorage → 서버 인증 기반으로 전환
- [ ] 이용시간 기기 중복 카운트 방지 (서버 세션 단위 관리)
- [ ] **D-07** CSS 중복 클래스 정리 (`.pie-photo-trigger` / `.pr-photo-trigger` 통합)
- [ ] 죽은 CSS 정리 (`.pr-session-group`, `.pr-rec-review-link`, `.rv-game`, `.pr-rec-photo-item` 등)
- [ ] `window._cottageSessionStart` 미사용 전역 변수 제거
- [ ] `getPlayHighlights`, `getGamePlayCount` 사용 여부 재확인 후 미사용 시 제거

---

## 변경 이력 (주요 패치)

| 날짜 | 내용 |
|------|------|
| 2026-06-04 | 바텀시트: 룰영상 confirm, 분위기태그 confirm→준비중, 책장 보러가기 버튼 추가 |
| 2026-06-04 | 라이트박스: 기록 사진·등록폼 미리보기 클릭 시 전체화면, 스와이프/키보드 지원 |
| 2026-06-04 | 텍스트: club-history 안내문 변경, game-reviews 동호회 링크 텍스트 변경 |
| 2026-06-04 | B-06: 이용시간 당일 반영 — _syncTimeToDBNow 추가, visibilitychange/beforeunload에서 즉시 DB 반영 |
| 2026-06-04 | D-04: 수정폼 참여자 태그칩 통일 — initTagInput 공용화, 수정폼 적용 |
| 2026-06-04 | B-03: 이용시간 초단위 누적 — cottage_time_sec_, DB 반영 시 분변환 |
| 2026-06-04 | B-02: 기록 사진 개별 삭제 — 특정 URL만 제거 후 updateGamePlay, 렌더링 photo-item 래핑 |
| 2026-06-04 | B-08: 모바일 참여자 Enter 포커스 유지 — blur에 값 있을 때 re-focus 추가 |
| 2026-06-04 | D-06/D-01/D-02/D-03 리팩토링: escH 전역화, attachAc 공용화, buildPhotoItemAdder 통합, B-04(등록폼 참여자 AC) 해결 |
| 2026-06-04 | B-01 수정: 이용시간 localStorage 삭제를 DB upsert 성공 후로 이동 |
| 2026-06-04 | 사진 다중 업로드 + JSON 배열 저장 + parsePhotoUrls 헬퍼 추가 |
| 2026-06-04 | 수정폼 사진 다중 지원 (기존 개별 삭제 + 신규 다중 추가) |
| 2026-06-04 | 프로필 닉네임 덮어쓰기 방지 (auth-callback DB 조회 + upsertProfile 보호) |
