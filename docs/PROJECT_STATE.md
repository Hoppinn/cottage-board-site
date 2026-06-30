# PROJECT_STATE — 코티지보드 현재 상태 보고서

최종 갱신: 2026-06-30 (143차-156)

---

## 0. 진행 중 작업 (세션 시작 시 확인)

### 142차 완료 항목 (2026-06-22)

| # | 내용 | 커밋 |
|---|------|------|
| 취향보드 Phase 1 전체 | 한줄소개·게임목록(추가/삭제/직접입력)·피하는유형 | 142차-1 |
| 게임시트 양방향 연결 | 좋아요/궁금해요 유저 아바타 → 접기/펼치기 (N명▾) | 142차-2, 8 |
| 토스트 → 취향보드 직접 진입 | `openProfilePanel('taste')` | 142차-3 |
| fix: gameData 필드 경로 | `g.display` → `g.title?.display` | 142차-5 |
| 검색 UX | ESC 닫기, 이미추가됨 표시 | 142차-6 |
| 취향보드 UX 개선 | 게임목록 더보기/접기, 피하는유형 UX(🚫/빨간), bio 예시 칩 | 142차-8,11 |
| 기록보드 사진 표시 | 최근 4장 썸네일 + 클릭→라이트박스 | 142차-8 |
| guide.html 오버레이 | 링크 클릭 → 인앱 iframe 시트 (✕ 닫기) | 142차-9 |
| 모임플래너 개선 | 자유댓글 제거, 참여자 클릭 → 아바타+bio+일정 시트 | 142차-10 |
| fix: 삭제 핸들러 Number() | `Number(gameId)` → `gameId || null` (한글 키 대응) | 142차-8 |
| fix: 신규 게임 삽입 위치 | `appendChild` → `insertBefore(more-wrap)` | 142차-12 |
| UX 5종 (142차-16) | 기록보드 사진 토글 버그, 피하는유형 기본접힘+count, 모임시트 닫기버튼, 가이드 ESC/배경 닫기 | 142차-16 |
| 버그 3종 + UI (142차-18) | 게임카드 스크롤 peek(@media 158px 오버라이드 제거), 이미지 경로 서브페이지 깨짐(normalizeImagePath), 다크율에 속죄를 제목 수정, 처음이시면 문구 추가, 게임 위치 전시된게임(G) 추가 | 142차-18 |
| 알림 4종 개선 (142차-19) | 교환권 지급/사용 관리자 알림패널 표시, 알림 개별 읽음 버튼, 알림 0건에도 버튼 표시, 후기→게임평 텍스트 변경. 카카오 알림 webhook 인프라 추가(adminWebhookUrl 설정 필요) | 142차-19 |
| UX 6종 + 자동완성 (142차-26~28) | 갈색띠 다중기록자, 알림 더보기 토글, 알림 재진입 읽음 유지, 자동완성 빈입력 suppress, 게임추가 autocomplete off, 게임평 label fix | 142차-26~28 |
| 취향보드: bio 멀티태그·공유 (142차-29~30) | 한줄소개 칩→다중선택 태그, 직접입력, 커뮤니티 공유 태그, 새 칩 4개 추가. 피하는유형 직접입력+커뮤니티 공유 | 142차-29~30 |
| 교환권 알림 Supabase DB webhook 전환 (142차-31~32) | JS fetch→Supabase DB webhook, voucher_log에 nickname/note 컬럼 추가, Make 라우터 지급/사용 경로 분리, 상품명 표시 | 142차-31~32 |
| 이미 좋아요한 게임 토스트 (142차) | 재클릭 시 2버튼 토스트 "이미 좋아요" 표시, 토스트 5초로 연장 | 142차 |
| curious 토스트 + curious_play 알림 (142차-37~41) | 궁금해요 게임 플레이 기록 시 본인 토스트(2단계 확인)+좋아요 전환 / 다른 사용자 인앱 알림 / tagged 알림에 "게임평 쓰러 가기 →" 링크 / 업적·교환권 토스트 8s+수동✕ | 142차-37~41 |
| 어드민 비주얼 분석 UI 개선 (142차-42~43) | 유입경로×페이지 N명(M회) / 차트 정수 눈금 / 주요유입 명 먼저 / 사용자별 기본 열림 / 30일 신규 카드만 / 방문자 3명 기본+더보기 / 관리자 방문 통계 미포함+crossUserMap 버그 수정 | 142차-42~43 |
| 다른 플레이어 프로필 보기 (142차-44) | 좋아요/궁금해요 칩 클릭 → 읽기전용 취향보드 시트 / getUserTasteProfile API 추가 / 본인 클릭 시 내 보드 취향탭으로 | 142차-44 |
| 리액션 칩 개선 (142차-45~51) | rep_achievement_id 코티지 캐릭터 이미지 우선 / 시트 슬라이드업 애니메이션(overflow:hidden+fill-mode:both) / 칩 구조 개선(버튼 안 ▾ 토글, 이름만 소형 태그) / is-active 시각 효과 제거(베이지 유지) / 취소 시 즉시 칩 반영(취소 분기에 _updateReactionSection 추가) | 142차-45~51 |
| 게임 위치 바텀시트 (142차-52~56) | openShelfSheet: 게임상세 위에 게임위치 iframe 시트 (z:9600) / embed=1 파라미터로 헤더·푸터 숨김 / highlight 칩 강조+섹션 맨 앞 정렬 / ← 뒤로가기 버튼 + 이전 게임시트 복원 / 게임 클릭 시 스택 (선반 숨김→게임B→닫으면 선반 복원, MutationObserver) / displayTags onclick 제거 / Z시리즈 0→없음, 종→개, 특수섹션 0개 표시 | 142차-52~56 |
| 리액션 토스트 통일 + 이용안내 embed (142차-57) | 좋아요 재클릭 확인 토스트 제거 → 직접 토글(궁금해요 방식으로 통일) / header.js embed=1 감지 → body.embed-mode + 헤더 미삽입 / guide.html openGuideOverlay에 ?embed=1 자동 추가 | 142차-57 |
| 관리자 섹션 재정렬 (142차-58) | groupCharts: 요약+날짜별 차트만 / groupReferrer(신규): 유입경로 차트+보조지표 / groupAnalysis 중간 배치 / 유입경로 메뉴 버튼 추가 | 142차-58 |
| 게임평 업적 버그 수정 (142차-59) | review 업적 카운트: 별점(game_ratings) → 게임평 텍스트(game_comments) / insertComment 후 checkAchievements('review') 트리거 추가 / getUserCommentCount 함수 신규 | 142차-59 |
| 게임시트 버튼 + 모달 z-index + 변수화 (142차-60~61) | 게임상세시트 게임평/플레이기록 섹션 헤더에 남기기/기록하기 버튼 추가 / 모달 z-index 2200→9700 / style.css z-index 전체 변수화: --z-profile(9100) --z-subsheet(9200) --z-sheet(9500) --z-shelf(9600) --z-sheet-modal(9700) --z-top(9999) | 142차-60~61 |
| 메인 게임시트 게임평 제출 후 미리보기 갱신 (142차-62) | onSubmitCommentModal에 initSheetCommentsPreview 추가 — 기존 initSheetComments(기록전체보기용)만 호출해 메인시트 미리보기가 갱신 안 되던 버그 수정 | 142차-62 |
| 플레이기록 수정 후 스크롤 유지 (142차-63) | renderRecords 재렌더 전후 scrollY 저장/복원(rAF) — 수정/삭제/사진삭제 3곳 | 142차-63 |
| 이번달 참여일정 카드 통합 (142차-64) | 함께한 시간 카드에 이번달 meeting_votes(내 투표) 표시 / 최대 2줄+"외 N건" / "M/D 정기모임" 형식 / 카드 패딩 축소 | 142차-64 |
| 게임시트 개선 다수 (142차-74~85) | 내 닉네임 ★ 표시 / 플레이기록·게임평 가로스크롤 미리보기 / 사진 첨부(play modal) / 게임평 "기존 플레이기록에 연동" / 전체기록시트 섹션순서(플레이→게임평→사진) / 더보기/닫기 토글 / 게임위치 협력→hard_coop/easy_coop 매핑 / reclassify-coop(협력 41개 재분류) / 사진 상세시트 아래로 펼치기(sheet-photo-grid) / 기본 4장 표시(짝수) | 142차-74~85 |
| fix: 바텀시트 사진 미표시 (142차-89) | _fetchGamePhotos가 BGG ID 쿼리 결과가 있으면 fallback 안 탔던 버그. gameKey·bggId 병렬 조회+중복 제거로 수정 | 142차-89 |
| fix: "..." 메뉴 수정/삭제만 남기기 (142차-90) | 💬👍 바텀시트 링크 제거, 수정·삭제만 표시 | 142차-90 |
| refactor: game_id 이중저장 근본 수정 (142차-91) | supabase-client.js 4개 함수 배열 지원(.in()), _gameIds(gameKey) 헬퍼 추가, script.js 전체 fallback 패턴 제거, gameIdByName→bggId 우선 저장 | 142차-91 |
| fix: 기록페이지 사진 라이트박스 캡션 (142차-92) | 그룹·날짜·인원·참여자·시간·점수 표시 — 바텀시트와 동일한 포맷 | 142차-92 |
| fix: 바텀시트 사진 미리보기 +N장 가로펼침 (142차-93) | initSheetPhotoPreview: 전체 사진 렌더링+앞 3장만 표시, +N장 클릭 시 가로 펼침. _attachPhotoLightbox에서 .pr-rec-photo-more 라이트박스 바인딩 제거 | 142차-93 |
| fix: PC 게임위치 시트 전폭 (142차-94) | .shelf-sheet-box max-width:480px 제거 → 게임시트와 동일한 전체 화면 폭 | 142차-94 |
| design: 플레이기록 카드 개별 박스 디자인 (142차-95) | sheet-my-record-item: border→radius+배경+gap 개별 카드 스타일 적용 | 142차-95 |
| fix/feat: 게임평·사진 작성자 표시 + 모임연동 버그수정 (142차-96) | Item2: onOpenCommentInput _gameIds 적용(기존 모임 연동 미노출 수정) / Item3: placeholder 텍스트 변경 / Item5: 라이트박스 캡션 닉네임 추가 / Item6: 전체사진 헤더 N명의 사진+그리드 개별 작성자명 / Item7: 게임평 앞 작성자 이름 표시 | 142차-96 |
| feat: 기록게시판 사진 추가 탭 (142차-97) | 세 번째 탭 "사진 추가" — 전체 기록 목록에서 원하는 기록 선택 후 사진 업로드, 타인 기록에도 추가 가능 | 142차-97 |
| fix: 게임 바텀시트 코너 삐져나옴 근본 수정 (142차-118) | `.game-sheet-panel` overflow:hidden(외부 클리핑) + `.game-sheet-scroll` overflow-y:auto(내부 스크롤) 분리. JS scroll 참조 5곳 `.game-sheet-panel` → `.game-sheet-scroll` 변경. **3세션 소요 근본 원인: Chrome GPU 컴포지터가 overflow-y:auto+border-radius 동일 요소에서 배경 클리핑을 직각으로 렌더링하는 버그.** DESIGN_RULES.md §6 참조 | 142차-118 |
| 내 보드 모임 플래너 연동 + 모임페이지 로그인 버튼 (142차-123) | 함께한 시간 서브시트 상단에 "📅 모임 플래너 바로가기 →" 초록 버튼 추가 (경로: index.html/서브페이지 공용). 모임 플래너 날짜 상세 뷰에서 로그인 힌트가 텍스트만 있던 문제 → 실제 카카오 로그인 버튼으로 교체. | 142차-123 |
| 디자인 시스템 정보성 텍스트 색·굵기 통일 (142차-124~133) | 페이지별 순차 적용: `--text-info(#505050)+500` 원칙. about.html, price-rules.html, club-rules.html, guide.html, game-reviews.html, owned-games.html, 요청하기, 내보드 패널 완료. 갈색 배너 12% 연하게(#7a4828→#8a5e42 등). club.html·club-schedule.html은 이미 CSS변수 사용으로 패스. | 142차-124~133 |
| 수집보드 카드 3줄 표시 + 취향보드 카드 간격 (142차-133) | 캐릭터·도감·업적을 1줄(·구분)→개행(\n) 3줄 표시. 취향보드 카드 #태그 bio-row/games-row 분리, margin-top:3px. | 142차-133 |
| fix BUG-B + 추가 기능 (142차-136) | BUG-B: getGameComments 배열 지원(_gameIds 전달), getMyStats game_key 컬럼 수정, profile 게임평에 game_comments 통합. 추가1: 기록 페이지 상단 좋아요/궁금해요 추가. 추가2: game-reviews ··· 메뉴에 좋아요/궁금해요 + lazy load 상태 | 142차-136 |
| fix BUG-A/C + 궁금해요 자동취소 (143차-136) | BUG-C: profile-game-link 버튼만 클릭 가능. BUG-A: +N 클릭 시 인라인 확장(라이트박스→그리드). 궁금해요 취소 토스트 String() 타입 수정. 좋아요 클릭 시 궁금해요 자동취소(onSheetLike/onPrMenuLike) | 143차-136 |
| feat: 내보드 사진 3열 그리드+캡션+삭제 / 정리법 버튼 (143차-137) | BUG-A완성: 3열 CSS grid, 캡션(작성자/모임/날짜/인원/시간/점수), 본인 사진 삭제. 정리법: _ORGANIZER_GAMES 오브젝트+버튼+폴더 인프라(게임명 등록 후 활성화) | 143차-137 |
| fix: 게임시트 열림 불가 버그 (143차-148) | _getOrganizerPhotos에서 getGameName 직접 호출 → game-reviews.html에서 ReferenceError. window.getGameName?.()으로 수정 | 143차-148 |
| design: 섹션 순서·굵기 전반 개선 (143차-149) | 게임평→사진→플레이기록 순서 통일(게임시트/기록시트/기록보드). 게임평 PREVIEW 3. 전역 font-weight 일반화(검색/게임정보/기록/보드 항목 500으로) | 143차-149 |
| design: 관리자 분석 섹션 고정헤더+클릭이동 (143차-154) | .admin-group-title position:sticky+top:--header-total-h+배경색 추가. .admin-group scroll-margin-top 추가로 menu-card 클릭 이동 시 헤더 가림 방지 | 143차-154 |
| design: 플레이기록 인원/시간/점수 칩 가독성 (143차-153) | .sheet-play-info-tag font-size 11→12px, font-weight 700→500, padding 2px 8px→3px 9px | 143차-153 |
| design: font-weight 조정 시리즈 (143차-155-test1~15) | 게임시트 고정헤더(900→700), 히어로설명(500→700), 기록시트타이틀(900→700), 추천안내/오버레이타이틀(→700), 수집보드업적축레이블(600→500), 추천필터하위옵션(800→500). 플레이기록카드: 참여자배지 600, 편집아이콘 opacity 0.3→hover 1.0 | 143차-155-test1~12 |
| design: 플레이기록 배지 재편 (143차-155) | 인원/이름/시간 한 줄 합치기(파이프 구분자), 점수 둘째줄, 배경 var(--cream), 색 #1e1a16, 구분자 .badge-sep 옅은색. 게임리뷰 점수 슬래시→파이프 동일 적용 | 143차-155 |
| design: 추천필터 UX 개선 (143차-155) | "나에게 맞는 게임 찾기" 서브타이틀 배너 이동. 3버튼 단독개폐(exclusive toggle). 처음이시면 안내 버튼 하단 고정. 외부박스 제거(v3 투명). 하나만선택 여백 축소 | 143차-155 |
| design: 좋아요/궁금해요 본인 표시 (143차-152) | #sheetLikeBtnWrap.is-active → 초록 테두리+배경, #sheetCuriousBtnWrap.is-active → 앰버 테두리+배경. JS에서 is-active 클래스 이미 설정 중, CSS 스타일만 추가 | 143차-152 |
| design: 기록시트 고정헤더 (143차-151) | .sheet-record-header position:sticky+top:0, 배경색, 음수마진으로 full-width. .game-sheet-close z-index:10 보강. PC 32px 패딩 대응 반응형 오버라이드 추가 | 143차-151 |
| design: font-weight 일반화 2차 (143차-150) | items 13~30 A그룹. 필터칩/게임카드제목/소유게임제목/히어로텍스트/버튼(.btn)/검색입력/페이지네이션/about·club소개/모임기록게임명/게임평내용/요청카드명 → 500. 게임정보 진행·테마·디자이너 레이블(.sheet-mechs-label/.sheet-meta-label) 700 복원. 19=이미완료. B그룹(23/24/26/27) 미실행 | 143차-150 |

### 142차 테스트 목록

✅ SQL 실행 완료 (2026-06-24)
✅ 카카오 알림 webhook 연결 완료 → Supabase DB webhook 방식으로 전환 완료 (Make 시나리오 5213346, 142차-31~32)

**테스트 체크리스트:**
- [ ] 취향보드: 한줄소개 편집→예시 칩 표시→클릭→저장
- [ ] 취향보드: 게임 검색 추가/삭제 (카탈로그 & 직접입력)
- [ ] 취향보드: 6개 초과 시 "더 보기 (N개 더)" 표시 + 펼치기
- [ ] 취향보드: 검색 후 추가된 아이템이 "더 보기" 위에 삽입되는지 확인
- [ ] 취향보드: 피하는 유형 클릭→🚫 빨간, 재클릭→해제
- [ ] 게임시트: 좋아요 후 토스트 "취향 보드 →" 클릭 → 취향보드 직접 열림
- [ ] 게임시트: 좋아요/궁금해요 "N명 ▾" → 클릭 시 아바타 펼침
- [ ] 기록보드: 사진 섹션에 최근 사진 썸네일 표시 (사진 있는 유저)
- [ ] 기록보드: 사진 클릭 → 라이트박스
- [ ] guide.html: 플레이기록/동호회/요청하기/추천게임찾기 클릭 → 오버레이 시트
- [ ] guide.html: ESC / 배경 클릭 → 오버레이 닫힘
- [ ] 기록보드: 사진 "📸 N장" 버튼 클릭 → 토글 작동 확인
- [ ] 취향보드: 피하는 유형 기본 4개만 표시 + "더 보기 (4개 더)" 버튼
- [ ] 취향보드: 피하는 유형 태그 클릭 시 "N개 선택됨" count 갱신
- [ ] 모임플래너: 프로필 시트 ✕ 버튼 → 닫힘
- [ ] 모임플래너: 참여자 이름에 점선 밑줄 표시 + 클릭 → 아바타+소개+일정 시트
- [ ] 모임플래너: 자유댓글 섹션 미표시 확인
- [ ] **[96]** 게임시트 "게임평 남기기" → 카네기 등 game-reviews에서 입력한 기록에서도 "기존 플레이 기록에 연동" 체크박스 노출
- [x] **[96]** 게임평 남기기 모달 placeholder → "게임에 대한 평가를 남겨주세요" ✅ 확인
- [x] **[96]** 바텀시트 사진 클릭 → 라이트박스 캡션 첫 줄에 닉네임 표시 ✅ 확인
- [x] **[96]** 기록게시판 사진 클릭 → 라이트박스 캡션 첫 줄에 닉네임 표시 ✅ 확인
- [x] **[96]** 여러 명 사진 올린 게임 바텀시트 → 헤더 "N명의 사진" / 전체사진 그리드 각 이미지 아래 닉네임 ✅ 확인
- [x] **[96]** 기록게시판 게임평 있는 카드 → 게임평 앞에 작은 [닉네임] 태그 표시 ✅ 확인
- [x] **[97]** 기록게시판 "사진 추가" 세 번째 탭 표시 ✅ 확인
- [x] **[97]** 사진 추가 탭 → 기록 드롭다운 전체 기록 최신순 표시 ✅ 확인
- [x] **[97]** 사진 선택 → 그리드 미리보기 → 추가하기 → 해당 기록에 사진 반영 ✅ 확인
- [x] **[98]** 기록게시판 사진 3장 초과 시 "+N장" 클릭 → 라이트박스 아닌 가로 펼침 ✅ 확인

### 142차 보류 항목

| 항목 | 사유 |
|------|------|
| 한줄소개 GPT 연동 | 이전 기획 내용 복원 불가 — 사용자가 다시 공유 필요 |
| 모임플래너 참여자 UI 추가 개선 | 방향 논의 필요 (현재: 이름 클릭→프로필 시트) |
| 모임 플래너 Phase 3 게임 투표 | Red — Plan 필수, meeting_vote_games 테이블 신규 |
| 취향보드 Phase 2 (성향 5축) | Phase 1 테스트 후 진행 |

**143차-156 완료 (2026-06-30)**
- ~~[4]+[5]~~ 게임시트 링크 2줄 재배치 완료 (게임위치+책장 통합 1줄 / 룰영상+정리법 2줄)
- ~~[8]~~ stats flex:1 확장 + 폰트 14→15px 완료
- ~~[6] item 5~~ 바텀시트 닫을 때 스크롤 위치 복원 완료
- 배지 배경 var(--cream), 텍스트 #3d2a18, 파이프 구분자 적용
- 추천필터 exclusive 토글, 외부박스 제거, 버튼에 색상 적용, hint 위치
- 기록페이지 고정헤더 gap 수정
- 게임시트 박스 여백·패딩 전반 조정 (진행/디자이너/게임설명/게임평 등)
- sheet-meta-label p태그 브라우저 기본 margin 제거 (같은 디자이너 박스 상단 균등)

**다음 작업 후보 (우선)**
- **[143차-155 미완료 — [6] item 13]** 기록보드 게임평/플레이기록 게임타이틀에 썸네일 추가 (JS)
- **[143차-155 미완료 — [9][10][10-1][11][11-1]]** 내보드 대공사 (🔴 Red — Plan 필요, kakao-auth.js)
- **[추천필터 미완료]** "2-3그러면 이제" 이후 잘린 항목 — 사용자에게 재입력 요청 필요
- **[내보드 정기모임 위치 재구성]** — 현재 정기모임이 "함께한 시간" 카드 안에 있는데, 별도 섹션으로 분리하거나 구조 재구성 필요. 아직 구상 단계.
- **[취향보드 수정 후 내보드 즉시 갱신]** — 취향보드에서 뭔가 수정하고 내보드로 돌아오면 정보가 바로 갱신 안 됨. 닫았다 열어야 갱신됨. 탭 전환 또는 저장 후 관련 섹션 re-render 트리거 필요.
- **[취향보드 한줄소개 칩 줄바꿈]** — "새로해보는..." / "익숙지않은..." 두 칩이 1줄에 같이 있어야 하는데 현재 줄바꿈됨. 칩 너비 축소 또는 font-size 조정으로 해결 가능 여부 확인.
- **[guide.html 요청하기 카드 미세조정]** — 요청하기 카드 중앙정렬 + 너비 축소 후 레이아웃이 어색한 부분 있음. 나중에 미세조정 예정.
- **[플레이기록 기록입력 탭 안내 문구]** — 기록입력 탭의 게임 검색 위에 작은 안내 한 줄 추가. `🎁 첫 플레이 기록 작성 시 음료 교환권 1장 지급`. 기록보기 탭은 변경 없음.
- **[게임위치 카테고리 스티키 헤더]** — 게임위치 페이지에서 특정 카테고리(예: 파티게임) 토글 열면 해당 카테고리 헤더 sticky 고정. 토글 닫거나 다른 카테고리로 이동 시 해제. 게임 바텀시트 → "꽂혀있는 책장 보러가기" 진입 시에도 동작: 게임위치 고정헤더 하단에 카테고리 헤더가 추가 sticky되는 구조.
- **[추천게임 전체카드 페이지 고정헤더 크기 점검]** — `더보기` 버튼 클릭 후 나오는 전체 카드 페이지(owned-games 계열)의 고정 헤더가 비정상적으로 큰지 확인 필요. 재현 → 비교 → 필요 시 CSS 수정.
- **[헤더 클릭 시 스크롤 살짝 올라가는 버그]** — index.html에서 헤더(로고/중앙텍스트) 클릭 시 페이지가 미세하게 위로 스크롤됨. `goHomeLogo` → `backToHero()` → `scrollTo({top:0})` 경로 또는 `goHomeCenter`의 preventDefault 누락 의심. 저비용 수정 가능 시 즉시 처리.
- **[Hero CTA 개선 — 확정 사항]** — Primary 버튼: 초록 제거 → 베이지/크림 Filled 버튼으로 복원. Secondary "기록 남기기": 아웃라인 유지, 브라운 테두리 두께↑ + 글씨 굵기↑. CSS 값 변경만 (Green).
- **[Hero CTA 개선 — A/B 후보]** — ① 버튼 문구: "📝 게임 기록 남기기" / "📝 플레이 기록 남기기" / "📝 플레이 기록 작성" 비교. ② 버튼 아래 보조 문구(첫 기록 시 음료 교환권). ③ Primary 버튼 5~10% 크게. 시안 비교 후 결정, 즉시 적용 금지.
- **[운영 퍼널 분석 시스템]** — `docs/PLAN_funnel_analytics.md` 참조. event_name 기반 이벤트 추적(hero_recommend_click 등 7종) + Hero 하단 실시간 완료 카운트 + 관리자 분석 탭 개편. 다음 세션 시작 시 Plan 검토 후 진행. 🔴 Red (DB 신규 가능성, 구조 변경)
- ~~**전체기록시트 플레이기록 카드 디자인 개선**~~ — 완료 (142차-95)
- ~~**PC버전 게임위치 시트 크기**~~ — 완료 (142차-94)
- ~~**기록게시판 사진 미리보기 "+N장" 토글**~~ — 완료 (142차-98)
- ~~**기록게시판 사진 기록하기 버튼 (세번째 탭)**~~ — ~~롤백~~ 완료 (142차-99-1)
- ~~**게임시트 같은 디자이너 다른 게임 가로 스크롤**~~ — 완료 (142차-99)
- ~~**카베르나 게임평 나나 명의 문제**~~ — 142차-91에서 game_id 이중저장 근본 수정(BGG ID 우선 저장)으로 신규 기록은 정상 처리. 기존 잘못된 레코드는 건드리지 않기로 결정(사용자 판단).
- ~~**[1] 142차-97 롤백**~~ — 완료 (142차-99)
- ~~**[2] 게임시트 사진 남기기 버튼**~~ — 기록 페이지 사진 섹션에 📷 남기기 버튼 추가 완료 (142차-115). 게임평 모달 동일 패턴, 기존 플레이 기록 연동 또는 신규 기록 생성.
- ~~**[같은 디자이너 게임 → 뒤로가기]**~~ — 완료. openGameSheet에 fromKey 파라미터 추가, 같은 디자이너 카드 onclick에 현재 게임키 전달, 새 시트 최상단에 '← [이전 게임명]' 버튼 표시.
- ~~**[3] 게임상세시트 플레이 기록하기 플레이어 자동완성**~~ — 완료 (142차-120). tag-input-wrap + initTagInput + attachAc 연결, _prPlayerNames lazy load.
- ~~**[4] 게임 상세시트 수정/삭제 버튼 top-right 탈출 버그 + 관련 수정**~~ — CSS 스코프 수정 (142차-106), 섹션 복구 (142차-108). .sheet-comment-actions의 position:absolute를 .sheet-comment-item 컨텍스트로 스코프 축소. initSheetPhotos 사진 그리드에서 작성자 닉네임 표시 제거 (라이트박스 캡션에만 유지, 142차-108).
- ~~**[이전 세션 발생 버그 3개 수정]**~~ — (142차-113) 귀 현상은 이미 해결(142차-111, border-radius 제거). 외부박스 복구(border-radius 없이), 게임평 미리보기 수정/삭제 버튼 숨김(.sheet-play-scroll-card .sheet-comment-actions{display:none}), 게임시트 스크롤 리셋 개선(is-active 이후 rAF로 scrollTop 설정).
- ~~**[바텀시트 코너 삐져나옴 3세션 시행착오 기록]**~~ — (142차-118) **근본 원인:** `overflow-y:auto`+`border-radius`를 `.game-sheet-panel` 단일 요소에 함께 사용 → Chrome 컴포지터가 GPU 레이어로 승격 시 배경을 직각으로 렌더링, 라운딩 밖으로 크림색 사각형이 튀어나와 보임. **이전 세션 시행착오:** ① `.sheet-records-group` 카드 스타일 제거 시도(142차-109, revert) — 엉뚱한 요소 타깃. ② `border-radius` 자체를 제거(142차-111) — 현상을 숨겼을 뿐 근본 해결 아님, 이후 복구(142차-113). ③ `-webkit-overflow-scrolling:touch` 제거 — 원인 아님. ④ 코드 전체 탐색 방향 없이 반복 read — 토큰 낭비. **올바른 진단법:** DevTools Elements 탭에서 해당 코너 클릭 → `.game-sheet-dim`이 선택됨(어두운 오버레이) → 그 뒤에 `.game-sheet-panel` 배경이 직각으로 렌더링돼 보이는 것. **해결:** outer(`.game-sheet-panel`) `overflow:hidden`만, inner(`.game-sheet-scroll`) `overflow-y:auto` 분리. JS scroll 참조 5곳 변경. DESIGN_RULES.md §6 참조.
- ~~**[5] 방문자목록 회원탭 표시 개선**~~ — 완료 (142차-99, applyVisitorFilter/expandVisitorMore 함수)
- ~~**[6] 비주얼분석 날짜 필터 → 상단 지표 동기화**~~ — 완료 (142차-99, draw() 내 기간 연동)
- **[7] 페이지/회원 분석 기간 필터 개편** — 기본값 최근1주일, 대분류 "최근1주일/전체" 추가, 각 대분류 아래 전체/회원/비회원 서브탭 유지
- ~~**[8] 더루프 사진 미표시**~~ — 완료 확인
- ~~**같은 디자이너 디자인 개선 (A 스타일)**~~ — sheet-info-group 클래스 추가 완료 + 박스 여백 축소 (142차-102, padding 12→10, margin-bottom 12→8)
- ~~**오너 방문 카운팅 제외**~~ — kakao-auth.js에서 오너 로그인 시 cottage_is_admin 자동 설정

**다음 작업 후보**
1. ~~**다른 플레이어 프로필 보기**~~ — 완료 (142차-44)
2. ~~**플레이기록 → game_curious 알림 (4-1)**~~ — 완료 (142차-36)
3. ~~**게임시트 curious 상태 변경 (4-2)**~~ — 완료 (142차-36, 토스트+자동해제 방식으로 구현)
4. **좋아하는 게임 drag reorder + 대분류** — Red, Plan 필수 (game_likes.sort_order 컬럼 신규)
5. **취향보드 Phase 2** — 성향 5축 (Phase 1 테스트 완료 후)
6. **모임 플래너 Phase 3 게임 투표** — Plan 필요 (meeting_vote_games 테이블 신규)
7. **게임평/사진 통합 (linked_record_id)** — 🔴 Red, Plan 확정 (2026-06-25) ← "기존 플레이기록에 추가하시겠어요?" 프롬프트 포함, 미구현
   - game_play_records에 linked_record_id (nullable FK → game_play_records.id) 추가
   - 게임상세시트: 게임평 남기기 / 사진 추가 / 플레이 기록하기 버튼 3개 통합
   - 저장 시 "기존 기록에 추가" 선택 옵션 (같은 게임 최근 기록 목록)
   - 기록 전체보기 카드: 연결된 항목들 닉네임 붙여 합산 표시 (호핀: "~", 나나: "~")
   - game_comments는 유지(기존 호환), 신규 입력은 game_play_records로 통일
   - 영향 파일: supabase-client.js, script.js, game-reviews.js
8. ~~**이번달참여일정 — 함께한 시간 카드 통합**~~ — 완료 (142차-64)
9. ~~**관리자 페이지 섹션 재정렬**~~ — 완료 (142차-58)
   - groupCharts: summary카드 + 날짜별 방문자 수만 남김
   - groupReferrer (신규): 유입경로별/페이지별방문/유입경로×페이지 + subAuxCharts
   - groupAnalysis를 groupCharts-groupReferrer 사이로 이동
   - 위험: groupReferrer is-open 기본값 설정 필요, 기간필터는 groupCharts에 유지
   - 새 카드 생성 X, 함께한 시간 카드 하단에 일정 섹션 확장
   - 최대 2개 줄 표시, 3개 이상이면 마지막 줄에 "외 N건"
   - 표시 형식: 각 줄에 "6/27 정기모임" (슬래시 구분 아닌 줄바꿈)
   - 4개 메인 카드(수집/취향/기록/교환권) 상하 패딩 10~15% 축소 → 일정 1줄 공간 확보
   - 영향 파일: kakao-auth.js (함께한 시간 섹션), style.css (카드 패딩)

> Discord 알림 전환 폐기 — 카카오 개인 알림으로 유지 (142차-25)

---

### 코드 품질 주석 (리팩토링 참고용)

- `kakao-auth.js` 취향보드 이벤트 핸들러: for 루프 + 이벤트 위임 혼용. 추후 서브파일 분리 검토.
- `club-schedule.html` `openProfileSheet`: 인라인 Supabase 클라이언트(`_cottageSupabaseDb`) 사용 — `window.CottageDB`와 별개. 통합 검토.
- `_buildTasteGameItems` 더보기: 아이템 추가 시 `insertBefore` 처리. 대량 추가 시 재렌더 방식 검토.
- `script.js` `onSheetLike`/`onSheetCurious`: is-active wrap 동기화가 여러 곳에 분산. 리팩토링 시 `_setLikeActive(active)` / `_setCuriousActive(active)` 헬퍼 함수로 통합 권장. (142차-57에서 onSheetLike 단순화 — 확인 토스트 제거)

---

## 1. 현재 완료 기능

### 핵심 기능
- [x] 카카오 OAuth 로그인/로그아웃
- [x] 닉네임 변경 (localStorage + DB 저장)
- [x] 프로필 사진 변경 (프리셋 20종 + 파일 업로드, 다기기 복원)
- [x] 내 보드 패널 — 메인(4카드) + 서브시트(성장/교환권/이용기록/취향보드) + 프로필 영역(대표캐릭터/닉네임/칭호)
- [x] 취향 보드 Phase 1 (142차) — 한줄소개(bio), 좋아하는/해보고싶은 게임(추가/삭제/직접입력/ESC 닫기/이미추가됨 표시), 피하는 유형 태그, 좋아요 토스트→취향보드 직접 진입
  - ⚠️ **SQL 미실행**: Supabase SQL Editor에서 실행 필요 (커밋 메시지 참조)
  - 게임 시트에 좋아요/궁금해요 유저 아바타 목록 표시 (getGameLikers/getGameCuriousUsers)
- [x] 약식 카드 클릭 → 해당 본문 카드로 위임 (캐릭터/칭호, 132차)
- [x] 인앱 알림 시스템 — 배지 + 패널. 2차 개선(날짜/unread 바/보상카드 강조/명칭 "최근 소식") (130차)

### 게임 기록
- [x] 신규 기록 등록 (다중 게임 행, 날짜/그룹명/참여자/인원/시간/점수/후기)
- [x] 사진 다중 업로드 (최대 5장, 1200px/JPEG 0.85 리사이즈)
- [x] 기존 기록 수정 (인라인 수정폼, 사진 개별 삭제/신규 추가)
- [x] 기록 삭제
- [x] 모임별 보기 (그룹 > 날짜 > 게임) / 게임별 보기 (게임 > 모임/인원 > 날짜)
- [x] 그룹명 / 게임명 / 참여자 이름 자동완성
- [x] 사진 썸네일 표시 (80px, 최대 3장 + +N장 배지, 라이트박스 연동)

### 게임 목록 / 바텀시트
- [x] 전체 게임 목록 (필터: 인원 1인~9인+, 난이도, 분위기, 키워드)
- [x] 게임 바텀시트 (별점, 게임평, 따봉/궁금해요, 플레이기록, 사진 3섹션)
- [x] 별점 제출/조회 (user_id 기반, 비로그인 세션키 중복 방지)
- [x] 게임평 등록/삭제/수정 (user_id 기반 권한)
- [x] 따봉/궁금해요 토글 + 좋아요/궁금해요한 유저 아바타 목록 표시 (142차-2)

### 업적 / 캐릭터 / 칭호 / 교환권

상세 정의: `docs/achievement-system.md` (SSOT)

- [x] 업적 시스템 — ACH_DEFS 기반 8축 (record/new_game/photo/review/visit/play/first_record/balance)
  - checkAchievements: 기록/별점/방문/함께한 날 트리거 후 자동 체크
  - 달성 → 캐릭터/칭호/교환권 자동 지급. 포인트 비활성화 (UI 숨김, DB/로직 유지)
  - ⚠️ play/balance 카운팅은 player_names 텍스트 기반 — 닉네임 변경/동명이인 오탐 가능. 장기 과제: game_play_participants 테이블
- [x] 캐릭터 — 47종 픽셀아트 PNG, 대표 캐릭터 선택/저장/프로필 표시
- [x] 칭호 — TITLE_DEFS, 대표 칭호 선택, 프로필 표시
- [x] 교환권 시스템 — 전 단계 완료
  - DB: voucher_products/voucher_log (001_vouchers.sql)
  - voucher_log.note + achievement reason CHECK + partial unique index (003_voucher_achievement.sql ← Supabase 실행 완료)
  - grantFirstPlayVoucher (첫 플레이, record_1 경로) / grantAchievementVoucher (업적별, JS + DB 이중 중복방지)
  - 관리자 UI: 전체 지급/사용 로그, 당시 잔액 역산 표시
  - 정책: 계정당 1회 자동 지급, 오너 제외, 승인 없음, 사용 즉시 차감
- [x] 업적 소급 부여 SQL 실행 완료 (002_sogeup_achievements.sql, 129차)

### 어드민
- [x] 게임/간식 요청 관리 — 상태 시스템 (purchase_status/status_date + 상태 피커)
- [x] 건의사항 관리 / 회원 목록 및 차단
- [x] 페이지 분석 대시보드 — 요약 카드, 날짜/주/월 필터, 유입경로, 교차분석

### 인프라
- [x] 방문자 통계 — `__visitor__` 마커 방식 (113차 버그 수정, 118차 filteredPV 중복 제거)
- [x] 채널 귀속 추적 — last-touch 모델, UTM 파라미터, 날짜+source+page dedup
- [x] 추천게임찾기 이벤트 추적 (page_events 테이블)
- [x] 체류 시간 누적 (초 단위, localStorage → DB, 1분마다 heartbeat)
- [x] localStorage 세션 키 통합 (`cottage_sess_{id}` 단일 JSON, 자동 마이그레이션)
- [x] 업로드 전 이미지 리사이즈 (1200px, JPEG 0.85)

---

## 2. 현재 버그

### 기록보드(내보드) 버그 3건 (2026-06-27 발견)

**[BUG-B] 기록보드 게임평 미표시 → 수정 완료 (142차-136)**
- 원인 1: `getGameComments(gameKey)`가 단일 키만 조회 → 배열 지원 + `_gameIds` 전달로 한글명/BGG ID 둘 다 조회
- 원인 2: `getMyStats`에서 `game_comments.game_id`(없는 컬럼) 조회 → `game_key, comment_text`로 수정
- 원인 3: profile panel "게임평" 섹션이 `review_text`(game_play_records)만 표시 → `game_comments`도 통합
- `commentListHtml` 변수 미정의 버그도 함께 수정

**[BUG-A] 기록보드 사진 +N 토글 오작동 → 143차-137 완료**
- 3열 CSS grid(전체폭), aspect-ratio 1:1 정사각형 썸네일
- 6장(3열×2행) 기본 표시, +N 클릭 시 인라인 확장
- 사진 클릭 라이트박스: 작성자/모임/날짜/인원/시간/점수 캡션 표시
- 본인 사진에 삭제 버튼 표시 (updateGamePlay 개별 삭제)

**[BUG-B] 기록보드 게임평 미표시**
- 증상: 게임평을 여러 개 작성했는데 더루프 게임평만 표시됨. 나머지 연동 안 된 것으로 보임.

**[BUG-C] 기록보드 플레이기록 카드 클릭 범위 과도 → 143차-136 수정 완료**
- 원인: kakao-auth.js `profile-activity-item` 전체에 click 핸들러 바인딩
- 수정: 게임이름을 `<button class="profile-game-link">` 래핑 후 버튼만 click 핸들러 적용

**142차-88 수정 내역 (2026-06-25):**
- [x] 알림 날짜에 시간(HH:MM) 추가 — kakao-auth.js `fmtShort`
- [x] 첫기록 보상 알림 순서 — 교환권 수령자는 알림 목록 아래로 (미수령 시 상단 유지)
- [x] 플레이기록 수정/삭제 권한 — user_id 없는 구기록은 nickname 폴백으로 isMine 판정
- [x] 기록게시판 ··· 드롭다운 — getBoundingClientRect+fixed 포지셔닝으로 pr-session overflow:hidden 클리핑 해결
- [x] 기록게시판 💬👍 버튼 — href="#" → button으로 스크롤 상단 이동 제거
- [x] 방문자 목록 회원/비회원 필터 — #visitorExtras 카드도 필터에 포함

**135차 수정 내역 (2026-06-20):**
- [x] 게임 위치 변경 — 사라진속옷과하늘을나는물고기, 로나에나:재앙의선물 `배송중` → `머더미스터리` (master.json + build)
- [x] 비회원 고유 ID — `page_sessions`에 `session_key` 컬럼 추가 (SQL: supabase-setup.sql line 695), 비로그인 방문 시 INSERT, `getPageAnalytics` SELECT 포함, 관리자 명 집계 session_key 반영
- [x] 알림 new_game 바텀시트 — 단일 게임 `data-game-name`, 복수 게임 개별 클릭 span, 클릭핸들러 `closest('[data-game-name]')` 우선 탐색
- [x] localhost page_sessions 기록 차단 — `_syncTimeToDBNow`에 localhost guard 추가 (회<명 역전 근본 원인 제거)
- [x] admin 명 집계 보완 — refUsers7, refUserMap, buildPageMap, pageUniq 모두 anon session_key 반영

**134차 수정 내역 (2026-06-20):**
- [x] 협력게임 책장 라벨 — script.js `getGameShelfLabel`에 weight 분류 추가. 바텀시트에서 "협력" → "쉬운/어려운 협력게임" 표시
- [x] 비주얼분석 데이터 0 복구 — `getPageAnalytics` SELECT에서 비존재 컬럼 `session_key` 제거, page_views SELECT에서 `user_id` 제거, anon_sessions SELECT에서 `first_seen_at` 제거
- [x] 유입경로 내부 도메인 오분류 — `categorizeRef`에 자사 도메인 self-referrer null 반환 추가
- [x] 7일 유입 요약 카드 중복 — `__visitor__` 필터 추가

### 알려진 제한사항

| 항목 | 내용 |
|------|------|
| 기록보드 플레이기록 시간 | 기록보드에 표시되는 플레이기록 시간이 전부 09:00으로 표시됨. 원인 미확인 |
| 서브시트(취향보드 등) 상단 모서리 음영 (2026-06-30) | 사용자가 스크린샷으로 보고한 모서리 음영 — 시도한 가설 3건 모두 효과 없음: ①`.profile-activity-toggle` 상단 radius 제거, ②`.profile-subsheet-header` radius를 box와 맞춤(overflow:hidden이라 무의미함 확인), ③`.profile-subsheet-header`에 `background:#fff` 추가(외부 GPT 의견, 적용했으나 미해결). 다음 시도 전 확대 스크린샷으로 정확한 형태 확인 필요 |
| 이용시간 기기 중복 | 동일 유저가 여러 기기에서 동시에 사용 시 각 기기 시간이 모두 합산됨 |
| 사진 배열 전체 삭제 | `deletePlayPhoto`는 photo_url = null로 전체 삭제 (개별 URL 삭제 불가) |
| 관리자 페이지 금일이용데이터 | 간헐적 미표시 — 원인 불명, 별도 조사 필요 |
| TITLE_DEFS 미배정 칭호 3개 | `title_record_150` / `title_review_100` / `title_review_500`가 TITLE_DEFS에 정의돼 있으나 ACH_DEFS 어디서도 `rewards.title`로 참조되지 않음. 의도적 예약인지 잔존 버그인지 확인 필요 |

---

## 3. 추후 작업 목록

### P1 — 기능 (중요)

- [x] **관리자 카카오 알림 확장** — 신규 회원 가입(profiles INSERT) + 교환권 사용(voucher_log INSERT) 시 카톡 알림. Supabase DB webhook → Make.com 시나리오 5213346 Router 3개 분기 (140차)
- [x] **업적 8축 순서 재배열** — record→first_record→new_game→play→photo→review→visit→balance (118차)
- [x] **달성 업적 아이콘 컬러 적용** — .is-achieved .profile-ach-img-lock { filter: none } 추가 (118차)
- [x] **업적명·내용·아이콘 불일치 수정** — new_game_10/30/300 🦉→게임이모지, review_5/25/300 🦊→글쓰기이모지 (118차)
- [x] **rare 캐릭터 축 대표 오탐 수정** — _topCharPerAxis에서 rare_ 접두사 캐릭터 제외 (118차)

### P2 — 기능 (선택)

- [x] **게임 위치 페이지** (game-location.html) — 책장 위치 기능 구현 완료 (이전 세션)
- [x] **게임위치 협력게임 난이도 분류** — bgg.weight >= 2.5 → 어려운 협력(C-1), 미만 → 쉬운 협력(B-1), 41종 자동 분류 (118차). script.js 바텀시트도 동일 로직 적용 (134차)
- [x] **페이지별방문 내 보드 + 서브시트 카운팅** — trackPageView('my-board*') + admin 가상페이지 집계 (118차)
- [x] **방문자목록 회원/비회원 분류 버튼** — 전체/회원/비회원 토글 버튼 추가 (118차)
- [x] **게임 위치 0종 카테고리 숨기기** — games.length === 0 시 렌더 스킵 (140차)
- [x] **모임 일정 페이지** — club-schedule.html로 통합 완료 (141차). 달력+겹침계산+슬라이더+자유댓글. club-meeting.html → redirect. ⚠️ Supabase meeting_votes 테이블 생성 필요
- [ ] **동호회 가입 추적** — page_sessions 데이터 활용
- [ ] **관심 기반 묶음 알림** (Red, Plan 필수)
  - 개별 알림 → 유형별 묶음 방식 전환
  - notifSeenAt → `{ tagged, review, play_record, purchased }` 확장
- [x] **유입 경로 first_source 저장** — profiles.first_source TEXT, 신규 유저 upsert 시 _sessionReferrer 1회 저장 (140차)

### P3 — 인프라

- [x] **로그인 메뉴 HTML 공통화** — assets/js/header.js 생성, 15개 HTML 파일 script 태그로 교체 (137차)
- [x] **renderSingleGame / ?game= 처리** — game-reviews.js dead code(GAME_ID) 삭제 완료 (137차)
- [x] **동호회 소개글 알림** — 소개글 올린 회원에게 new_intro 타입 묶음 알림 (N명이 소개글 올렸어요). supabase-client.js getMyNotifications + kakao-auth.js 렌더링 (138차)
- [x] **getPageAnalytics 조회 방식 개선** — limit(5000) → 최근 90일 필터 + limit(20000)로 교체. 25일치 → 90일치로 확장, raw는 DB에 유지 (139차)
- [ ] 이용시간 기기 중복 카운트 방지 (서버 세션 단위 관리)
- [ ] price-rules.html / club-rules.html 사진 중심 재구성
- [ ] **기록게시판 디자인 개선** — 현재 너무 밋밋, 전반적 비주얼 리뉴얼 필요

### V4 아이디어 (장기, 구현 미정)

유저당 플레이 기록 20건 이상 누적 시 의미있는 분석 가능.

| # | 기능 | 필요한 데이터 |
|---|------|--------------|
| 1 | **게이머 성향 분석** — "전략형/파티형/탐험형" 분류 | game_play_records, 게임 태그 |
| 2 | **연말 플레이 리포트** — "올해 N종 탐험" 등 | game_play_records(연도별 집계) |
| 3 | **유저 취향 매칭** — 비슷한 패턴의 다른 유저 추천 | game_play_records, game_ratings |
| 4 | **개인화 게임 추천** — 미플레이 유사 게임 추천 | game_ratings, 게임 태그/장르 유사도 |
| 5 | **모임 추천** — 성향 분석 기반 | game_play_records.group_name |
| 6 | **다른 사람 성장보드 구경하기** — 타 유저 성장 현황 열람 | user_achievements, profiles |
| 7 | **나는 어떤 보드게이머일까?** — 연말 성향 분석 리포트 | game_play_records, game_ratings |

---

## 4. 위험한 데이터 흐름

### 4-1. 닉네임 손상 체인

auth-callback: DB 닉네임 조회 fallback 있음. upsertProfile: DB 닉네임 ≠ 카카오명이면 기존 유지. selectError 시 닉네임 필드 업데이트 제외.

### 4-2. 이용시간 데이터

_syncTimeToDBNow 성공 시에만 timeSec=0. upsertProfile selectError 시 시간 필드 업데이트 제외 (0 덮어쓰기 방지).

### 4-3. 다기기 localStorage 의존

| 기능 | 복원 방식 |
|------|----------|
| 커스텀 닉네임 | DB 조회로 복원 |
| 커스텀 사진 | DB photo_url 조회로 복원 |
| 별점 기록 | user_id 기반 → 다기기 중복 방지 |
| 코멘트 소유권 | user_id 기반 → 다기기 삭제 버튼 표시 |

---

## 5. 변경 이력 (주요 패치)

| 날짜 | 내용 |
|------|------|
| 2026-06-30 | fix: play-records-utils.js가 9개 페이지(about/guide/club-schedule/price-rules/club/club-rules/club-intro/requests/requests-admin)에 누락되어 parsePhotoUrls·openLightbox 미정의 — 다중사진 기록 이미지 깨짐 + 사진 더보기 버튼 무반응 버그. 9개 페이지에 스크립트 추가, game-reviews.html 로드순서 정정, 더보기 토글을 openLightbox 의존 블록에서 분리. 기록보드 기본 펼침 축소(게임평1/사진3) + 더보기 문구 통일. 내 보드 메인 패널 헤더 sticky화 + padding-top:0 (143차-159) |
| 2026-06-30 | feat+fix: 기록보드(내보드>기록보드) 게임평/플레이기록 썸네일 추가(_getGameThumbKey bgg.id fallback) + 게임평 폰트/공백 조정 + 사진 더보기 토글 버그 수정 + 게임평/사진/플레이기록 섹션별 sticky 헤더 + .sheet-back-btn--hist modifier 분리(이전게임 히스토리 vs 기록시트 복귀 버튼 공유 클래스 충돌로 타이틀이 백버튼 덮던 버그) (143차-158) |
| 2026-06-30 | fix: 게임정보 시트 타이틀 위 공백 축소(.sheet-title-row margin-top:-32px) — sticky-bar 자체에 음수 margin 주면 sticky 깨짐 확인, sticky-bar는 안정값(margin-bottom:14px) 유지하고 sticky와 무관한 .sheet-title-row만 조정. sheet-record-header도 top:-22px→0, margin-top 0으로 통일해 뒤로가기 버튼 잘림 버그 해결 (143차-157) |
| 2026-06-19 | feat: 교환권 업적 지급(grantAchievementVoucher), 함께한 날(balance) 구현(getUserUniqueDayCount), 메뉴명 변경(record/play/visit/balance), 약식 카드 클릭→변경. 003_voucher_achievement.sql 실행 (132차) |
| 2026-06-19 | fix: 업적/캐릭터/칭호 0개 버그 — getUserAchievements FK join null → achievement_id 직접 매핑, getRepAchievement 2차 조회 제거 (131차) |
| 2026-06-19 | feat: 알림 2차 개선(날짜 위치/빈상태 조건/unread 좌측바/보상카드 강조/명칭 "최근 소식"). supabase-setup.sql 누락 항목 추가 (130차) |
| 2026-06-19 | feat: 업적 소급 부여 SQL(002_sogeup_achievements.sql) Supabase 실행 완료 (129차) |
| 2026-06-19 | fix: 비주얼 분석 kstDate is not defined — buildAnonUserMap 스코프 문제, _toKstDate 인라인 헬퍼 추가. 관리자 메뉴 맨 아래 이동 (128차) |
| 2026-06-19 | fix+feat: 내 보드 UX 개선 7건 — 취향보드 토글, 기록보드 섹션, 함께한 시간 명칭, 요청 투표 버그, 칭호 CSS (117차) |
| 2026-06-19 | feat: 내 보드 카드 구조 재정리 + 요청 상태 피커 개선 + guide 내 보드 연동 (116차) |
| 2026-06-18 | feat: 알림 클릭 액션 / N번째 플레이 표시 / 메뉴 대표캐릭터 전환 / 업적 보상 표시 (86~92차) |
| 2026-06-18 | feat: 칭호 시스템 V1 — TITLE_DEFS 20종, buildTitleSection, setRepTitle API (89차) |
| 2026-06-18 | feat: 업적/칭호 시스템 V2 — ACH_DEFS rewards 구조, 방문 업적 5종, 미해금 카드 진행도, visit 트리거 (94차) |
| 2026-06-18 | feat: 게임 요청 실제 게임명 입력 — actual_games JSONB, 초성검색 자동완성 (103차) |
| 2026-06-18 | feat: 게임 2개 추가 — 사라진속옷과 하늘을나는물고기, 로나에나. 총 643종 |
| 2026-06-17 | feat: 내 보드 서브시트 구조 전환 + 4축 카드 + 프로필 영역 + 드롭다운 정리 (76~83차) |
| 2026-06-17 | feat: 홈페이지 이용안내 카드 개편 / 업적 UI 개선 / 파비콘 수정 / achievements.js 누락 9개 페이지 추가 |
| 2026-06-17 | feat: 음료교환권 전 단계 완료 — DB/JS API/관리자UI/실제상품/로그 잔액 역산 (81~106차) |
| 2026-06-13 | feat: 게임 바텀시트 3섹션(게임평/플레이기록/사진) / 게임평 통합 / 게임 위치 연결 |
| 2026-06-12 | feat: UTM 유입경로 추적 / 단축 URL 리다이렉트(vercel.json) / 어드민 비주얼 분석 대시보드 |
| 2026-06-12 | refactor: localStorage 세션 키 8개 → cottage_sess_{id} 단일 JSON 통합 |
| 2026-06-11 | fix: DB 데이터 복구 — visit_count 리셋 + total_minutes 60배, page_sessions 기반 재집계 |
| 2026-06-11 | fix: heartbeat 이용시간 누락(_syncTimeToDBNow), upsertProfile selectError 시 0 덮어쓰기 방지 |
