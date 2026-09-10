# 대표 캐릭터 identity icon Plan

## 목표와 범위

플레이기록 작성자·게임평/댓글 작성자(C), 플레이기록 참여자 태그(D), 모임 플래너 참가자 및 홈 모임 미리보기(E)의 회원 닉네임 왼쪽에 대표 캐릭터를 표시한다. A(모임원 프로필 카드)·B(내 보드/다른 회원 보드)는 기존 아바타를 유지하고, 관리자·드롭다운·날짜/그룹 메타는 제외한다.

## 계약

- `data-identity-user-id`가 있는 nickname host만 공통 hydrator 대상이다. C/E는 저장된 stable `user_id`만 쓰며, D는 기존 exact·unique participant resolver가 확정한 값만 쓴다.
- `CottageDB.getRepresentativeCharacters(userIds)`는 `profiles.user_id, rep_achievement_id`만 batch read한다.
- `CottageAchievements.hydrateIdentityIcons(root)`는 idempotent하고, root 재렌더·user_id 변경 뒤 도착한 오래된 비동기 응답을 연결 상태와 현재 attribute 재확인으로 버린다.
- `CottageAchievements.invalidateIdentityIcons(userId, repAchievementId)`가 대표 캐릭터 변경 후 cache 무효화와 현재 document 갱신의 단일 경로다. 화면별 cache는 만들지 않는다.
- C/E regular는 character PNG의 128px 캔버스 안 투명 여백(실콘텐츠 약 100×89px)을 보정한 20px, D micro는 12px이다. 아이콘은 장식용이며 기존 nickname host의 click/keyboard ownership을 바꾸지 않는다.
- stable `user_id`가 있는 C/D/E host는 대표 캐릭터가 있으면 그 캐릭터를, 없으면 공통 기본 발바닥 avatar를 표시한다. `user_id`가 없는 미연결·충돌 participant 이름에는 아무것도 삽입하지 않는다. 유효한 character asset 로드 실패는 기존 업적 카드와 같은 이모지 fallback을 쓴다.

## 영향과 검증

`supabase-client.js`, `achievements.js`, 플레이기록 3개 renderer(`game-reviews.js`, `index-page.js`, `game-sheet.js`), `club-history.html`, 플래너 공용 renderer(`day-detail.js`)와 caller(`index-page.js`, `club-schedule.html`), CSS 및 js/achievement/state 문서를 함께 갱신한다. 정확·충돌·미연결 D fixture, idempotence/race/cache-invalidate fixture, 기존 nickname navigation 및 C/E stable-ID rendering을 검증한다.
