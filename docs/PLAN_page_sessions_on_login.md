# PLAN: 로그인 시 page_sessions 삽입 — 월별 차트 데이터 보완

작성: 2026-07-04

---

## 문제

관리자 분석 페이지의 월별/주별 차트가 나나 외에는 아무도 표시되지 않는다.

**원인**: 월별 차트는 `page_sessions` 테이블에서 데이터를 읽는다.  
`page_sessions` 행은 **탭을 전환·최소화할 때**(`visibilitychange`)만 생성된다.  
**탭을 직접 닫으면** 시간이 `profiles.total_minutes`에만 쌓이고, `page_sessions`에는 기록이 안 남는다.

→ 나나는 탭 전환 습관이 있어서 `page_sessions`에 기록이 있고,  
→ 다른 회원들은 탭을 바로 닫아서 `page_sessions` 기록이 없거나 적다.

---

## 수정 목표

로그인 시(`upsertProfile`) 이전 세션에서 쌓인 시간이 있으면 `page_sessions`에도 삽입한다.  
완료 조건: 탭을 닫고 재방문해도 월별 차트에 해당 회원의 시간이 표시된다.

---

## 변경 계획

### 읽을 파일
- `assets/js/supabase-client.js` — `upsertProfile()` 함수 (약 line 1111~1160)

### 변경 대상

`supabase-client.js > upsertProfile()` 내부

현재:
- 로컬에 쌓인 시간(`accumulated`) → `profiles.total_minutes` 업데이트만 함
- `page_sessions` INSERT 없음

변경:
- `accumulated > 0`이면 `page_sessions` INSERT 추가
- `entered_at`: `upsertProfile` 호출 직전에 `_sessionEnterAt`이 있으면 그 값 사용, 없으면 `new Date().toISOString()`

```js
// upsertProfile() 안, profiles upsert 성공 후 추가
if (accumulated > 0 && !upsertError && !skipAnalyticsForUser) {
  const page = window.location?.pathname?.split('/').filter(Boolean).pop()?.replace('.html','') || 'index';
  const enterAt = _sessionEnterAt ? new Date(_sessionEnterAt).toISOString() : new Date().toISOString();
  db.from('page_sessions').insert({
    page, user_id: userId, session_key: getSessionKey(),
    duration_sec: accumulated, entered_at: enterAt, referrer: _sessionReferrer
  }).then(() => {});
}
```

### 새로 생성
- 없음

### 영향 파일
- `assets/js/supabase-client.js` (1개)

### 위험요소
- `accumulated`는 `_popAccumulatedSecs()`가 이미 localStorage를 비운 뒤라 중복 삽입 없음
- `_sessionEnterAt`이 이전 세션 시작 시각을 가리키므로 `entered_at`이 오늘 날짜가 아닐 수 있음 (예: 어제 탭을 열고 오늘 닫고 재방문) → 의도한 동작, 정확한 날짜 귀속
- 과거 데이터는 소급 불가, 이 수정 이후 방문분부터만 적용됨
- 첫 번째로 실패할 가능성이 높은 지점: `_sessionEnterAt`이 `undefined`인 상태에서 잘못된 날짜 삽입 → fallback(`new Date()`)으로 방어

---

## 비고

- 이 수정 이전 데이터는 복구 불가
- "전체" 보기는 `profiles.total_minutes` 기반이라 이미 정확함, 이 수정의 영향 없음
- 수정 후에도 `visibilitychange` 경로는 그대로 유지 (중복 삽입 안 됨 — accumulated를 pop한 뒤 삽입하므로)
