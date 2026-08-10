# PROJECT_STRUCTURE — 코티지보드 홈페이지 구조 문서

최종 갱신: 2026-08-09 (게임위치 페이지에 책장 사진 추가 — `game-location.html` 섹션 헤더에 작은 썸네일(코드뱃지 옆) + 펼치면 목록 위에 큰 배너, 탭하면 `openLightbox`로 확대. 사진은 `assets/images/shelf-locations/{sectionId}.webp`(19개 섹션 중 16개, Z 계열 3개는 없음 — img onerror로 조용히 숨김). 원본이 배경제거 컷아웃이라 ①webp로 투명 유지(jpeg면 라이트박스에서 검은 박스로 보임) ②`build-shelf-photos.js`가 알파채널 연결요소 분석으로 "가장 큰 덩어리"만 남기고 크롭(귀퉁이에 안 지워진 배경 조각·과도한 여백 제거, 단순 trim()은 조각까지 bbox에 포함시켜 실패). 원본은 `raw/`(gitignore, 커밋 안 됨)) / 2026-08-08 (추천게임 책자 연동 완료 — `booklet-courses-data.js` 신설(책자 6개 코스, 52개 gameKey 검증됨). 홈 "추천게임 찾기"를 추천 코스/게임 더 찾기 2탭으로 재편, 히어로·헤더메뉴·QR 전부 추천 코스 탭 기본 진입. 죽어 있던 recommendModal은 되살리지 않고 기존 recommendFilter를 게임 더 찾기 탭에 재사용) / 2026-07-22 (**P1 — `game_comments.record_id`(014)로 한 플레이기록에 여러 사람 게임평. supabase-client에 `getRecordComments`, insertComment에 recordId 인자, buildSessionBody에 매인 게임평 렌더, scripts에 `link-bbok-0711-comments.js` 추가**) / 2026-07-22 (**P4 — `member-analytics.js` 신설(관리자 「한 사람」 집계 단일 소스), 회원 보드 오너 섹션, scripts에 `_member-analytics`·`verify-member-board-admin`·`shot-member-board-admin` 추가**) / 2026-07-22 (scripts에 verify-member-period·shot-member-period 추가 — 회원 카드 펼침 기간 선택) / 2026-07-22 (Phase D 진입점에 club-history 보강 + renderCrossBackLink + scripts 3개 추가) / 2026-07-22 (scripts/ 목록에 audit-session-double-insert.js·verify-session-dedup.js 추가) / 2026-07-22 (GS5 — verify-esch-unify.js 추가) / 2026-07-18 (문서-코드 참조 정합성 감사 — §2 JS 파일 역할에 header.js 누락 추가)

---

## 참조 파일

| 주제 | 파일 |
|------|------|
| DB 테이블/컬럼/RPC/Storage | [docs/db-schema.md](db-schema.md) |
| CottageDB 함수 / JS 전역 API | [docs/js-api.md](js-api.md) |
| localStorage 키/구조/크로스파일 의존관계 | [docs/ls-schema.md](ls-schema.md) |
| 업적/칭호/캐릭터/교환권/성장보드 (SSOT) | [docs/achievement-system.md](achievement-system.md) |
| 관리자 분석 — 표시 원칙·발견 대장·실행계획 (SSOT) | [docs/admin-analytics.md](admin-analytics.md) |

---

## 1. 페이지 구조

```
/
├── index.html                      # 메인 (추천 게임, 인기 게임, 검색)
├── auth-callback.html              # 카카오 OAuth 리다이렉트 처리
├── pages/
│   ├── game/                       # 게임 찾기 & 기록
│   │   ├── owned-games.html        # 전체 게임 목록 + 필터 + 바텀시트
│   │   ├── game-reviews.html       # 플레이 기록 허브 (핵심 기능 페이지)
│   │   └── game-location.html      # 게임 위치 안내
│   ├── info/                       # 코티지보드 소개
│   │   ├── about.html              # 코티지가 만들어진 이유 (브랜드 스토리: Hero→WHY1→WHY2→제약 2x2 카드→WHY 회수→버튼)
│   │   ├── price-rules.html        # 가격·이용안내 (이용요금→운영시간→이용 약속→음식 안내)
│   │   └── guide.html              # 홈페이지 기능 안내
│   ├── club/                       # 동호회
│   │   ├── club.html               # 동호회 소개
│   │   ├── club-intro.html         # 동호회 멤버 소개
│   │   ├── club-schedule.html      # 모임 플래너 (달력, 가능 시간 등록, 겹침 계산, 자유 댓글)
│   │   ├── club-meeting.html       # → club-schedule.html 리다이렉트 (구 투표 페이지)
│   │   ├── club-rules.html         # 동호회 규칙
│   │   └── club-history.html       # 모임 기록 & 사진 (DB 연동)
│   ├── admin/                      # 요청/관리
│   │   ├── requests.html           # 게임/간식 요청 (로그인 필요)
│   │   └── requests-admin.html     # 요청 관리 어드민 (오너 전용)
│   └── store/                      # 구 URL 리다이렉트 shim (카카오톡 링크 404 방지)
│       ├── requests.html           # → pages/admin/requests.html
│       └── requests-admin.html     # → pages/admin/requests-admin.html
├── scripts/                        # DB/운영/분석 스크립트 (게임 파이프라인과 무관)
│   ├── analyze-user-data.js        # 유저 데이터 전수 분석 (재사용 가능)
│   ├── recover-time-data.js        # total_minutes 복구 (완료, 보관)
│   ├── recover-user-data.js        # 유저 데이터 복구 (완료, 보관)
│   ├── recover-visit-count.js      # visit_count 복구 (완료, 보관)
│   ├── resize-existing-photos.js   # Storage 사진 일괄 리사이즈 (완료, 보관)
│   ├── crop-characters.js          # 캐릭터 스프라이트 크롭 (완료, 보관)
│   ├── split-characters.js         # 캐릭터 시트 분할 (완료, 보관)
│   ├── split-seasons.js            # 시즌 캐릭터 시트 분할 (완료, 보관)
│   ├── test-subsheet.js            # 서브시트 레이아웃 테스트
│   ├── test-profile-area.js        # 프로필 영역 테스트
│   ├── verify-notif-read.js        # 개별 알림 읽음 E2E 스모크 ⚠️운영DB 일시변경(finally 복원)
│   ├── audit-admin-analytics.js    # 관리자 분석 감사 — 절단/RLS + 렌더 (읽기전용)
│   ├── shot-admin-tabs.js          # 관리자 6개 탭 스크린샷 + 표시층 발견 #5~#7 판정 (읽기전용)
│   │                               # ⚠️출력 폴더를 리포 안으로 주지 말 것(Live Server 리로드로 죽음)
│   │                               # supabase 쓰기는 라우트로 차단(GET만 통과) + 실행 시 출력폴더 비움
│   ├── audit-anon-count.js         # #27 「비회원」 — 두 화면이 각각 무엇을 세는지 + 고아 마커 (읽기전용)
│   ├── probe-orphan-markers.js     # #27 고아 마커의 정체 — 사람 대조군 포함 (읽기전용)
│   ├── verify-anon-definition.js   # #27 옛/새 규칙 대조 + 음성 대조군 + 불변식 12건 (읽기전용)
│   ├── audit-drilldown.js          # P3b 「이걸 한 사람들」 명단을 DB에서 직접 집계 (읽기전용)
│   ├── verify-drilldown.js         # P3b 드릴다운 — 화면 명단 vs DB 교차 검증 (읽기전용)
│   │                               # 🚨 --negctl(음성 대조군)을 먼저 돌릴 것. 기대값을 1 비틀어
│   │                               #    그 줄에서만 🔴이 뜨는 걸 본 뒤에야 「전부 통과」를 믿는다
│   ├── verify-home-hero.js         # 히어로 미노출 + #recommend 딥링크 회귀 (읽기전용)
│   ├── probe-home-hero-recent.js   # 「최근 플레이」가 옛 기록을 보이던 원인 실측 (읽기전용)
│   ├── verify-home-hero-recent.js  # 「최근 플레이」 선택 로직 — supabase-client.js를 실제로
│   │                               #   eval해 검증 (읽기전용). --negctl 먼저 돌릴 것
│   │                               # ⚠️ setInterval을 스텁하지 말 것 — undici가 .unref()를 부른다.
│   │                               #   덮으면 전 쿼리가 죽고 검사기가 0행을 정상처럼 보고한다
│   ├── verify-party-size.js        # 모임 인원(등록 건수 ≠ 방문 인원) — 회귀 불변식 + 엣지 (읽기전용)
│   │                               #   --negctl 먼저. --live를 줘야 실DB 조회(guest_count 필드 확인)
│   ├── verify-title-links.js       # TITLE_DEFS ↔ ACH_DEFS.rewards.title 정합성 (DB 불필요)
│   │                               #   고아/허수/중복/임계값 불일치 4종. --negctl 먼저 돌릴 것
│   ├── audit-member-today.js       # 회원 카드 「오늘」 칩이 사라지는 조건 실측 (읽기전용)
│   │                               #   --negctl 먼저. 오늘 회원 체류가 0건이면 아무것도
│   │                               #   판정 못 한다고 스스로 보고한다(--days N으로 범위 확대)
│   ├── verify-character-assets.js  # ACH_DEFS.rewards.character ↔ 실제 png 대조 (DB 불필요)
│   │                               #   onerror 폴백이 404를 가려 눈으론 안 잡히는 자리.
│   │                               #   --negctl 먼저. 전건 누락이면 경로 규칙 어긋남으로 보고 중단
│   ├── audit-referrer.js           # #28 page_sessions.referrer 실제 값 분포 + 「직접 방문」으로
│   │                               #   접힌 행 (읽기전용). 착수 첫 동작인 재측정용
│   ├── verify-referrer.js          # #28 유입 소스가 「직접 방문」에서 갈라지는가 (읽기전용)
│   │                               #   --negctl 먼저. categorizeRef와 집계 루프를 화면 코드에서
│   │                               #   원문 그대로 잘라 eval + 14개 페이지 로드 순서 전수
│   ├── audit-notifications.js      # 알림 — 사람별 줄 수 + 유형별 「줄 vs 원본행」 (읽기전용)
│   │                               #   getMyNotifications를 실제 회원 전원에게 돌린다.
│   │                               #   묶음을 새로 넣기 전후로 돌려 줄 수가 실제로 줄었는지 볼 것
│   ├── verify-iframe-rows.js       # #24 「홈 방문 1회 = page_sessions 1행」 사후 확인 (읽기전용)
│   │                               #   --negctl 먼저. 같은 session_key+같은 초에 index와
│   │                               #   프레임 페이지가 함께 들어온 묶음을 센다. 수정 이후
│   │                               #   구간에 행이 없으면 「통과」가 아니라 「판정 불가」로 보고한다
│   │                               #   🚨 이 스크립트의 「✅ 0건」만으로 종결하지 말 것 — 아래 짝을 먼저
│   ├── verify-iframe-precondition.js # 위 판정의 **표본이 있는지**를 잰다 (읽기전용)
│   │                               #   버그는 「로그인 상태 홈 방문」에서만 발동한다(iframe 미리로드가
│   │                               #   kakao-auth-ready 이후, 세션당 1회). 그 기회 수를 세어
│   │                               #   판정에 필요한 표본(현재 11건)과 대조한다. 2026-07-22에
│   │                               #   verify-iframe-rows의 「✅ 0건」이 무증상 구간이었음을 이걸로 잡았다
│   ├── audit-session-double-insert.js # 「방문 1회 = page_sessions 몇 행인가」 실측 (읽기전용)
│   │                               #   --negctl 먼저. 화면의 normalizePageKey를 원문 그대로
│   │                               #   잘라 eval한다 — 원본 page로 묶으면 과거 쌍을 못 본다
│   ├── verify-session-dedup.js     # 위 부풀림의 읽기측 접기(collapseTwinInserts) 검증 (읽기전용)
│   │                               #   --negctl(창 -1ms) 먼저. 0ms는 `<=0`이라 동시 행이 접혀
│   │                               #   대조군이 성립하지 않는다. 불변식 6종 + 화면 「진입 N회」 변화
│   ├── verify-past-meeting-actions.js # A-10 지난 날짜의 무반응 버튼(✎/✕·등록) 제거 검증 (DB 불필요)
│   │                               #   --negctl 먼저. day-detail.js를 실제 eval하고,
│   │                               #   index-page.js의 판정식은 원문 그대로 잘라 eval한다
│   ├── link-bbok-0711-records.js   # (구·되돌림) 뽁님 게임평 → 호핀 세션에 새 기록 삽입 접근.
│   │                               #   같은 게임 2번 뜨는 문제로 --undo 완료. 보관만
│   ├── link-bbok-0711-comments.js  # (P1) 뽁님 7/11 게임평 game_comments.record_id를 호핀
│   │                               #   7/11 기록 id로 세팅 → 기록 아래 표시(새 기록 안 만듦).
│   │                               #   ⚠️운영DB UPDATE. 기본 드라이런, --commit. --undo로 NULL 복원.
│   │                               #   🚨 마이그레이션 014 선행 필수(없으면 드라이런도 400).
│   │                               #   멱등(이미 그 record_id면 건너뜀). 원본 코멘트는 안 지움
│   ├── verify-history-caption.js   # 모임 기록 「캡션복사」 양식 (DB 불필요, --live로 실DB 대조)
│   │                               #   --negctl 먼저. club-history.html의 formatPlayTime·
│   │                               #   formatScore·buildCaption을 원문 그대로 잘라 eval한다
│   │                               #   🚨 score_note는 자유 텍스트다 — 「점」을 무조건 붙이면
│   │                               #      「실패점」이 된다(실측 51행 중 21건이 숫자가 아님)
│   ├── verify-esch-unify.js        # GS5 escH 사본 통합 — 정본 동작(eval) + 남은 사본 스캔 (DB 불필요)
│   │                               #   --negctl 먼저. ALLOW에 「통합 대상 아님」 4종의 이유가 있다
│   ├── audit-nick-click.js         # 참여자 닉네임 태그 중 몇 개가 회원과 연결되는가 (읽기전용)
│   │                               #   --negctl 먼저(맵을 비우면 0%). game-reviews.js의 맵 구성을
│   │                               #   원문 그대로 재현한다. 안 열리는 이름 목록을 함께 낸다 —
│   │                               #   비회원 손님 이름이면 정상, 회원인데 빠졌으면 버그다
│   ├── verify-cross-nav.js         # 닉네임 클릭 + 크로스 페이지 복귀 링크 (DB 불필요)
│   │                               #   --negctl 먼저. renderCrossBackLink를 원문 그대로 잘라 eval
│   ├── shot-cross-nav.js           # 위 둘의 육안 확인 스크린샷 (읽기전용, supabase 쓰기 차단)
│   │                               #   ⚠️ HEAD(count) 요청도 함께 막히므로 보드 안의 개수는 가짜다
│   ├── verify-member-period.js     # 회원 카드 펼침의 기간 선택 — 계산 층 (읽기전용)
│   │                               #   --negctl 먼저. 화면의 기간 헬퍼·pageMapFor를 원문 그대로
│   │                               #   잘라 eval하고, 대조군 집계는 일부러 손으로 따로 짰다
│   │                               #   (같은 코드를 두 번 부르면 검증이 아니라 반복이다).
│   │                               #   ⚠️ 잘라오는 조각은 **한 번의 eval**에 몰 것 — const는
│   │                               #      eval 밖으로 안 새서 나눠 부르면 서로도 못 본다
│   │                               #   ⚠️ 합성 데이터의 날짜를 박지 말 것(내일 썩는다)
│   ├── shot-member-period.js       # 위의 화면 층 + 스크린샷 (읽기전용, supabase 쓰기 차단)
│   │                               #   표·버튼 숫자·기준 표기가 같은 기간을 말하는지 + 390px
│   │                               #   🚨 회원 탭 키는 **member**(단수)다. 'members'로 쓰면 클릭이
│   │                               #      무효인데 querySelector는 숨은 카드도 찾아줘서
│   │                               #      「숨겨진 패널을 재고 전부 통과」가 된다(실제로 그랬다)
│   ├── _member-analytics.js        # (P4) 검증 스크립트용 공용 로더 — member-analytics.js를
│   │                               #   eval해 window.MemberAnalytics를 꺼내온다(사본 금지, #15).
│   │                               #   mutate(src)로 음성 대조군용 소스 변형 지원
│   ├── verify-member-board-admin.js # (P4) 오너 「회원 분석」 섹션 — 가드 진리표 + countMemberEvents
│   │                               #   독립대조 + 필터조회 충실도 (읽기전용). --negctl 먼저
│   ├── shot-member-board-admin.js  # (P4) 위의 브라우저 렌더 — 오너엔 카드·amb, 비오너엔 미표시
│   │                               #   (읽기전용, 뮤테이션만 차단). 🚨 HEAD(count)는 통과시킬 것 —
│   │                               #   막으면 getMyStats가 깨져 패널이 안 뜬다(카드 0으로 오판)
│   ├── verify-lost-update.js       # #22 profiles read-modify-write 손실 재현 + 수정 후 검증
│   │                               # ⚠️운영DB에 임시 행 1개 생성(finally 삭제 + 삭제 재확인)
│   │                               # 순차 대조군 내장 — 순차가 N이 아니면 결과 신뢰 금지
│   ├── build-shelf-photos.js       # (2026-08) 게임위치 페이지 책장 사진 원본(raw/, gitignore,
│   │                               #   배경제거 컷아웃 PNG)을 shelf-locations.js SHELF_GROUPS id
│   │                               #   기준 assets/images/shelf-locations/{id}.webp 로 크롭+압축.
│   │                               #   computeContentBBox: 알파채널 축소+blur로 상자 사이 틈을
│   │                               #   이어붙인 뒤 연결요소(flood fill)에서 가장 큰 덩어리의 bbox만
│   │                               #   취해 원본을 크롭 — 단순 trim()은 귀퉁이에 안 지워진 배경
│   │                               #   조각 하나에도 bbox가 거기까지 넓어져 실패(전량 재작업 사례).
│   │                               #   webp로 저장(알파 유지, jpeg면 라이트박스에서 검은 박스로 보임).
│   │                               #   raw 파일명은 섹션 코드(A, A-1, C-1...)로 매칭 — 사진 교체 시
│   │                               #   raw/에 같은 코드 파일명으로 넣고 재실행. DB 무관, 읽기전용 아님(로컬 파일 쓰기만)
│   │
│   # 🚨 브라우저로 사이트를 띄우는 검증 스크립트 주의 (2026-07-19 실제 오염)
│   #   localStorage에 가짜 kakao_user를 심으면 **사이트 코드가 실제로 upsertProfile을
│   #   실행해 운영 profiles에 행을 만든다**. page_views·page_events도 함께 쌓인다.
│   #   → 반드시 finally에서 정리하고, **삭제 후 건수를 재확인**할 것.
│   #   → page_views·page_events는 anon DELETE 정책이 없어 **스크립트로는 못 지운다**
│   #      (SQL Editor 필요). 상세는 db-schema.md 「anon 키로는 지울 수 없다」.
│   #   → 실측 사례: 프로브 3개가 정리 없이 끝나 profiles 4행·page_views 14행·
│   #      page_events 14행이 남았고, 관리자 회원 수가 20→24로 보였다.
│   ├── ss_subsheet/                # 서브시트 스크린샷 (비교용 이미지)
│   ├── ss_4axis/                   # 4축 UI 스크린샷
│   └── ss_profile/                 # 프로필 패널 스크린샷
```

### 헤더 메뉴 구조 (assets/js/header.js)

```
게임
 ├ 추천 게임 찾기
 ├ 전체 게임 보기
 ├ 게임 위치
 └ 플레이 기록

코티지를 만든 이유   ← 직접 링크 (드롭다운 아님), info/about.html
                      페이지 내 타이틀은 "코티지가 만들어진 이유"

코티지 이용
 ├ 가격 · 이용안내    (info/price-rules.html)
 ├ 홈페이지 기능      (info/guide.html)
 ├ 동호회             (club/club.html, 단일 링크)
 └ 요청하기           (admin/requests.html)
```

`코티지보드` 그룹과 `동호회` 그룹은 폐지되어 `코티지 이용` 그룹으로 흡수됨 (143차-157 전후). `.menu-link-home` 클래스로 직접 링크 스타일(그룹 헤더와 동일 색상) 적용.

### 페이지별 인증 요구

| 페이지 | 인증 필요 | 오너 전용 |
|--------|----------|----------|
| index.html | 선택 (별점 등) | N |
| game/owned-games.html | 선택 (코멘트, 따봉) | N |
| game/game-reviews.html | 기록 입력 시 필수 | N |
| admin/requests.html | 필수 | N |
| admin/requests-admin.html | 필수 | **Y** |
| club/club-* | 대부분 선택 | N |

---

## 2. JS 파일 역할

```
assets/js/
├── header.js                   # 헤더 HTML 주입(로고·메뉴·검색버튼) + embed 모드 처리(embed=1 시 헤더 미삽입,
│                               #   내부 .html 링크 클릭에 embed=1 자동 전파). data-index="true" 스크립트 속성으로
│                               #   index.html vs 하위 페이지 상대경로 분기. 상세는 §2-A "embed 모드"
├── supabase-config.js          # Supabase URL + anonKey 설정 (window.SUPABASE_CONFIG)
├── supabase-client.js          # DB 접근 모듈 (window.CottageDB, window._cottageSess, window.escH 노출)
│                               # 방문자 추적(__visitor__), 체류시간, 비로그인 heartbeat 포함
├── kakao-auth.js               # 카카오 로그인/로그아웃, 프로필 패널, 알림, 교환권
│                               # (window.getKakaoUser / openProfilePanel 노출)
│                               # day-detail.js + member-analytics.js를 자기경로 동적 로드(모든 페이지)
│                               # 오너가 남의 보드 열면 「회원 분석」 오너 섹션(_renderAdminMemberBoard, P4)
├── member-analytics.js         # 관리자 「한 사람」 집계 단일 소스(window.MemberAnalytics, P4)
│                               # 기간 헬퍼·페이지 정규화·페이지 맵·이벤트 계열(EVENT_FAMILIES)
│                               # requests-admin.html과 kakao-auth 오너 섹션이 공유(#15 방지)
│                               # 순수 함수만 — 상세는 docs/js-api.md MemberAnalytics
├── script-nav.js               # 한글 검색 유틸, rootPath, 모바일 메뉴/스크롤스파이, 헤더 검색, 카드 이벤트, 세션 트래커
├── game-sheet.js               # GameView, 게임 데이터 포매터, 게임시트, 플레이 모달, 코멘트·사진 모달
├── game-display-adapter.js     # gameData → 화면 출력용 view adapter (window.COTTAGE_GAMES 생성) · 난이도 시스템(getDifficultyData/normalizeLevelValue, GS7 이관)
├── game-reviews.js             # 플레이기록 허브 (game-reviews.html 전용)
│                               # 기록 등록·수정·삭제, 모임/게임별 보기, 사진 업로드
├── achievements.js             # 업적·캐릭터·칭호 체크 및 지급 (window.checkAchievements 노출)
├── day-detail.js               # 일정 상세 모달 + 막대 공용 컴포넌트 (즉시실행 IIFE, CSS 자기주입)
│                               # window 노출: renderDayDetailHTML / openDayDetailModal /
│                               #   openDateScheduleModal / openDateMeetingModal /
│                               #   buildBarsInCard(dayVotes, voteGames, myVote)
│                               # 로드 페이지: index.html, club-schedule.html
│                               # 의존: window.CottageDB (getMeetingVotes, getMeetingVoteGames),
│                               #   window.COTTAGE_GAMES (게임명 해석, optional),
│                               #   window.openOtherMeetingSheet (kakao-auth.js — 참여자 닉네임 클릭),
│                               #   window.getGameKeyById (play-records-utils.js) +
│                               #     window.ensureGameSheet/openGameSheet (game-sheet.js — 게임 행 클릭)
│                               # ⚠️ 위 전역은 전부 클릭 시점에 window.X?.()로 참조할 것 —
│                               #   club-schedule.html은 day-detail.js를 kakao-auth.js·game-sheet.js·
│                               #   play-records-utils.js보다 먼저 로드하므로 IIFE 실행 시점 스냅샷은 undefined
│                               # index-page.js → openDateMeetingModal 호출 (홈 미리보기 카드 클릭)
│                               # club-schedule.html → openDateScheduleModal 호출 (막대 클릭)
├── booklet-courses-data.js      # 추천게임 책자 코스 정적 데이터(window.BOOKLET_COURSES, 2026-08)
│                               # DB 아님 — 책자가 자주 안 바뀐다는 전제로 코드 배포로만 갱신
│                               # gameKey는 cottage-games-data-output.js(window.gameData) 키와 일치해야 함
│                               # index.html에서 index-page.js보다 먼저 로드(추천 코스 탭이 참조)
│                               # requests-admin.html도 로드 — 「게임 관리」 시트의 빠른 선택 칩(52개,
│                               #   코스별 그룹)이 이 데이터로 검색 없이 게임을 고를 수 있게 함(2026-08-10)
├── index-page.js               # 메인 페이지 전용 (추천게임, 인기게임, 홈 모임 미리보기)
│                               # day-detail.js 함수 호출 (openDateMeetingModal)
│                               # 🎲 추천 섹션(#recommend)은 '추천 코스'/'게임 더 찾기' 2탭(2026-08).
│                               #   기본 탭은 항상 추천 코스 — 히어로 버튼·헤더메뉴·QR
│                               #   (/qr-game-recommend) 전부 openRecommendSectionOnTab('course')로
│                               #   진입. '게임 더 찾기' 탭은 기존 recommendFilter+gameScroll 그대로.
│                               #   ⚠️ recommendModal(전체화면 조건선택 모달)은 죽은 코드 —
│                               #   여는 버튼이 DOM에 없다(2026-08 확인). 되살리지 말 것,
│                               #   '게임 더 찾기' 탭은 인라인 recommendFilter를 그대로 쓴다.
│                               # ⚠️ initHeroStats 블록을 정리할 때 주의 — 그 finally에
│                               #   index.html#recommend 딥링크 자동 열기가 얹혀 있다.
│                               #   히어로 통계 요소가 없으면 조기 return 하지만
│                               #   **return이어도 finally는 실행**되므로 딥링크는 살아 있다
│                               #   (Playwright 실측: scrollY 740). 블록을 지우면 딥링크가
│                               #   같이 죽는다. 히어로 <p>는 제거됐어도 JS는 살아 있어
│                               #   record_complete/recommend_complete를 계속 읽는다
├── owned-games-page.js         # owned-games.html 전용 (게임 목록 필터·렌더)
├── play-records-utils.js       # 공유 유틸 (parsePhotoUrls / openLightbox / attachAc / initTagInput 등)
│                               # renderCrossBackLink: ?from= 키로 게시판 간 복귀 링크 삽입
│                               #   (플레이기록 ↔ 동호회 기록&사진. 키 추가는 _BACK_TARGETS 한 곳)
│                               # buildRecordCaption/copyCaption: 「이 날 캡션 복사」 조립·복사 (SSOT)
│                               #   ⚠️ 페이지에 사본을 만들지 말 것 — verify-history-caption.js가 막는다
│                               # normalizeNick: 참여자 이름↔회원 닉네임 대조(공백 제거+소문자).
│                               #   맵을 만들 때와 조회할 때 **양쪽 다** 통과시킬 것
│                               # trackMoreMenu/untrackMoreMenu: 이제 빈 껍데기(호출부 호환용).
│                               #   ⋯ 메뉴 위치는 **CSS의 absolute 하나로 끝난다** — JS로 좌표를
│                               #   계산하지 말 것. 2026-07-22에 두 번 틀렸다(fixed+스크롤 추종 →
│                               #   위로 펼치기). 근원은 `.pr-session{overflow:hidden}`이었고 그걸
│                               #   없앤 뒤 헤더가 자기 border-radius를 갖게 해 모서리를 지켰다.
│                               #   회귀 방지: scripts/verify-cross-nav.js ②-b
└── page-labels.js              # 페이지 경로→한글 라벨 단일 소스 (window.COTTAGE_PAGE_LABELS{,_BY_PATH})
                                 # ⚠️ 새 _trackPvOnce/trackPageView 가상 페이지 키를 추가하면
                                 #   COTTAGE_PAGE_LABELS에 라벨도 같이 추가할 것 — 관리자 분석이
                                 #   `_pageLabels[r.page] || r.page` 폴백이라 라벨이 없으면 slug가
                                 #   그대로 노출되고 에러는 안 남(조용히 발생). 2026-07-16에
                                 #   my-board-meeting·other-board가 실제로 이 상태였음(커밋 aaa0b1d)
                                 # script-nav.js를 로드하는 모든 페이지에서 script-nav.js 직전 로드 필수
                                 # 로드 순서: page-labels.js → script-nav.js → game-sheet.js → 페이지별 JS
```

함수 목록 → [docs/js-api.md](js-api.md)

---

## 2-A. 인앱 iframe 시트 패턴

### embed 모드 (`?embed=1`)

URL에 `embed=1` 파라미터가 있으면 `header.js`가 `body.embed-mode` 클래스 추가 후 헤더 미삽입.  
`style.css`에 전역 규칙 → `body.embed-mode .site-header, .site-footer { display:none }`

embed 모드에서는 `header.js`가 `document` 클릭을 가로채 내부 `.html` 링크 클릭 시 `embed=1`을 자동으로 붙여 재이동시킨다(143차-176) — 시트 안에서 다른 내부 링크(브레드크럼, 카드 등)를 눌러도 헤더가 다시 삽입되지 않도록 하는 단일 진입점. 외부 링크·`target="_blank"`·`#`/`mailto:`/`tel:`/`javascript:` 링크는 제외.

사용 페이지:
- `game-location.html` — `openShelfSheet(url)`이 `?embed=1&highlight=GAMEID` URL로 호출
- `guide.html` — `openGuideOverlay(href)` 내부에서 `?embed=1` 자동 추가

⚠️ **헤더 높이 기반 CSS는 `body.embed-mode{--header-total-h:0px}` 하나로 다 안 잡힌다** — 이 재정의는 **body의 자손**에게만 적용되고, `html{scroll-padding-top:var(--header-total-h)}`(style.css 81번째 줄)처럼 **`<html>` 자신에** 선언된 속성은 `<body>`가 그 조상이라 변수 재정의가 거꾸로 안 흐른다(2026-08-10, `game-location.html`의 `shelf=` 자동 스크롤이 헤더 없는 embed 화면에서도 매번 52px씩 못 미치던 사건 — `html:has(body.embed-mode){scroll-padding-top:0}`로 별도 수정, CLAUDE.md 「반복 패치 정지」에도 기록). **새 embed 대응 CSS를 `<html>` 셀렉터에 선언하려면 `body.embed-mode` 변수 재정의로는 안 되고 `html:has(body.embed-mode)`(또는 JS로 `<html>`에도 클래스 부여)가 필요하다.**

### openShelfSheet (game-sheet.js)

게임 상세시트 위에 게임위치 페이지를 바텀시트로 표시하는 스택 내비게이션.

```
게임시트(A) 열림
  → openShelfSheet(?embed=1&highlight=A) 호출
  → 선반 오버레이(z:9600) 표시 — 선반에서 게임 칩 클릭
  → postMessage({ action:'openGame', gameId }) 수신
  → 선반 z:0 + pointerEvents:none (숨김)
  → openGameSheet(B) 호출
  → MutationObserver: #gameSheet.is-active 제거 감지 → 선반 복원
  → ← 뒤로가기 클릭 → overlay.remove() + openGameSheet(prevGameKey)
```

### openGuideOverlay (pages/info/guide.html)

이용안내 카드 클릭 → 해당 페이지를 인앱 iframe 오버레이(z:9000, 92dvh)로 표시.  
`?embed=1` 자동 추가 → 로드된 페이지의 헤더/푸터 자동 숨김.

---

### 모달/iframe 재사용 원칙 (2026-07-07 교훈)

홈에서 iframe으로 열리는 모달(기록·플래너 등)은 재사용 구조이므로 직전 상태가 잔류한다.

1. **open 시점에 목표 상태 전체를 선언한다.** 뷰 모드·주차·목적지 등 원하는 최종 상태를 postMessage 하나로 선언. close 시 청소나 부분 상태만의 리셋은 누락 경로(ESC·백드롭 등)가 생긴다.
2. **src 속성 비교로 재로드 스킵 금지.** iframe 내부 탐색 시 src 속성값은 바뀌지 않는다. 실제 현재 위치 확인은 `contentWindow.location.pathname` 사용.
3. **조건부 재로드.** 같은 페이지에 머물렀으면 postMessage로 탭/상태 전환, 다른 페이지로 이탈했으면 src 재설정.
4. **닫기 경로는 한 함수로 모은다 (2026-07-16 교훈).** dim(백드롭)·✕·ESC가 각자 닫기를 호출하면 레이어 가드(예: 라이트박스 먼저 닫기)가 한 곳에만 들어가고 나머지에서 누락된다. "닫기 요청은 항상 가장 위 레이어 하나만" 규칙을 한 함수(`closeTopLayer` 등)에 넣고 세 경로가 공유.
5. **iframe 경계에서 z-index로 클릭 가능성 추론 금지 (2026-07-16 교훈).** 부모 문서의 요소(모달 ✕ 등)는 iframe **내부** z-index로 가려지지 않는다. iframe 안 오버레이가 `z-index:9999`여도 그 위에 겹쳐 보이는 부모 버튼이 실제로 눌린다. "위 레이어라 밑은 클릭 불가"라는 추론은 같은 문서 안에서만 성립 — 크로스 도큐먼트는 실제 클릭 대상을 이벤트로 확인할 것. 사용자가 "특정 조건에서만"이라고 짚은 반례를 z-index 이론으로 반박하지 말 것.
6. **"닫고 전환"과 "겹쳐 쌓기"를 구분한다 (2026-07-17 교훈).** A에서 B를 열 때 **판단 기준은 사용자가 B를 닫은 뒤 무엇을 기대하는가** 하나다. "닫으면 A가 그대로 있어야지"라고 느끼는 관계면 그건 전환이 아니라 **레이어**다 → **A를 닫지 말고 B가 위에 뜨게** 한다(= z 순서 문제). A를 지우고 B를 연 뒤 복귀 장치(뒤로가기·`backTo`)를 다는 건 **오답**이다 — 복귀 버튼을 안 누르고 닫으면 A가 사라지고, 애초에 사용자는 "전환"한 적이 없다. 실제 사고: 이날모임 상세 → 닉네임 → 보드에서 보드가 모달보다 z가 낮다는 이유로 모달을 `remove()`했다가 "보드 닫으면 상세가 없어진다"는 지적을 받았고, 이어 `backTo`를 붙이려다 또 반려됐다. 정답은 **그 모달만 보드 아래 z로 내리고 안 닫는 것**이었다.
   - **z가 안 맞으면 z를 고친다 — 단 공유 클래스 전체가 아니라 그 인스턴스만.** `.dd-overlay`(9200)를 통째로 낮추면 **모임보드 서브시트 안에서 열리는** `openDatePreviewModal`이 뒤에 깔린다 → `openDateMeetingModal`에만 `.dd-overlay--under-board`(9050)를 줬다. **같은 클래스를 쓰는 다른 호출부가 "무엇 안에서" 열리는지 먼저 grep할 것.** (R10c 「z를 올려 고치지 말 것」의 대칭 — **내려도 깨진다**.)
   - **반대로 정당한 `close()`도 있다**: B가 A보다 z가 높을 수 없는 구조적 이유가 있고(예: 박스모달 9700 > 게임시트 9500) 사용자도 복귀를 기대하지 않는 자리. 이땐 닫는 게 맞다. **규칙은 "닫지 마라"가 아니라 "닫기 전에 레이어로 풀리는지 먼저 보라"이다.**

7. 🚨 **iframe은 부모 페이지의 구성요소지 별도 방문이 아니다 (2026-07-20 교훈).** index.html이 플래너·기록 모달을 iframe으로 **미리 로드**하는데, 각 프레임이 `supabase-client.js`를 다시 로드해 **자기 세션 추적을 돌리고 있었다** → 한 사람이 한 탭만 열어도 체류시간이 **3배**로 계상됐고, 사용자가 이동한 적 없는 페이지에 `page_views`·`record_start`까지 쌓였다(발견 #24·#25). 지금은 `_shouldSkipSessionTracking()`이 막는다.
   - ⚠️ **단 `trackEvent`(사용자 행동)에는 걸지 않는다** — 기록 모달 안에서 실제로 저장한 건 진짜다. 프레임을 이유로 버리면 퍼널이 다시 빈다. **가르는 기준은 "iframe 안에서 일어나도 진짜인가?" 하나.**

---

## 3. 인증 흐름

```
[유저] 카카오 로그인 버튼 클릭
  → kakao-auth.js: kakaoLogin()
  → Kakao.Auth.authorize() → 카카오 OAuth 서버
  → auth-callback.html?code=... 리다이렉트

auth-callback.html:
  1. code로 카카오 REST API 토큰 교환
  2. 토큰으로 /v2/user/me 프로필 조회
  3. localStorage.cottage_custom_nick_{userId} 확인
  4. 없으면 Supabase REST API로 DB 프로필 닉네임 조회 (다기기 복원용)
  5. user 객체 구성: { id, nickname, kakaoNickname, profileImage, kakaoProfileImage }
  6. localStorage.kakao_user 저장
  7. 원래 페이지로 window.location.replace()

[페이지 로드 후]
kakao-auth.js: initKakaoAuth()
  1. localStorage.kakao_user 파싱 → updateLoginUI()
  2. _cottageSess.get(uid) → 당일 첫 방문 체크 (lastVisitDate ≠ 오늘)
  3. 당일 첫 방문 → visitCount++ 후 upsertProfile() (방문 카운트 + 누적 시간 DB 반영)
  4. 당일 재방문 → startSession() (체류 시간 세션 시작만)
  5. 로그인 UI 업데이트, '내 활동' 버튼 삽입

[닉네임 변경]
  promptNicknameChange()
  → localStorage 갱신 (kakao_user + cottage_custom_nick_{id})
  → upsertProfile()로 DB도 갱신

[로그아웃]
  kakaoLogout()
  → localStorage.kakao_user 삭제
  → cottage_custom_nick_*, cottage_custom_photo_* 는 유지
```

---

## 4. 게임기록 흐름

```
[기록 입력 (신규)]
game-reviews.html — 기록 입력 탭
  1. 날짜, 그룹명 입력 (그룹명: 자동완성 - DB groupNames 기반)
  2. addRow()로 게임 행 추가
     - 게임명 검색 (COTTAGE_GAMES 자동완성)
     - 인원수 토글 버튼 (1~8명)
     - 플레이시간, 참여자 (태그칩 방식), 점수/메모
     - 사진 최대 5장 선택 (multiple file input → _photoFiles 배열 관리)
     - 후기 텍스트
  3. 저장 버튼 클릭
     - 각 게임 행의 _photoFiles 배열 순회 → uploadPlayPhoto() 업로드
     - 1장: 단일 URL 문자열, 2장 이상: JSON.stringify([...]) 저장
     - CottageDB.recordGamePlay() 호출 (게임당 1 INSERT)
     - 저장 성공 → 기록 보기 탭으로 자동 전환

[기록 조회]
  - 모임별 보기: group_name → date → records 3단 계층
  - 게임별 보기: game_id → group/player → records
  - DB에서 최대 200건 조회

[기록 수정]
  - ✏️ 버튼 클릭 → 인라인 수정폼 생성
  - 기존 사진: parsePhotoUrls()로 썸네일 전체 표시, 각 장 X 삭제
  - 신규 사진: multiple file input → pie-new-grid 관리
  - 저장: 남은 기존 URL + 새 업로드 URL 합산 → photo_url 갱신
  - CottageDB.updateGamePlay() 호출

[기록 삭제]
  - ✕ 버튼 → confirm → CottageDB.deleteGamePlay(id)
  - 로컬 recordsData 배열에서도 제거 → 리렌더링
```

---

## 5. 프로필 흐름

```
[DB profiles 갱신 시점]
  - 하루 첫 방문 시 upsertProfile() 실행
    - visit_count: _cottageSess의 visitCount 값 사용
    - total_minutes += timeSec (초 단위) → 분으로 변환
    - last_seen_at 갱신
    - nickname: 기존 커스텀 닉네임 보호 로직 적용
    - selectError 발생 시 시간 필드 업데이트 제외 (0 덮어쓰기 방지)

[닉네임 우선순위]
  auth-callback: cottage_custom_nick_{userId} > DB 닉네임 > 카카오 닉네임
  upsertProfile: 기존 DB 닉네임(≠ 카카오명)이 있으면 유지, 없으면 새 닉네임 저장

[프로필 사진 우선순위]
  auth-callback: cottage_custom_photo_{userId} > 카카오 프로필 사진
  initKakaoAuth: getProfileSnapshot()으로 DB photo_url 복원 (다기기 동기화)
  → profiles.photo_url에 저장됨 (updateProfilePhoto)

[내 활동 패널 (openProfilePanel)]
  - getMyStats()로 플레이 기록, 코멘트, 건의, 모임 참석 집계
  - player_names ILIKE '%nickname%'로 참여 기록도 병합
  - _cottageSess에서 visitCount, timeSec, prevSeenDt 표시

[모임 보드 ↔ 회원 자기소개 연동 (143차)]
  - SSOT: profiles.bio(한줄소개) + member_intros(활동지역/참여시간/이동범위/모임스타일, user_id당 1행)
    + meeting_game_prefs(이번에 하고싶은 게임/룰 설명 가능한 게임)
  - 내 보드 > 모임 보드(kakao-auth.js openProfilePanel('meeting'))와
    회원 자기소개(club-intro.html)가 동일 테이블/컬럼을 읽고 씀 — 한쪽 수정이 다른 쪽에 즉시 반영
  - 자기소개 작성은 로그인 필수(member_intros.user_id 기준 upsert, 유저당 1행)
  - 회원 자기소개 카드 클릭 → openOtherMeetingSheet(userId). **Phase C(2026-07-15)부터 얇은 래퍼**로
    openProfilePanel('meeting', {userId, readOnly:true}) 호출 — 본인 내 보드와 동일한 통합 패널을 편집
    컨트롤 없이·비공개 섹션(알림/교환권/함께한시간) 제외하고 표시. 본인 카드 클릭 시 openProfilePanel('meeting')으로 위임
    (구 별도 otherMainPanel/_openOtherMeetingSubSheet 구조는 폐지)
  - **Phase D(2026-07-15) 진입점 통일**: 닉네임 클릭 진입점을 두 갈래로 확정 — **모임 참여자**(`.sched-bar-name`)는
    openOtherMeetingSheet(모임 보드 직행), **그 외 전부**(게임시트 좋아요/궁금해요 아바타, 게임평·플레이기록 닉네임/리뷰어 이름)는
    openOtherProfileSheet(읽기전용 내 보드 전체). 플레이기록 게시판 참여자 태그가 기존에 모임 보드로 잘못 연결돼 있던 것을
    수정하고, 게임평·리뷰어 이름에는 클릭 진입점을 신규 추가. 상세는 js-api.md openOtherProfileSheet/openOtherMeetingSheet 항목.
  - ⚠️ **Phase D가 club-history.html(동호회 기록 & 사진)을 빠뜨렸고 2026-07-22에 보강**했다 — 그 페이지 참여자 태그엔
    `data-nick`도 핸들러도 없어 구조상 100% 안 열렸다. **닉네임을 렌더하는 화면을 새로 만들면 이 진입점을 함께 붙일 것.**
    닉네임→userId 맵 규칙은 **회원 명부 ∪ 기록 작성자**(한쪽만 쓰면 닉네임 변경자·미기록 회원이 조용히 빠진다).
    검사: `node scripts/audit-nick-click.js`(회원 연결률) + `node scripts/verify-cross-nav.js`.
```

---

## 6. 이용시간 / 방문자 추적 흐름

```
[로그인 세션 시작]
  startSession(userId) ← initKakaoAuth()에서 호출
  _sessionStart = Date.now()
  _sessionUserId = userId

[시간 누적 (로컬)]
  visibilitychange → 탭 숨김: _flushTime()
  beforeunload / pagehide → 이탈: _flushTime()

  _flushTime():
    elapsed = Date.now() - _sessionStart (초 단위)
    cottageSess.timeSec += elapsed

[DB 반영]
  _syncTimeToDBNow() ← visibilitychange/beforeunload/heartbeat(1분)
    localhost 방문 시 즉시 return (dev 환경 카운팅 제외)
    profiles.total_minutes / today_seconds UPDATE
    page_sessions INSERT (page, user_id, session_key, duration_sec, entered_at, referrer)

[비로그인 방문자 추적]
  cottage-auth-changed 이벤트 없거나 user=null → _startAnonHeartbeat()
    localhost 방문 시 즉시 return
    anon_sessions UPSERT (session_key, last_seen_at) — 1분 주기 갱신
    page_sessions INSERT (user_id: null, session_key, page, referrer) — 입장 1회

[방문자 마커 (__visitor__)]
  DOMContentLoaded → localhost/admin 제외
  하루 첫 방문 (cottage_visited_{date} 미존재) 시:
    page_views INSERT (page: '__visitor__', referrer: effectiveSource or null,
                       session_key, user_id, is_bot)  ← 143차-178/190부터
  관리자 분석에서 유입 명/회 집계 = __visitor__ 행의 user_id || session_key 기준
  (page_sessions와 섞지 않음)

[session_key]
  getSessionKey() ← localStorage.cottage_session_id (없으면 생성)
  로그인/비로그인 모두 동일 키 사용
  비로그인 명 집계 = page_sessions.session_key WHERE user_id IS NULL
```

---

### 6-1. 관리자/로컬 카운팅 제외

2026-07-02부터 localhost/127.0.0.1 및 관리자(OWNER_KAKAO_ID=4916417947)는
`page_views`, `page_events`, `page_sessions`, `anon_sessions`, `profiles.visit_count/total_minutes/today_seconds`
누적에서 제외한다. 관리자 분석 화면도 관리자 `user_id`가 붙은 `rows/pageViews/profiles`를 표시 집계에서 제외한다.

## 7. 게임 데이터 시스템 game-system/

```
game-system/
  config/
    difficulty-levels.js          ← 난이도 5단계 기준 (kids/beginner/light/heavy/hardcore)
    shelf-locations.js            ← 선반 위치 그룹 (A~G)
    bgg-label-map.js              ← BGG 영어 mechanics/categories → 한국어 lookup map
    tags/                         ← 태그 시스템 기준 정의
  game-data/
    source/                       ← 원본 입력 (수동 관리)
      1-bgg/csv/                  ← BGG 랭킹 CSV
      2-cottage-manual/           ← cottage-owned-games.xlsx
      3-abbr/game-abbr.json       ← BGG ID → 약칭 매핑 (수동 관리)
      3-abbr/game-abbr-byname.json ← ownedName → 약칭 매핑 (bggId 없는 게임 전용)
                                    조회 순서: abbrMap[bggId] → abbrByName[ownedName] → titleKo 앞 2글자 폴백
    staging/                      ← 자동 생성 중간물 (재생성 가능)
    library/                      ← 최종 정제물 (사이트가 읽는 데이터)
  tools/                          ← 빌드/관리 스크립트
```

---

## 8. 빌드 파이프라인

```
cottage-owned-games.xlsx
    ↓
tools/1-matcher/b_run-local-match.js
    ↓ 2-match-map.json
tools/2-fetcher/a_fetch-bgg-game-data-by-id.js
    ↓ bgg-game-details.json
node game-system/tools/3-build-master/build-master.js
    ↓ cottage-owned-games-master.json
node game-system/tools/4-label-translator/description-translator.js
    ↓
node game-system/tools/5-build-output/build-output.js
    ↓ cottage-games-data-output.js → window.gameData
```

주요 빌드 명령:
```bash
node game-system/tools/3-build-master/build-master.js
node game-system/tools/4-label-translator/description-translator.js --summary
node game-system/tools/5-build-output/build-output.js
```

핵심 원칙: BGG API는 실시간 호출하지 않는다. source → staging → library → output 레이어 분리. output만 사이트에서 읽는다.
