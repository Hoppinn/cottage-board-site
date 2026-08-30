// HTML 특수문자 이스케이프 — 전역 공용 (game-reviews.html, kakao-auth.js 등에서 참조)
window.escH = function(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
};

// 이미지 리사이즈 — 긴 쪽 기준 maxPx 이하로 압축, JPEG quality 변환
window.resizeImageFile = function(file, maxPx = 1200, quality = 0.85) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { naturalWidth: w, naturalHeight: h } = img;
      if (Math.max(w, h) <= maxPx) { resolve(file); return; }
      const ratio = maxPx / Math.max(w, h);
      const cw = Math.round(w * ratio);
      const ch = Math.round(h * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = cw; canvas.height = ch;
      canvas.getContext('2d').drawImage(img, 0, 0, cw, ch);
      canvas.toBlob(
        blob => resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })),
        'image/jpeg', quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
};

// ── 세션 데이터 통합 유틸 — supabase-client.js + kakao-auth.js 공유 ──
window._cottageSess = (function () {
  function _migrate(uid) {
    const key = `cottage_sess_${uid}`;
    if (localStorage.getItem(key)) return;
    const d = {};
    [
      [`cottage_last_visit_date_${uid}`, 'lastVisitDate'],
      [`cottage_prev_visit_date_${uid}`, 'prevVisitDate'],
      [`cottage_last_seen_dt_${uid}`,   'lastSeenDt'],
      [`cottage_prev_seen_dt_${uid}`,   'prevSeenDt'],
      [`cottage_time_sec_${uid}`,       'timeSec'],
      [`cottage_visit_count_${uid}`,    'visitCount'],
    ].forEach(([k, f]) => {
      const v = localStorage.getItem(k);
      if (v !== null) {
        d[f] = (f === 'timeSec' || f === 'visitCount') ? (parseInt(v) || 0) : v;
        localStorage.removeItem(k);
      }
    });
    const kst = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
    Object.keys(localStorage)
      .filter(k => k.startsWith(`cottage_profile_visited_${uid}_`))
      .forEach(k => {
        if (k.endsWith(kst)) d.lastVisitDate = kst;
        localStorage.removeItem(k);
      });
    localStorage.setItem(key, JSON.stringify(d));
  }
  return {
    get(uid) {
      if (!localStorage.getItem(`cottage_sess_${uid}`)) _migrate(uid);
      try { return JSON.parse(localStorage.getItem(`cottage_sess_${uid}`) || '{}'); }
      catch (err) { console.error('[_cottageSess.get]', err); return {}; }
    },
    set(uid, data) {
      localStorage.setItem(`cottage_sess_${uid}`, JSON.stringify(data));
    },
  };
})();

(function () {
  "use strict";

  const cfg = window.SUPABASE_CONFIG;

  // 설정 미완료 또는 CDN 미로드 시 비활성
  if (
    !cfg?.url ||
    cfg.url === "YOUR_SUPABASE_URL" ||
    !window.supabase
  ) {
    window.CottageDB = null;
    return;
  }

  // 싱글톤 — 동일 페이지에서 여러 번 createClient 호출 방지
  if (!window._cottageSupabaseDb) {
    window._cottageSupabaseDb = window.supabase.createClient(cfg.url, cfg.anonKey);
  }
  const db = window._cottageSupabaseDb;

  // LIKE 패턴에서 와일드카드 문자 제거 — ilike() 호출 시 닉네임 안전화
  function _escapeLike(str) {
    return String(str || '').replace(/[%_]/g, '');
  }

  // 기록 추가/수정/삭제 후 "최근 기록"류 화면에 알리는 신호. 홈의 recordIframeFrame처럼
  // game-reviews.html이 iframe으로 임베드된 경로에선 window.dispatchEvent가 부모(홈)에
  // 안 닿는다 — postMessage도 같이 쏴야 부모 쪽 리스너가 받는다.
  function _emitRecordChanged() {
    // dispatchEvent/postMessage는 정상 브라우저 환경에서 실패하지 않는다 — 방어적 삼킴, 로그 불필요
    try { window.dispatchEvent(new CustomEvent('cottage-record-changed')); } catch (_) {}
    try { if (window.parent && window.parent !== window) window.parent.postMessage({ type: 'cottage-record-changed' }, '*'); } catch (_) {}
  }

  // ── 세션 키 (익명 중복 방지용) ──────────────────────────

  function getSessionKey() {
    const KEY = "cottage_session_id";
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = Date.now().toString(36) + Math.random().toString(36).slice(2);
      localStorage.setItem(KEY, id);
    }
    return id;
  }

  // ── 게임 조회 트래킹 ────────────────────────────────────

  async function trackView(gameId) {
    if (!gameId) return;
    try {
      const { error } = await db.from("game_views").insert({ game_id: gameId });
      if (error) console.error('[trackView]', error);
    } catch (err) { console.error('[trackView]', err);}
  }

  // ── 별점 조회 ───────────────────────────────────────────

  async function getGameRating(gameId) {
    try {
      const { data, error } = await db
        .from("game_ratings")
        .select("rating")
        .eq("game_id", gameId);
      if (error) console.error('[getGameRating]', error);
      if (!data?.length) return null;
      const avg = data.reduce((s, r) => s + r.rating, 0) / data.length;
      return { avg: parseFloat(avg.toFixed(1)), count: data.length };
    } catch (err) { console.error('[getGameRating]', err);
      return null;
    }
  }

  // ── 별점 제출 ───────────────────────────────────────────

  async function submitRating(gameId, rating) {
    const storageKey = `cottage_rated_${gameId}`;
    const userId = window.getKakaoUser?.()?.id;

    if (userId) {
      // 로그인 사용자: DB 기반 중복 확인
      const existing = await getMyRating(gameId);
      if (existing !== null) return { alreadyRated: true, myRating: existing };
      try {
        const { error } = await db.from("game_ratings").insert({
          game_id: gameId,
          rating: Number(rating),
          user_id: String(userId),
          session_key: getSessionKey(),
        });
        if (!error) {
          localStorage.setItem(storageKey, String(rating));
          return { success: true };
        }
        return { error };
      } catch (e) { return { error: e }; }
    }

    // 비로그인: localStorage 기반 중복 확인
    const existing = localStorage.getItem(storageKey);
    if (existing) return { alreadyRated: true, myRating: Number(existing) };
    try {
      const { error } = await db.from("game_ratings").insert({
        game_id: gameId,
        rating: Number(rating),
        session_key: getSessionKey(),
      });
      if (!error) {
        localStorage.setItem(storageKey, String(rating));
        return { success: true };
      }
      return { error };
    } catch (e) { return { error: e }; }
  }

  // ── 내 별점 확인 — 로그인 시 DB, 비로그인 시 localStorage ──

  async function getMyRating(gameId) {
    const userId = window.getKakaoUser?.()?.id;
    if (userId) {
      try {
        const { data, error } = await db.from("game_ratings")
          .select("rating")
          .eq("game_id", gameId)
          .eq("user_id", String(userId))
          .maybeSingle();
        if (error) console.error('[getMyRating]', error);
        if (data?.rating != null) return Number(data.rating);
      } catch (err) { console.error('[getMyRating]', err);}
    }
    const stored = localStorage.getItem(`cottage_rated_${gameId}`);
    return stored ? Number(stored) : null;
  }

  // ── 인기게임 집계 (최근 30일 조회수) ───────────────────

  async function getPopularGames(limit = 20) {
    try {
      const { data, error } = await db.rpc("get_popular_games", { limit_count: limit });
      if (error) console.error('[getPopularGames]', error);
      return data || [];
    } catch (err) { console.error('[getPopularGames]', err);
      return [];
    }
  }

  // ── 전체 게임 별점 요약 ─────────────────────────────────

  async function getAllGameRatings() {
    try {
      const { data, error } = await db.rpc("get_all_game_ratings");
      if (error) console.error('[getAllGameRatings]', error);
      if (!data) return {};
      return Object.fromEntries(
        data.map((r) => [
          r.game_id,
          { avg: Number(r.avg_rating), count: Number(r.rating_count) },
        ])
      );
    } catch (err) { console.error('[getAllGameRatings]', err);
      return {};
    }
  }

  // ── 페이지 뷰 트래킹 ────────────────────────────────────

  async function trackPageView(page, referrer = null, extra = {}) {
    if (!page) return;
    if (_shouldSkipAnalytics()) return;
    try {
      const payload = { page, session_key: getSessionKey(), ...extra };
      if (referrer) payload.referrer = referrer;
      const { error } = await db.from("page_views").insert(payload);
      if (error && String(error.message || '').includes('session_key')) {
        delete payload.session_key;
        const retry = await db.from("page_views").insert(payload);
        if (retry.error) console.warn('[trackPageView] insert error:', retry.error.message);
        return;
      }
      if (error) console.warn('[trackPageView] insert error:', error.message);
    } catch (e) { console.warn('[trackPageView] exception:', e); }
  }

  // 알려진 크롤러/봇 User-Agent 패턴만 매칭 (완전 차단이 아닌 "알려진 봇 제외" 수준)
  const BOT_UA_PATTERN = /bot|crawl|spider|slurp|googlebot|bingbot|yandex|baiduspider|duckduckbot|facebookexternalhit|twitterbot|slackbot|telegrambot|whatsapp|kakaotalk-scrap|naverbot|daumoa|ahrefsbot|semrushbot|mj12bot|dotbot|petalbot|bytespider|ia_archiver|linkedinbot|discordbot|embedly|pinterest/i;
  function _isBotUA() {
    return typeof navigator !== 'undefined' && BOT_UA_PATTERN.test(navigator.userAgent || '');
  }
  function _currentVisitorUserId() {
    try {
      const u = JSON.parse(localStorage.getItem('kakao_user') || 'null');
      return u?.id ? String(u.id) : null;
    } catch (err) { console.error('[_currentVisitorUserId]', err); return null; }
  }
  const _ADMIN_USER_ID = '4916417947';
  function _isLocalhost() {
    return typeof location !== 'undefined' && (location.hostname === '127.0.0.1' || location.hostname === 'localhost');
  }
  function _isAdminVisitor() {
    try {
      return !!localStorage.getItem('cottage_is_admin') || _currentVisitorUserId() === _ADMIN_USER_ID;
    } catch (err) { console.error('[_isAdminVisitor]', err); return false; }
  }
  function _shouldSkipAnalytics() {
    return _isLocalhost() || _isAdminVisitor();
  }

  // 최상위 프레임인가. index.html은 플래너·기록 모달을 **iframe으로 미리 로드**하는데,
  // 각 iframe이 이 파일을 다시 로드해 자기 세션 추적을 돌린다. 그러면 한 사람이 한 탭만
  // 열어도 같은 실시간이 프레임 수만큼 계상된다(#24 — E2E 실측 3.5배).
  function _isEmbeddedFrame() {
    try { return typeof window !== 'undefined' && window.top !== window.self; }
    catch (err) { return true; } // 크로스오리진 접근 차단 = 남의 프레임 안 = 추적 안 함
  }

  // ── 추적 게이트는 둘뿐이다. 새 추적을 추가할 땐 반드시 이 중 하나를 골라 쓴다 ──
  //
  //   _shouldSkipAnalytics()       ← **사용자 행동**(trackEvent). 프레임 무관.
  //   _shouldSkipSessionTracking() ← **세션·방문**(체류시간·page_views·page_sessions·방문수)
  //
  // 둘을 가르는 기준은 하나다: **"iframe 안에서 일어나도 진짜인가?"**
  //   - 기록 모달(iframe)에서 실제로 저장한 record_complete → **진짜다.** 프레임을 이유로
  //     버리면 퍼널이 다시 빈다. 그래서 이벤트는 프레임을 안 본다.
  //   - 반대로 "방문"과 "체류시간"은 사람·탭 단위 개념이라 **부모 페이지 1회**가 맞다.
  //     iframe은 부모 페이지의 구성요소지 별도 방문이 아니다.
  //
  // ⚠️ 예전엔 호출부마다 `_shouldSkipAnalytics()`와 `_isEmbeddedFrame()`을 **나란히 두 줄**로
  //    적었다(3곳). 같은 규칙을 흩뿌리면 새 추적을 넣을 때 한쪽만 빠뜨린다 — 실제로 #24가
  //    그런 종류의 누락이었다. 규칙은 여기 한 곳에만 둔다.
  function _shouldSkipSessionTracking() {
    return _shouldSkipAnalytics() || _isEmbeddedFrame();
  }

  // ── 이벤트 트래킹 ───────────────────────────────────────

  async function trackEvent(eventType, opts = {}) {
    if (typeof location === 'undefined') return;
    if (_shouldSkipAnalytics()) return;
    const kstDate = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
    const referrer = localStorage.getItem(`cottage_orig_src_${kstDate}`) || null;
    const payload = { event_type: eventType, referrer, session_key: getSessionKey(), user_id: _sessionUserId || null };
    if (opts.game_id) payload.game_id = opts.game_id;
    try {
      const { error } = await db.from('page_events').insert(payload);
      if (error) console.error('[trackEvent]', error);
    } catch (err) { console.error('[trackEvent]', err);}
  }

  // ── 플레이 기록 ─────────────────────────────────────────

  async function uploadPlayPhoto(file, userId) {
    if (!file) return null;
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${userId || 'anon'}/${Date.now()}.${ext}`;
      const { data, error } = await db.storage.from('play-photos').upload(path, file, { upsert: false });
      if (error) { console.error('[uploadPlayPhoto]', error); return null; }
      return db.storage.from('play-photos').getPublicUrl(data.path).data.publicUrl;
    } catch (e) { console.error('[uploadPlayPhoto]', e); return null; }
  }

  // ── 게임 정리법 사진 / 룰설명 (관리자 입력, game_overrides) ────────

  // Supabase Storage 키는 ASCII 외 문자를 거부한다(한글 game_key를 그대로 쓰면
  // "Invalid key" 에러 — encodeURIComponent로도 안 됨, 서버가 디코드 후 재검증함).
  // UTF-8 바이트를 hex로 바꿔 순수 ASCII 경로 세그먼트를 만든다(실DB로 검증됨).
  function _storageSafeKey(s) {
    return Array.from(new TextEncoder().encode(String(s))).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function uploadOrganizerPhoto(file, gameKey) {
    if (!file || !gameKey) return null;
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${_storageSafeKey(gameKey)}/${Date.now()}.${ext}`;
      const { data, error } = await db.storage.from('organizer-photos').upload(path, file, { upsert: false });
      if (error) { console.error('[uploadOrganizerPhoto]', error); return null; }
      return db.storage.from('organizer-photos').getPublicUrl(data.path).data.publicUrl;
    } catch (e) { console.error('[uploadOrganizerPhoto]', e); return null; }
  }

  async function getGameOverride(gameKey) {
    if (!gameKey) return null;
    try {
      const { data, error } = await db.from('game_overrides').select('*').eq('game_key', gameKey).maybeSingle();
      if (error) { console.error('[getGameOverride]', error); return null; }
      return data;
    } catch (e) { console.error('[getGameOverride]', e); return null; }
  }

  // ruleSections: {goal, setup, play, end} 전부 선택값(021) — 관리자 폼이 매번 4칸을
  // 전부 같이 저장하는 단일 폼이라(requests-admin.html 「게임 관리」 저장 버튼 하나) 여기서
  // 부분 필드만 받는 걸 걱정할 필요는 없다. 빈 문자열 키는 null로 접어 DB에 잡동사니를 안 남긴다.
  async function upsertGameOverride(gameKey, { organizerPhotoUrls, organizerNote, ruleNote, errorNote, ruleSections }) {
    if (!gameKey) return false;
    try {
      let sections = null;
      if (ruleSections && typeof ruleSections === 'object') {
        const cleaned = {};
        for (const k of ['goal', 'setup', 'play', 'end']) {
          const v = (ruleSections[k] || '').trim();
          if (v) cleaned[k] = v;
        }
        if (Object.keys(cleaned).length) sections = cleaned;
      }
      const { error } = await db.from('game_overrides').upsert({
        game_key: gameKey,
        organizer_photo_urls: organizerPhotoUrls || [],
        organizer_note: organizerNote || null,
        rule_note: ruleNote || null,
        error_note: errorNote || null,
        rule_sections: sections,
        updated_at: new Date().toISOString(),
      });
      if (error) { console.error('[upsertGameOverride]', error); return false; }
      return true;
    } catch (e) { console.error('[upsertGameOverride]', e); return false; }
  }

  async function recordGamePlay(gameId, playerCount, playerNames, playTimeMin, scoreNote, nickname, userId, groupName, playedAt, photoUrl, reviewText) {
    try {
      const { data, error } = await db.from("game_play_records").insert({
        game_id: gameId,
        player_count: playerCount || null,
        player_names: playerNames || null,
        play_time_min: playTimeMin || null,
        score_note: scoreNote || null,
        nickname: nickname || null,
        user_id: userId || null,
        group_name: groupName || null,
        played_at: playedAt || null,
        photo_url: photoUrl || null,
        review_text: reviewText || null,
      }).select("id");
      if (!error) {
        const id = data?.[0]?.id || null;
        if (userId) {
          window.checkAchievements?.('record', userId, { gameId, hasPhoto: !!photoUrl });
          getUserFirstRecordCount(userId).then(frc => {
            window.checkAchievements?.('first_record', userId, { firstRecordCount: frc });
          }).catch(() => {});
          const _nick = window.getKakaoUser?.()?.nickname;
          if (_nick) {
            getUserParticipationCount(userId, _nick).then(pc => {
              window.checkAchievements?.('play', userId, { participationCount: pc });
            }).catch(() => {});
            getUserUniqueDayCount(userId, _nick).then(dc => {
              window.checkAchievements?.('balance', userId, { visitingDayCount: dc });
            }).catch(() => {});
          }
          grantFirstPlayVoucher(userId).then(granted => {
            if (granted) {
              console.log('[voucher] 첫 플레이 기록 교환권 지급 완료');
              setTimeout(() => window._onVoucherGranted?.(), 4500);
            }
          }).catch(e => console.warn('[voucher] grantFirstPlayVoucher 오류:', e));
        }
        _emitRecordChanged();
        return { success: true, id };
      }
      return { error };
    } catch (e) {
      return { error: e };
    }
  }

  async function getGamePlayRecords(gameId, limit = 30) {
    try {
      const ids = Array.isArray(gameId) ? gameId.map(String) : [String(gameId)];
      // 🚨 game_id는 필터(.eq/.in) 조건이라 SELECT에 없어도 조회 자체는 되지만, 반환된 행을
      // 다시 game_id로 써야 하는 호출부(남의 세션 참여 → recordGamePlay)에선 undefined가
      // NULL로 들어가 NOT NULL 제약 위반으로 저장이 통째로 실패했다(2026-07-31 발견,
      // "저장에 실패했어요" — _getOthersSessions의 세션 객체가 매번 game_id 없이 만들어졌었다).
      const base = db.from("game_play_records")
        .select("id, game_id, nickname, user_id, player_count, player_names, play_time_min, score_note, group_name, played_at, photo_url, review_text, created_at");
      const { data, error } = await (ids.length > 1 ? base.in("game_id", ids) : base.eq("game_id", ids[0]))
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) console.error('[getGamePlayRecords]', error);
      return data || [];
    } catch (err) { console.error('[getGamePlayRecords]', err);
      return [];
    }
  }

  async function deleteGamePlay(id) {
    if (!id) return { error: "invalid" };
    try {
      const { error } = await db.from("game_play_records").delete().eq("id", id);
      if (error) return { error };
      _emitRecordChanged();
      return { success: true };
    } catch (e) {
      return { error: e };
    }
  }

  async function updateGamePlay(id, { player_count, player_names, play_time_min, score_note, group_name, played_at, review_text, game_id, photo_url }) {
    if (!id) return { error: "invalid" };
    try {
      // 🚨 부분 갱신이다 — 호출부가 넘기지 않은 필드는 손대지 않는다(2026-07-31 발견: 예전엔
      // group_name/played_at을 항상 포함해 photo_url·review_text만 바꾸려는 호출(전 프로젝트에
      // 8곳)이 매번 그 둘을 조용히 NULL로 지웠다 — 모임 그룹명·플레이 날짜가 사진 하나 추가할
      // 때마다 사라지는 실제 데이터 손실이었다).
      const fields = {};
      if (player_count !== undefined) fields.player_count = player_count;
      if (player_names !== undefined) fields.player_names = player_names;
      if (play_time_min !== undefined) fields.play_time_min = play_time_min;
      if (score_note !== undefined) fields.score_note = score_note;
      if (group_name !== undefined) fields.group_name = group_name || null;
      if (played_at !== undefined) fields.played_at = played_at || null;
      if (review_text !== undefined) fields.review_text = review_text || null;
      if (game_id) fields.game_id = game_id;
      if (photo_url !== undefined) fields.photo_url = photo_url || null;
      const { data, error } = await db.from("game_play_records")
        .update(fields)
        .eq("id", id)
        .select("user_id");
      if (error) return { error };
      const userId = data?.[0]?.user_id;
      if (userId) {
        window.checkAchievements?.('record', userId, {});
        const _nick = window.getKakaoUser?.()?.nickname;
        if (_nick) {
          getUserParticipationCount(userId, _nick).then(pc => {
            window.checkAchievements?.('play', userId, { participationCount: pc });
          }).catch(() => {});
          getUserUniqueDayCount(userId, _nick).then(dc => {
            window.checkAchievements?.('balance', userId, { visitingDayCount: dc });
          }).catch(() => {});
        }
      }
      _emitRecordChanged();
      return { success: true };
    } catch (e) {
      return { error: e };
    }
  }

  async function getGroupNames() {
    try {
      const { data, error } = await db
        .from("game_play_records")
        .select("group_name")
        .not("group_name", "is", null)
        .neq("group_name", "");
      if (error) console.error('[getGroupNames]', error);
      if (!data) return [];
      return [...new Set(data.map(r => r.group_name).filter(Boolean))].sort();
    } catch (err) { console.error('[getGroupNames]', err);
      return [];
    }
  }

  // 개별 이름 자동완성 표시 순서 — 원하는 순서로 편집
  const MEMBER_ORDER = ['호핀', '김기성', 'DK', '설애', '덕지', '죠르디'];

  // 콤보 문자열을 MEMBER_ORDER 기준으로 정규화 (자동완성 중복 제거용)
  function normalizeComboForAc(str) {
    const parts = str.split(',').map(n => n.trim()).filter(Boolean);
    return [
      ...MEMBER_ORDER.filter(n => parts.includes(n)),
      ...parts.filter(n => !MEMBER_ORDER.includes(n)),
    ].join(', ');
  }

  async function getPlayerNames() {
    try {
      const { data, error } = await db
        .from("game_play_records")
        .select("player_names")
        .not("player_names", "is", null)
        .neq("player_names", "");
      if (error) console.error('[getPlayerNames]', error);
      if (!data) return [];
      // 콤보: MEMBER_ORDER로 정규화 후 중복 제거 → 같은 멤버면 하나만 표시
      const combos = [...new Set(
        data.map(r => r.player_names.trim()).filter(Boolean).map(normalizeComboForAc)
      )];
      const rawIndividuals = [...new Set(
        data.flatMap(r => (r.player_names || "").split(",").map(n => n.trim()).filter(Boolean))
      )];
      // MEMBER_ORDER 기준 정렬, 목록에 없는 이름은 뒤에 추가
      const individuals = [
        ...MEMBER_ORDER.filter(n => rawIndividuals.includes(n)),
        ...rawIndividuals.filter(n => !MEMBER_ORDER.includes(n)),
      ];
      // 조합(전체) 먼저, 그 다음 개별 이름
      return [...new Set([...combos, ...individuals])];
    } catch (err) { console.error('[getPlayerNames]', err);
      return [];
    }
  }

  async function getAllPlayRecordsForHistory(limit = 500) {
    try {
      const { data, error } = await db
        .from("game_play_records")
        .select("id, game_id, nickname, user_id, player_count, player_names, play_time_min, score_note, group_name, played_at, photo_url, review_text, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) console.error('[getAllPlayRecordsForHistory]', error);
      return data || [];
    } catch (err) { console.error('[getAllPlayRecordsForHistory]', err);
      return [];
    }
  }

  async function getGamePlayCount(gameId) {
    try {
      const ids = Array.isArray(gameId) ? gameId.map(String) : [String(gameId)];
      const base = db.from("game_play_records").select("*", { count: "exact", head: true });
      const { count, error } = await (ids.length > 1 ? base.in("game_id", ids) : base.eq("game_id", ids[0]));
      if (error) console.error('[getGamePlayCount]', error);
      return count || 0;
    } catch (err) { console.error('[getGamePlayCount]', err);
      return 0;
    }
  }

  // ── 플레이 하이라이트 ────────────────────────────────────

  async function getPlayHighlights(gameId) {
    try {
      const ids = Array.isArray(gameId) ? gameId.map(String) : [String(gameId)];
      const base = db.from("play_highlights").select("highlight_text, created_at");
      const { data, error } = await (ids.length > 1 ? base.in("game_id", ids) : base.eq("game_id", ids[0]))
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) console.error('[getPlayHighlights]', error);
      return data || [];
    } catch (err) { console.error('[getPlayHighlights]', err);
      return [];
    }
  }

  // ── 게임 코멘트 ─────────────────────────────────────────

  async function getPlayReviewsByGame(gameId, limit = 20) {
    if (!gameId) return [];
    try {
      const ids = Array.isArray(gameId) ? gameId.map(String) : [String(gameId)];
      const base = db.from('game_play_records')
        .select('id, nickname, user_id, review_text, played_at, created_at, group_name')
        .not('review_text', 'is', null)
        .neq('review_text', '')
        .order('created_at', { ascending: false })
        .limit(limit);
      const { data, error } = await (ids.length > 1 ? base.in('game_id', ids) : base.eq('game_id', ids[0]));
      if (error) console.error('[getPlayReviewsByGame]', error);
      return data || [];
    } catch (err) { console.error('[getPlayReviewsByGame]', err); return []; }
  }

  async function getGameComments(gameKey, limit = 10) {
    try {
      const keys = Array.isArray(gameKey) ? gameKey.map(String) : [String(gameKey)];
      const base = db
        .from("game_comments")
        .select("id, comment_text, nickname, user_id, record_id, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      const { data, error } = await (keys.length > 1 ? base.in('game_key', keys) : base.eq('game_key', keys[0]));
      if (error) console.error('[getGameComments]', error);
      return data || [];
    } catch (err) { console.error('[getGameComments]', err);
      return [];
    }
  }

  // (014) 특정 플레이기록들에 매인 게임평 조회 — buildSessionBody가 화면 기록 id로 한 번에 로드.
  async function getRecordComments(recordIds) {
    const ids = (Array.isArray(recordIds) ? recordIds : [recordIds]).map(String).filter(Boolean);
    if (!ids.length) return [];
    try {
      const { data, error } = await db
        .from("game_comments")
        .select("id, game_key, comment_text, nickname, user_id, record_id, created_at")
        .in('record_id', ids)
        .order("created_at", { ascending: true });
      if (error) console.error('[getRecordComments]', error);
      return data || [];
    } catch (err) { console.error('[getRecordComments]', err);
      return [];
    }
  }

  async function insertComment(gameKey, commentText, nickname, userId, recordId) {
    if (!gameKey || !commentText?.trim()) return { error: "invalid" };
    try {
      const { data, error } = await db
        .from("game_comments")
        .insert({
          game_key: gameKey,
          comment_text: commentText.trim(),
          nickname: nickname || null,
          user_id: userId || null,
          record_id: recordId || null,   // (014) 기록에 매인 게임평이면 그 기록 id
        })
        .select("id");
      if (error) return { error };
      if (userId) window.checkAchievements?.('review', String(userId));
      return { success: true, id: data?.[0]?.id };
    } catch (e) {
      return { error: e };
    }
  }

  async function deleteComment(id) {
    if (!id) return { error: "invalid" };
    try {
      const { error } = await db.from("game_comments").delete().eq("id", id);
      return error ? { error } : { success: true };
    } catch (e) {
      return { error: e };
    }
  }

  async function updateComment(id, commentText) {
    if (!id || !commentText?.trim()) return { error: "invalid" };
    try {
      const { error } = await db
        .from("game_comments")
        .update({ comment_text: commentText.trim() })
        .eq("id", id);
      return error ? { error } : { success: true };
    } catch (e) {
      return { error: e };
    }
  }

  // ── 따봉 (game_likes) ────────────────────────────────────

  async function getGameLikeCount(gameId) {
    try {
      const { count, error } = await db
        .from("game_likes")
        .select("*", { count: "exact", head: true })
        .eq("game_id", gameId);
      if (error) console.error('[getGameLikeCount]', error);
      return count || 0;
    } catch (err) { console.error('[getGameLikeCount]', err);
      return 0;
    }
  }

  async function toggleGameLike(gameId, userId) {
    if (!gameId || !userId) return { error: "invalid" };
    try {
      const { data: existing, error } = await db
        .from("game_likes")
        .select("id")
        .eq("game_id", gameId)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) console.error('[toggleGameLike]', error);
      if (existing) {
        const { error: delErr } = await db.from("game_likes").delete().eq("id", existing.id);
        if (delErr) console.error('[toggleGameLike] delete', delErr);
        return { liked: false };
      } else {
        const { error: insErr } = await db.from("game_likes").insert({ game_id: gameId, user_id: userId });
        if (insErr) console.error('[toggleGameLike] insert', insErr);
        return { liked: true };
      }
    } catch (e) {
      return { error: e };
    }
  }

  async function hasUserLiked(gameId, userId) {
    if (!gameId || !userId) return false;
    try {
      const { data, error } = await db
        .from("game_likes")
        .select("id")
        .eq("game_id", gameId)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) console.error('[hasUserLiked]', error);
      return !!data;
    } catch (err) { console.error('[hasUserLiked]', err);
      return false;
    }
  }

  // ── 궁금해요 (game_curious) ──────────────────────────
  async function getGameCuriousCount(gameId) {
    try {
      const { count, error } = await db
        .from("game_curious")
        .select("*", { count: "exact", head: true })
        .eq("game_id", gameId);
      if (error) console.error('[getGameCuriousCount]', error);
      return count || 0;
    } catch (err) { console.error('[getGameCuriousCount]', err); return 0; }
  }

  async function toggleGameCurious(gameId, userId) {
    if (!gameId || !userId) return { error: "invalid" };
    try {
      const { data: existing, error } = await db
        .from("game_curious")
        .select("id")
        .eq("game_id", gameId)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) console.error('[toggleGameCurious]', error);
      if (existing) {
        const { error: delErr } = await db.from("game_curious").delete().eq("id", existing.id);
        if (delErr) console.error('[toggleGameCurious] delete', delErr);
        return { curious: false };
      } else {
        const { error: insErr } = await db.from("game_curious").insert({ game_id: gameId, user_id: userId });
        if (insErr) console.error('[toggleGameCurious] insert', insErr);
        return { curious: true };
      }
    } catch (e) { return { error: e }; }
  }

  async function hasUserCurious(gameId, userId) {
    if (!gameId || !userId) return false;
    try {
      const { data, error } = await db
        .from("game_curious")
        .select("id")
        .eq("game_id", gameId)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) console.error('[hasUserCurious]', error);
      return !!data;
    } catch (err) { console.error('[hasUserCurious]', err); return false; }
  }

  async function getUserLikedGames(userId) {
    if (!userId) return [];
    try {
      const { data, error } = await db.from('game_likes').select('game_id').eq('user_id', userId);
      if (error) console.error('[getUserLikedGames]', error);
      return (data || []).map(r => r.game_id);
    } catch (err) { console.error('[getUserLikedGames]', err); return []; }
  }

  async function getUserCuriousGames(userId) {
    if (!userId) return [];
    try {
      const { data, error } = await db.from('game_curious').select('game_id').eq('user_id', userId);
      if (error) console.error('[getUserCuriousGames]', error);
      return (data || []).map(r => r.game_id);
    } catch (err) { console.error('[getUserCuriousGames]', err); return []; }
  }

  async function _getReactionUsers(table, gameId, limit) {
    try {
      const { data: rows, error: rowsErr } = await db.from(table).select('user_id').eq('game_id', gameId).limit(limit);
      if (rowsErr) console.error('[_getReactionUsers]', rowsErr);
      if (!rows?.length) return [];
      const ids = rows.map(r => r.user_id);
      const { data: profs, error: profsErr } = await db.from('profiles').select('user_id, nickname, photo_url, rep_achievement_id').in('user_id', ids);
      if (profsErr) console.error('[_getReactionUsers]', profsErr);
      return profs || [];
    } catch (err) { console.error('[_getReactionUsers]', err); return []; }
  }

  function getGameLikers(gameId, limit = 6) { return _getReactionUsers('game_likes', gameId, limit); }
  function getGameCuriousUsers(gameId, limit = 6) { return _getReactionUsers('game_curious', gameId, limit); }

  // ── 취향보드 (game_likes / game_curious with custom_name) ────────────

  async function getUserLikedGamesAll(userId) {
    if (!userId) return [];
    try {
      const { data, error } = await db.from('game_likes').select('game_id, custom_name').eq('user_id', userId);
      if (error) console.error('[getUserLikedGamesAll]', error);
      return data || [];
    } catch (err) { console.error('[getUserLikedGamesAll]', err); return []; }
  }

  async function getUserCuriousGamesAll(userId) {
    if (!userId) return [];
    try {
      const { data, error } = await db.from('game_curious').select('game_id, custom_name').eq('user_id', userId);
      if (error) console.error('[getUserCuriousGamesAll]', error);
      return data || [];
    } catch (err) { console.error('[getUserCuriousGamesAll]', err); return []; }
  }

  async function addGamePref(userId, gameId, customName, table) {
    if (!userId || (!gameId && !customName)) return { error: 'invalid' };
    try {
      const row = { user_id: userId };
      if (gameId) row.game_id = gameId;
      if (customName) row.custom_name = customName;
      const { error } = await db.from(table).insert(row);
      return error ? { error } : { success: true };
    } catch (e) { return { error: e }; }
  }

  async function removeGamePref(userId, gameId, customName, table) {
    if (!userId) return { error: 'invalid' };
    try {
      let q = db.from(table).delete().eq('user_id', userId);
      if (gameId) q = q.eq('game_id', gameId);
      else if (customName) q = q.eq('custom_name', customName).is('game_id', null);
      const { error } = await q;
      return error ? { error } : { success: true };
    } catch (e) { return { error: e }; }
  }

  async function getCustomPrefSuggestions() {
    try {
      const [l, c] = await Promise.all([
        db.from('game_likes').select('custom_name').not('custom_name', 'is', null),
        db.from('game_curious').select('custom_name').not('custom_name', 'is', null),
      ]);
      // Promise.all + 비구조분해 결과라 2단계 codemod가 지나친 자리 — 쿼리 오류가 조용히 빈 값이 됨
      if (l.error) console.error('[getCustomPrefSuggestions:game_likes]', l.error);
      if (c.error) console.error('[getCustomPrefSuggestions:game_curious]', c.error);
      const names = new Set([...(l.data || []), ...(c.data || [])].map(r => r.custom_name).filter(Boolean));
      return [...names].sort();
    } catch (err) { console.error('[getCustomPrefSuggestions]', err); return []; }
  }

  // profiles.bio는 "한줄소개" SSOT다. 취향보드(taste board)와 자기소개(member_intros)
  // 양쪽이 이 함수로 동일 컬럼을 읽고/쓴다 — 한쪽에서 수정하면 다른 쪽에도 즉시 반영된다.
  async function updateUserBio(userId, bio) {
    if (!userId) return { error: 'invalid' };
    try {
      const { error } = await db.from('profiles').update({ bio: bio || null }).eq('user_id', userId);
      return error ? { error } : { success: true };
    } catch (e) { return { error: e }; }
  }

  // ── 모임 보드 / 회원 자기소개 공유 프로필 ──────────────────
  // member_intros: 유저당 1행(UNIQUE user_id) — 활동지역/참여시간/이동범위/모임스타일
  // profiles.bio: 한줄소개 SSOT (updateUserBio 재사용, 취향보드와 공유)
  // meeting_game_prefs: list_type으로 "이번에 하고 싶은 게임" / "룰 설명 가능한 게임" 구분

  async function getMeetingGamePrefs(userId, listType) {
    if (!userId) return [];
    try {
      const { data, error } = await db.from('meeting_game_prefs')
        .select('id, game_id, custom_name')
        .eq('user_id', userId)
        .eq('list_type', listType);
      if (error) console.error('[getMeetingGamePrefs]', error);
      return data || [];
    } catch (err) { console.error('[getMeetingGamePrefs]', err); return []; }
  }

  async function addMeetingGamePref(userId, listType, gameId, customName) {
    if (!userId || (!gameId && !customName)) return { error: 'invalid' };
    try {
      const row = { user_id: userId, list_type: listType };
      if (gameId) row.game_id = gameId;
      if (customName) row.custom_name = customName;
      const { error } = await db.from('meeting_game_prefs').insert(row);
      return error ? { error } : { success: true };
    } catch (e) { return { error: e }; }
  }

  async function removeMeetingGamePref(userId, listType, gameId, customName) {
    if (!userId) return { error: 'invalid' };
    try {
      let q = db.from('meeting_game_prefs').delete().eq('user_id', userId).eq('list_type', listType);
      if (gameId) q = q.eq('game_id', gameId);
      else if (customName) q = q.eq('custom_name', customName).is('game_id', null);
      const { error } = await q;
      return error ? { error } : { success: true };
    } catch (e) { return { error: e }; }
  }

  const MEMBER_INTRO_LEGACY_TIME_RANGES = {
    morning: [12, 24],
    afternoon: [24, 36],
    evening: [36, 48],
    late_night: [0, 12],
  };

  function memberIntroSlotCode(index) {
    const minutes = (index % 48) * 30;
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${minutes % 60 ? '30' : '00'}`;
  }

  // 과거 오전/오후/저녁/심야 값을 30분 슬롯으로 읽되 DB 행을 일괄 변경하지 않는다.
  function normalizeMemberIntroTimes(values) {
    const slots = new Set();
    let flexible = false;
    (values || []).forEach(value => {
      if (value === 'flexible') { flexible = true; return; }
      const legacy = MEMBER_INTRO_LEGACY_TIME_RANGES[value];
      if (legacy) {
        for (let i = legacy[0]; i < legacy[1]; i++) slots.add(memberIntroSlotCode(i));
        return;
      }
      if (/^([01][0-9]|2[0-3]):(00|30)$/.test(value)) slots.add(value);
    });
    const ordered = [...slots].sort((a, b) => a.localeCompare(b));
    if (flexible) ordered.push('flexible');
    return ordered;
  }

  function formatMemberIntroTimePoint(slotIndex, allow24 = false) {
    if (allow24 && slotIndex === 48) return '24시';
    const minutes = (slotIndex % 48) * 30;
    const hour = String(Math.floor(minutes / 60)).padStart(2, '0');
    return minutes % 60 ? `${hour}시30분` : `${hour}시`;
  }

  // 0시 경계에서 이어진 슬롯도 한 범위로 합쳐 22시30분~01시처럼 표시한다.
  function formatMemberIntroTimes(values) {
    const normalized = normalizeMemberIntroTimes(values);
    const flexible = normalized.includes('flexible');
    const selected = new Set(normalized.filter(value => value !== 'flexible').map(value => {
      const [hour, minute] = value.split(':').map(Number);
      return hour * 2 + (minute === 30 ? 1 : 0);
    }));
    const ranges = [];
    let start = null;
    for (let i = 0; i <= 48; i++) {
      const on = i < 48 && selected.has(i);
      if (on && start == null) start = i;
      if (!on && start != null) { ranges.push({ start, end:i, wraps:false }); start = null; }
    }
    if (ranges.length > 1 && ranges[0].start === 0 && ranges[ranges.length - 1].end === 48) {
      const first = ranges.shift();
      const last = ranges.pop();
      ranges.push({ start:last.start, end:first.end, wraps:true });
    }
    const labels = ranges.map(range => {
      const end = range.wraps ? range.end : range.end;
      return `${formatMemberIntroTimePoint(range.start)}~${formatMemberIntroTimePoint(end, !range.wraps)}`;
    });
    if (flexible) labels.push('시간대 유동적');
    return labels.join(' · ');
  }

  // 본인 모임 보드 / 자기소개 편집용 — profiles.bio + member_intros + game_likes/game_curious + can_explain_rules 통합 조회
  // want_this_time은 game_likes 미러링으로 전환 후 읽기 중단 (db-schema.md UNUSED 참조)
  async function getMeetingProfile(userId) {
    if (!userId) return null;
    try {
      const [profileRes, introRes, likedGames, curiousGames, ruleGames] = await Promise.all([
        db.from('profiles').select('bio, avoid_tags').eq('user_id', userId).maybeSingle(),
        db.from('member_intros').select('*').eq('user_id', userId).maybeSingle(),
        getUserLikedGamesAll(userId),
        getUserCuriousGamesAll(userId),
        getMeetingGamePrefs(userId, 'can_explain_rules'),
      ]);
      // Promise.all + 비구조분해 결과라 2단계 codemod가 지나친 자리 — 쿼리 오류가 조용히 빈 값이 됨
      if (profileRes.error) console.error('[getMeetingProfile:profiles]', profileRes.error);
      if (introRes.error) console.error('[getMeetingProfile:member_intros]', introRes.error);
      const intro = introRes.data || {};
      return {
        bio: profileRes.data?.bio || '',
        // 취향보드 '피하는 유형'. 모임보드도 비선호 칩으로 같은 값을 표시하므로 여기서 함께 반환
        // → 두 보드가 이 함수 하나만 보면 되는 단일 소스가 됨(R10b)
        avoidTags: profileRes.data?.avoid_tags || [],
        nickname: intro.nickname || '',
        location: intro.location || '',
        available: intro.available || '',
        travelRange: intro.travel_range || '',
        meetingStyle: intro.meeting_style || [],
        favoriteGames: intro.favorite_games || '',
        cardColor: intro.card_color || '',
        companionTypes: intro.companion_types || [],
        averagePlayFrequency: intro.average_play_frequency,
        possibleFrequencyMin: intro.possible_frequency_min,
        possibleFrequencyMax: intro.possible_frequency_max,
        desiredFrequencyMin: intro.desired_frequency_min,
        desiredFrequencyMax: intro.desired_frequency_max,
        availableDays: intro.available_days || [],
        availableTimes: intro.available_times || [],
        preferredGameTypes: intro.preferred_game_types || [],
        clocktowerPreference: intro.clocktower_preference || '',
        expectation: intro.expectation || '',
        questionnaireCompletedAt: intro.questionnaire_completed_at || null,
        likedGames,
        curiousGames,
        ruleGames,
      };
    } catch (err) { console.error('[getMeetingProfile]', err); return null; }
  }

  // member_intros upsert — 유저당 1행(UNIQUE user_id), 자기소개/모임보드 양쪽에서 호출
  async function upsertMeetingIntro(userId, fields) {
    if (!userId) return { error: 'invalid' };
    try {
      const row = { user_id: userId, ...fields };
      const { error } = await db.from('member_intros').upsert(row, { onConflict: 'user_id' });
      return error ? { error } : { success: true };
    } catch (e) { return { error: e }; }
  }

  // 필수 자기소개 전체 저장 + 최초 1회 음료교환권 지급.
  // DB RPC가 두 작업을 한 트랜잭션으로 묶고 intro_complete partial unique로 중복 지급을 막는다.
  async function submitMemberIntro(userId, answers) {
    if (!userId || !answers) return { error: 'invalid' };
    try {
      const { data, error } = await db.rpc('submit_member_intro', {
        p_user_id: String(userId),
        p_nickname: answers.nickname,
        p_join_sources: answers.joinSources,
        p_companion_types: answers.companionTypes,
        p_average_play_frequency: answers.averagePlayFrequency,
        p_possible_frequency_min: answers.possibleFrequencyMin,
        p_possible_frequency_max: answers.possibleFrequencyMax,
        p_desired_frequency_min: answers.desiredFrequencyMin,
        p_desired_frequency_max: answers.desiredFrequencyMax,
        p_available_days: answers.availableDays,
        p_available_times: answers.availableTimes,
        p_preferred_game_types: answers.preferredGameTypes,
        p_avoid_game_types: answers.avoidGameTypes,
        p_clocktower_preference: answers.clocktowerPreference,
        p_expectation: answers.expectation,
      });
      if (error) {
        console.error('[submitMemberIntro]', error);
        return { error };
      }
      const row = data?.[0] || {};
      return { success: true, id: row.intro_id || null, voucherGranted: !!row.voucher_granted };
    } catch (e) {
      console.error('[submitMemberIntro]', e);
      return { error: e };
    }
  }

  async function getAllBioTagSuggestions() {
    try {
      const { data, error } = await db.from('profiles').select('bio').not('bio', 'is', null);
      if (error) console.error('[getAllBioTagSuggestions]', error);
      const allTags = (data || []).flatMap(r => (r.bio || '').split(',').map(t => t.trim()).filter(Boolean));
      return [...new Set(allTags)].sort();
    } catch (err) { console.error('[getAllBioTagSuggestions]', err); return []; }
  }

  async function getAllAvoidTagSuggestions() {
    try {
      const { data, error } = await db.from('profiles').select('avoid_tags').not('avoid_tags', 'is', null);
      if (error) console.error('[getAllAvoidTagSuggestions]', error);
      const allTags = (data || []).flatMap(r => r.avoid_tags || []);
      return [...new Set(allTags)].sort();
    } catch (err) { console.error('[getAllAvoidTagSuggestions]', err); return []; }
  }

  async function updateUserAvoidTags(userId, tags) {
    if (!userId) return { error: 'invalid' };
    try {
      const { error } = await db.from('profiles').update({ avoid_tags: tags }).eq('user_id', userId);
      return error ? { error } : { success: true };
    } catch (e) { return { error: e }; }
  }

  // ── 방문자 통계 ─────────────────────────────────────

  async function getVisitorStats() {
    try {
      const kstNow = new Date(Date.now() + 9 * 3600000);
      const todayKst = kstNow.toISOString().slice(0, 10);
      const todayStart = new Date(todayKst + 'T00:00:00+09:00').toISOString();
      const todayEnd   = new Date(todayKst + 'T23:59:59+09:00').toISOString();
      const [totalRes, todayRes] = await Promise.all([
        db.from('page_views').select('id', { count: 'exact', head: true }).eq('page', '__visitor__'),
        db.from('page_views').select('id', { count: 'exact', head: true })
          .eq('page', '__visitor__').gte('created_at', todayStart).lte('created_at', todayEnd),
      ]);
      // Promise.all + 비구조분해 결과라 2단계 codemod가 지나친 자리 — 쿼리 오류가 조용히 빈 값이 됨
      if (totalRes.error) console.error('[getVisitorStats:page_views total]', totalRes.error);
      if (todayRes.error) console.error('[getVisitorStats:page_views today]', todayRes.error);
      return { total: totalRes.count || 0, today: todayRes.count || 0 };
    } catch (err) { console.error('[getVisitorStats]', err);
      return null;
    }
  }

  // ── 자동 페이지 뷰 트래킹 ──────────────────────────────

  document.addEventListener("DOMContentLoaded", function () {
    // 이 블록 전체가 "방문" 기록이다 — 게이트는 여기 하나뿐이어야 한다.
    // (로컬·관리자 제외 + iframe은 부모 페이지의 구성요소지 별도 방문이 아님, #24)
    if (_shouldSkipSessionTracking()) return;
    // 유입 경로 캡처 — 날짜+source+page 기준 1회 dedup, 채널별 페이지 이동 각각 기록
    const kstDate = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
    const visitedKey = "cottage_visited_" + kstDate;
    const page =
      location.pathname.split("/").filter(Boolean).pop()?.replace(".html", "") ||
      "index";
    const referrer = (() => {
      const utm = new URLSearchParams(location.search).get('utm_source');
      if (utm) return utm;
      if (!document.referrer) return null;
      try {
        const u = new URL(document.referrer);
        return u.hostname !== location.hostname ? u.hostname : null;
      } catch (err) { console.error('[getVisitorStats]', err); return null; }
    })();
    // 외부 유입 감지 시 당일 소스 갱신 (last-touch 모델 — 채널 효과 측정 목적)
    const origSrcKey = `cottage_orig_src_${kstDate}`;
    if (referrer) localStorage.setItem(origSrcKey, referrer);
    // 유효 소스: 현재 외부 > 당일 마지막 외부 유입 > 'direct'
    const effectiveSource = referrer || localStorage.getItem(origSrcKey) || 'direct';
    const visitedSourceKey = `cottage_pv_${kstDate}_${effectiveSource}_${page}`;
    if (!localStorage.getItem(visitedSourceKey)) {
      localStorage.setItem(visitedSourceKey, "1");
      // 하루 첫 방문: 방문자 카운트용 마커 삽입 (getVisitorStats는 이것만 카운트)
      if (!localStorage.getItem(visitedKey)) {
        localStorage.setItem(visitedKey, "1");
        trackPageView('__visitor__', effectiveSource === 'direct' ? null : effectiveSource, {
          is_bot: _isBotUA(),
          user_id: _currentVisitorUserId(),
          session_key: getSessionKey(),
        });
      }
      trackPageView(page, effectiveSource === 'direct' ? null : effectiveSource);
    }
    // 비로그인 방문자 추적 — cottage-auth-changed로 로그인 확인 후 결정
    // kakao-auth.js가 로그인 처리 시 startSession → _stopAnonHeartbeat 호출
    // 이벤트가 없으면 (비로그인) anon heartbeat 유지
    window.addEventListener('cottage-auth-changed', function(e) {
      if (!e.detail?.user) _startAnonHeartbeat(); // 비로그인 확정
    }, { once: true });
    // 이벤트가 500ms 내 오지 않으면 비로그인으로 간주 (kakao-auth.js 미로드 페이지 등)
    setTimeout(() => { if (!_sessionUserId) _startAnonHeartbeat(); }, 500);
  });

  // ── 밴 상태 ──────────────────────────────────────────────
  let _isBanned = false;
  function isUserBanned() { return _isBanned; }

  // ── 체류 시간 누적 ──────────────────────────────────────
  let _sessionStart = Date.now();
  let _sessionUserId = null;
  // 페이지 최초 진입 시점의 referrer 캡처 (이후 navigate하면 URL이 바뀌므로 여기서만 읽음)
  const _sessionReferrer = (() => {
    if (typeof location === 'undefined') return null;
    const utm = new URLSearchParams(location.search).get('utm_source');
    if (utm) return utm;
    if (typeof document !== 'undefined' && document.referrer) {
      try {
        const u = new URL(document.referrer);
        if (u.hostname !== location.hostname) return u.hostname;
      } catch (err) { console.error('[isUserBanned]', err);}
    }
    // 내부 이동 시 당일 마지막 외부 유입 소스로 귀속
    const kstDate = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
    return localStorage.getItem(`cottage_orig_src_${kstDate}`) || null;
  })();
  // page_sessions.referrer에 들어갈 값의 **단일 규칙**(#28, 2026-07-21). script-nav.js의 PAGE
  // SESSION TRACKER도 같은 테이블에 쓰는데, 예전엔 자체 규칙으로 **referrer 페이지의 내부 라벨**
  // (`메인`·`/pages/info/guide.html`)을 넣었다 → 읽는 쪽 categorizeRef가 전부 null로 떨궈
  // 11,825행 중 8,382행이 「직접 방문」으로 접혔고 채널별 체류시간이 통째로 과소집계됐다.
  // #14(page 컬럼)와 똑같이 **두 쓰는 경로가 규칙 하나를 공유**하는 것으로 해결한다.
  // ⚠️ 전 페이지에서 supabase-client.js가 script-nav.js보다 먼저 로드된다(14개 전수 확인).
  window.COTTAGE_SESSION_REF = _sessionReferrer;

  // ── heartbeat: 1분 주기, 로그인+탭 활성 상태에서 이용시간 누적 반영 ──
  let _heartbeatTimer = null;
  function _ensureHeartbeat() {
    if (_heartbeatTimer) return;
    _heartbeatTimer = setInterval(async () => {
      if (!_sessionUserId || document.hidden) return;
      await _syncTimeToDBNow(_sessionUserId);
    }, 60 * 1000);
  }

  function _flushTime(userId) {
    if (!userId) return;
    // 🚨 여기가 중복 계상의 뿌리다(#24) — _cottageSess는 localStorage 공유라
    //    iframe이 자기 경과시간을 여기 더하면 최상위 프레임이 그걸 함께 전송한다.
    //    최상위 프레임만 누적하게 막으면 프레임 수와 무관하게 실시간 1배가 된다.
    if (_isEmbeddedFrame()) return;
    const elapsed = Math.floor((Date.now() - _sessionStart) / 1000);
    if (elapsed <= 0) return;
    const s = window._cottageSess.get(userId);
    s.timeSec = (s.timeSec || 0) + elapsed;
    window._cottageSess.set(userId, s);
    _sessionStart = Date.now();
    window._cottageSessionStart = _sessionStart;
  }

  function _popAccumulatedSecs(userId) {
    return window._cottageSess.get(userId).timeSec || 0;
  }

  // 당일 누적 시간을 즉시 DB에 반영 — visibilitychange/heartbeat에서 호출.
  // 🚨 page_sessions는 여기서 더 이상 안 쓴다(2026-08-18) — writer는 script-nav.js
  //    하나로 통일했다(PLAN_active_view_tracking.md 승인조건). 예전엔 이 함수도
  //    visibilitychange에서 page_sessions에 동시에 insert해서 한 방문이 2행 되는
  //    사고(발견 ⑧)가 있었다 — 이 함수는 이제 profiles.today_seconds/total_minutes
  //    누적만 책임진다.
  async function _syncTimeToDBNow(userId) {
    if (!userId) return;
    if (_shouldSkipSessionTracking()) return;
    _flushTime(userId); // 현재 세션 시간을 localStorage에 먼저 저장
    const secs = _popAccumulatedSecs(userId);
    if (secs <= 0) return;
    try {
      const todayStr = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10); // KST
      // 원자적 증가(마이그레이션 012). 예전엔 select → 계산 → update라 탭이 겹치면
      // 나중 write가 앞 증가분을 덮어 조용히 사라졌다(#22 — 동시성 2에서 33% 손실 실측).
      // ⚠️ 실패 시 timeSec을 **리셋하지 않고** 반환한다 → 누적분이 localStorage에 남아
      //    다음 heartbeat에서 다시 시도된다. 012 미적용 상태로 배포돼도 시간이 유실되지 않는다.
      const { data, error } = await db.rpc('increment_profile_counters', {
        p_user_id: String(userId), p_secs: secs, p_today: todayStr, p_bump_visit: false,
      });
      if (error) console.error('[_syncTimeToDBNow] increment_profile_counters', error);
      // 행 없음 = 프로필 미생성 → 기존과 동일하게 아무것도 하지 않는다(upsertProfile이 처리).
      if (!error && data && data.length) {
        const s = window._cottageSess.get(userId);
        s.timeSec = 0;
        window._cottageSess.set(userId, s);
      }
    } catch (err) { console.error('[_syncTimeToDBNow]', err);}
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      // 탭 숨김 시 DB에 즉시 반영 (async이므로 페이지 살아있는 동안 완료)
      if (document.hidden && _sessionUserId) _syncTimeToDBNow(_sessionUserId);
      else { _sessionStart = Date.now(); window._cottageSessionStart = _sessionStart; }
    });
    window.addEventListener('beforeunload', () => {
      // 페이지 종료 시 best-effort 반영 (완료 보장 불가, localStorage가 백업)
      if (_sessionUserId) _flushTime(_sessionUserId);
    });
    window.addEventListener('pagehide', () => {
      // 모바일에서 beforeunload 미발화 시 보완
      if (_sessionUserId) _flushTime(_sessionUserId);
    });
  }

  function startSession(userId) {
    if (_sessionUserId !== userId) {
      const s = window._cottageSess.get(userId); // 첫 호출 시 레거시 키 자동 마이그레이션
      if (s.lastVisitDate) s.prevVisitDate = s.lastVisitDate;
      if (s.lastSeenDt)    s.prevSeenDt    = s.lastSeenDt;
      s.lastVisitDate = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
      s.lastSeenDt    = new Date().toISOString();
      window._cottageSess.set(userId, s);
      _stopAnonHeartbeat();
    }
    if (_sessionUserId) _flushTime(_sessionUserId);
    _sessionUserId = userId;
    _sessionStart = Date.now();
    window._cottageSessionStart = _sessionStart;
    _ensureHeartbeat();
  }

  // ── 비로그인 방문자 heartbeat (anon_sessions 테이블) ──────────────
  let _anonHeartbeatTimer = null;

  function _stopAnonHeartbeat() {
    if (_anonHeartbeatTimer) { clearInterval(_anonHeartbeatTimer); _anonHeartbeatTimer = null; }
  }

  async function _startAnonHeartbeat() {
    if (_anonHeartbeatTimer || _sessionUserId) return;
    if (_shouldSkipSessionTracking()) return;
    const key = getSessionKey();
    let todayKst = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
    let _anonTodaySec = 0;
    try {
      const { data: existing, error } = await db.from('anon_sessions')
        .select('visit_count, today_date, today_seconds')
        .eq('session_key', key).maybeSingle();
      if (error) console.error('[_startAnonHeartbeat]', error);
      if (!existing) {
        const { error: insErr } = await db.from('anon_sessions').insert({
          session_key: key, last_seen_at: new Date().toISOString(),
          first_seen_at: new Date().toISOString(),
          visit_count: 1, today_seconds: 0, today_date: todayKst
        });
        if (insErr) console.error('[_startAnonHeartbeat] insert', insErr);
      } else {
        const isNewDay = existing.today_date !== todayKst;
        _anonTodaySec = isNewDay ? 0 : (existing.today_seconds || 0);
        const { error: updErr } = await db.from('anon_sessions').update({
          last_seen_at: new Date().toISOString(),
          visit_count: (existing.visit_count || 0) + (isNewDay ? 1 : 0),
          today_seconds: _anonTodaySec, today_date: todayKst
        }).eq('session_key', key);
        if (updErr) console.error('[_startAnonHeartbeat] update', updErr);
      }
    } catch (err) { console.error('[_startAnonHeartbeat]', err);}
    // 비로그인 방문자도 page_sessions에 기록 (명 집계용); 실패해도 anon_sessions 영향 없음
    try {
      // 슬러그 규칙은 page-labels.js가 SSOT — 트래커(script-nav.js)와 같은 값을 넣어야 한다(#14)
      const page = window.COTTAGE_PAGE_SLUG
        ? window.COTTAGE_PAGE_SLUG(window.location?.pathname)
        : (window.location?.pathname?.split('/').filter(Boolean).pop()?.replace('.html', '') || 'index');
      db.from('page_sessions').insert({
        page, user_id: null, session_key: key,
        duration_sec: 0, entered_at: new Date().toISOString(), referrer: _sessionReferrer
      }).then(({ error }) => { if (error) console.error('[_startAnonHeartbeat] page_sessions', error); }).catch(() => {});
    } catch (err) { console.error('[_startAnonHeartbeat]', err);}
    _anonHeartbeatTimer = setInterval(() => {
      if (_sessionUserId) { _stopAnonHeartbeat(); return; }
      if (document.hidden) return;
      // 자정(KST) 롤오버: 세션이 안 닫힌 채 날이 바뀌면 새 날의 체류가 전날로 적립되던 버그(④).
      // today_date를 안 갱신하던 것이 원인 — 날이 바뀌면 카운터를 0으로 리셋하고 날짜도 넘긴다.
      const nowKst = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
      if (nowKst !== todayKst) { todayKst = nowKst; _anonTodaySec = 0; }
      _anonTodaySec += 60;
      db.from('anon_sessions').update({
        last_seen_at: new Date().toISOString(), today_seconds: _anonTodaySec, today_date: todayKst
      }).eq('session_key', key).then(({ error }) => { if (error) console.error('[_startAnonHeartbeat] heartbeat', error); }).catch(() => {});
    }, 60 * 1000);
  }

  async function upsertProfile(userId, nickname, realName, explicitVisitCount) {
    startSession(userId);
    try {
      const skipAnalyticsForUser = _shouldSkipAnalytics() && String(userId) === _ADMIN_USER_ID;
      const accumulated = skipAnalyticsForUser ? 0 : _popAccumulatedSecs(userId);
      const { data, error: selectError } = await db.from('profiles').select('visit_count, total_minutes, today_seconds, today_date, real_name, is_banned, nickname, photo_url').eq('user_id', userId).maybeSingle();
      _isBanned = !!data?.is_banned;
      // DB에 이미 커스텀 닉네임이 있고 새로 들어온 값이 Kakao 기본명과 같으면 기존 보호
      // realName이 null/empty일 때 DB의 real_name으로 fallback
      const effectiveRealName = realName || data?.real_name || null;
      const nickToSave = (data?.nickname && effectiveRealName && data.nickname !== effectiveRealName && nickname === effectiveRealName)
        ? data.nickname
        : nickname;
      const isNewUser = !selectError && !data;
      // 숫자 카운터(total_minutes/today_seconds/visit_count)는 여기서 쓰지 않는다 —
      // 아래 원자적 증가 RPC가 담당한다(012, #22). upsert에 계산값을 실으면
      // select → 계산 → write가 되어 탭이 겹칠 때 증가분이 사라진다.
      const { error: upsertError } = await db.from('profiles').upsert({
        user_id: userId,
        nickname: nickToSave,
        real_name: data?.real_name || realName || null,
        last_seen_at: new Date().toISOString(),
        ...(data?.photo_url ? { photo_url: data.photo_url } : {}),
        ...(isNewUser ? { first_source: _sessionReferrer || null } : {}),
      }, { onConflict: 'user_id' });
      if (upsertError) console.error('[upsertProfile]', upsertError);
      if (!upsertError && isNewUser) trackEvent('signup_complete');

      // 일일 방문 +1의 dedup은 kakao-auth.js의 sess.lastVisitDate !== kstDate 조건이 담당한다.
      // explicitVisitCount는 이제 **플래그로만** 쓴다(undefined면 방문을 올리지 않음) —
      // 실제 값은 DB에서 원자적으로 +1 되므로 localStorage fallback이 필요 없어졌다.
      // 신규 유저도 위 upsert가 행을 먼저 만들었으므로 coalesce(...,0)+n으로 올바르게 시작한다.
      // iframe에서도 initKakaoAuth가 돌아 여기까지 온다 — 프로필(닉네임·사진)은 갱신해도 되지만
      // 방문수·체류시간은 세션 개념이라 최상위 프레임만 올린다(#24).
      const skipSession = skipAnalyticsForUser || _isEmbeddedFrame();
      const bumpVisit = explicitVisitCount !== undefined && !skipSession;
      if (!upsertError && !skipSession && (accumulated > 0 || bumpVisit)) {
        const todayStr = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10); // KST
        const { data: bumped, error: bumpError } = await db.rpc('increment_profile_counters', {
          p_user_id: String(userId), p_secs: accumulated, p_today: todayStr, p_bump_visit: bumpVisit,
        });
        if (bumpError) console.error('[upsertProfile] increment_profile_counters', bumpError);
        // 성공했을 때만 로컬 누적을 비운다 — 실패 시 남겨두면 다음 호출에서 재시도된다.
        if (!bumpError && bumped && bumped.length) {
          const s = window._cottageSess.get(userId);
          s.timeSec = 0;
          window._cottageSess.set(userId, s);
          if (bumpVisit) window.checkAchievements?.('visit', userId, { visitCount: bumped[0].visit_count });
        }
      }
    } catch (err) { console.error('[upsertProfile]', err);}
  }

  async function updateProfilePhoto(userId, photoUrl) {
    if (!userId) return;
    try {
      const { error } = await db.from('profiles')
        .update({ photo_url: photoUrl || null })
        .eq('user_id', userId);
      if (error) console.warn('[updateProfilePhoto] DB error:', error.message);
    } catch (e) { console.warn('[updateProfilePhoto] 예외:', e); }
  }

  async function getProfilePhoto(userId) {
    if (!userId) return null;
    try {
      const { data, error } = await db.from('profiles').select('photo_url').eq('user_id', userId).maybeSingle();
      if (error) console.error('[getProfilePhoto]', error);
      return data?.photo_url || null;
    } catch (err) { console.error('[getProfilePhoto]', err); return null; }
  }

  async function getProfileSnapshot(userId) {
    if (!userId) return null;
    try {
      const { data, error } = await db.from('profiles').select('photo_url,nickname').eq('user_id', userId).maybeSingle();
      if (error) console.error('[getProfileSnapshot]', error);
      return data || null;
    } catch (err) { console.error('[getProfileSnapshot]', err); return null; }
  }

  async function getAllProfiles() {
    try {
      const { data, error } = await db.from('profiles').select('*').order('last_seen_at', { ascending: false });
      if (error) console.error('[getAllProfiles]', error);
      return data || [];
    } catch (err) { console.error('[getAllProfiles]', err); return []; }
  }

  // P4: 한 회원의 이용 요약(누적) — 보드 오너 섹션의 「이용 요약」용. 누적 체류·방문수는
  // R3대로 profiles가 정본이다(page_sessions는 하한). getAllProfiles(*, 전원)를 안 부른다.
  async function getProfileUsage(userId) {
    if (!userId) return null;
    try {
      const { data, error } = await db.from('profiles')
        .select('visit_count, total_minutes, today_seconds, today_date, last_seen_at, first_seen_at')
        .eq('user_id', String(userId)).maybeSingle();
      if (error) console.error('[getProfileUsage]', error);
      return data || null;
    } catch (err) { console.error('[getProfileUsage]', err); return null; }
  }

  async function banUser(userId) {
    try {
      const { error } = await db.from('profiles').update({ is_banned: true }).eq('user_id', userId);
      return error ? { error } : { success: true };
    } catch (e) { return { error: e }; }
  }

  async function unbanUser(userId) {
    try {
      const { error } = await db.from('profiles').update({ is_banned: false }).eq('user_id', userId);
      return error ? { error } : { success: true };
    } catch (e) { return { error: e }; }
  }

  // 사진 삭제는 여기가 아니다 — game-reviews.js의 `.pr-rec-photo-del` 핸들러가
  // parsePhotoUrls로 남은 URL을 다시 조립해 updateGamePlay로 넘긴다(= 개별 삭제).
  // photo_url을 통째로 null로 미는 deletePlayPhoto가 여기 있었으나 호출부 0건이었고,
  // 이름만 보고 부르면 그 기록의 사진이 전부 날아가는 함정이라 제거했다(2026-07-21).

  async function getPageAnalytics() {
    try {
      const since = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
      const { data, error } = await db.from('page_sessions')
        .select('page, referrer, user_id, session_key, duration_sec, entered_at')
        .gte('entered_at', since)
        .order('entered_at', { ascending: false })
        .limit(20000);
      if (error) console.error('[getPageAnalytics]', error);
      return data || [];
    } catch (err) { console.error('[getPageAnalytics]', err); return []; }
  }

  // user_id/session_key도 함께 반환한다 — 관리자 분석이 "몇 건"뿐 아니라 "몇 명"을
  // 세기 위함(한 사람이 여러 번 누르므로 건수만으론 과대평가된다. 실측: 홈 모임
  // 날짜칩 443회 = 38명). 사람 식별은 `user_id || session_key` 순.
  // ⚠️ session_key는 2026-07부터 100% 채워지고 그 이전(06월)은 8%뿐이라, 오래된
  //    구간의 "명" 집계는 과소집계된다. 건수는 영향 없음.
  async function getEventCounts(eventTypes, daysBack = 7) {
    try {
      const since = new Date(Date.now() - daysBack * 24 * 3600 * 1000).toISOString();
      const { data, error } = await db.from('page_events')
        .select('event_type, created_at, user_id, session_key')
        .in('event_type', eventTypes)
        .gte('created_at', since);
      if (error) console.error('[getEventCounts]', error);
      return data || [];
    } catch (err) { console.error('[getEventCounts]', err); return []; }
  }

  // 관리자 이벤트 퍼널 "메인 방문" 단계용 — page_events가 아니라 page_views(페이지 진입 로그) 기준
  async function getPageViewCounts(page, daysBack = 7) {
    try {
      const since = new Date(Date.now() - daysBack * 24 * 3600 * 1000).toISOString();
      const { data, error } = await db.from('page_views')
        .select('created_at')
        .eq('page', page)
        .gte('created_at', since);
      if (error) console.error('[getPageViewCounts]', error);
      return data || [];
    } catch (err) { console.error('[getPageViewCounts]', err); return []; }
  }

  // ── P4: 한 회원의 세션·이벤트 (관리자 보드 오너 섹션 전용, 읽기 전용) ──────
  // getPageAnalytics/getEventCounts는 전원치(수만 행)를 받아온다 — 보드는 한 사람만
  // 필요하므로 user_id로 걸러 가볍게 받는다. ⚠️ page는 **정규화 전 원문**이라 소비처가
  // MemberAnalytics.normalizePageKey로 접어야 관리자 페이지와 같은 버킷이 된다(#14).
  async function getUserPageSessions(userId, daysBack = 90) {
    try {
      const since = new Date(Date.now() - daysBack * 24 * 3600 * 1000).toISOString();
      const { data, error } = await db.from('page_sessions')
        .select('page, referrer, user_id, session_key, duration_sec, entered_at')
        .eq('user_id', String(userId))
        .gte('entered_at', since)
        .order('entered_at', { ascending: false })
        .limit(20000);
      if (error) console.error('[getUserPageSessions]', error);
      return data || [];
    } catch (err) { console.error('[getUserPageSessions]', err); return []; }
  }

  async function getUserEvents(userId, daysBack = 90) {
    try {
      const since = new Date(Date.now() - daysBack * 24 * 3600 * 1000).toISOString();
      const { data, error } = await db.from('page_events')
        .select('event_type, created_at, user_id, session_key')
        .eq('user_id', String(userId))
        .gte('created_at', since);
      if (error) console.error('[getUserEvents]', error);
      return data || [];
    } catch (err) { console.error('[getUserEvents]', err); return []; }
  }

  async function checkNicknameAvailable(nickname, currentUserId) {
    try {
      const { data, error } = await db.from('profiles')
        .select('user_id')
        .eq('nickname', nickname)
        .neq('user_id', String(currentUserId))
        .limit(1);
      if (error) console.error('[checkNicknameAvailable]', error);
      return !data?.length;
    } catch (err) { console.error('[checkNicknameAvailable]', err); return true; }
  }

  async function getMyStats(userId, nickname) {
    try {
      const queries = [
        db.from('game_play_records').select('id, game_id, user_id, nickname, played_at, created_at, group_name, photo_url, review_text, player_count, player_names, play_time_min, score_note').eq('user_id', userId).order('created_at', { ascending: false }),
        db.from('game_comments').select('id, game_key, comment_text, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
        db.from('suggestions').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        db.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
        db.from('game_reviews').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      ];
      if (nickname) {
        queries.push(
          db.from('game_play_records')
            .select('id, game_id, played_at, created_at, group_name')
            .ilike('player_names', `%${_escapeLike(nickname)}%`)
            .neq('user_id', userId)
            .order('created_at', { ascending: false })
        );
      }
      const [playRes, commentRes, suggestRes, profile, reviewRes, taggedRes] = await Promise.all(queries);
      // Promise.all + 비구조분해 결과라 2단계 codemod가 지나친 자리 — 쿼리 오류가 조용히 빈 값이 됨
      if (playRes.error) console.error('[getMyStats:game_play_records]', playRes.error);
      if (commentRes.error) console.error('[getMyStats:game_comments]', commentRes.error);
      if (suggestRes.error) console.error('[getMyStats:suggestions]', suggestRes.error);
      if (profile.error) console.error('[getMyStats:profiles]', profile.error);
      if (reviewRes.error) console.error('[getMyStats:game_reviews]', reviewRes.error);
      if (taggedRes?.error) console.error('[getMyStats:game_play_records tagged]', taggedRes.error);
      const ownPlays = playRes.data || [];
      const taggedPlays = taggedRes?.data || [];
      // 중복 제거 후 합치기 (내 기록 우선)
      const seenIds = new Set(ownPlays.map(r => r.id));
      const merged = [...ownPlays, ...taggedPlays.filter(r => !seenIds.has(r.id))];
      merged.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      // group_name이 비어 있어도(그룹명 미입력) 날짜로는 묶는다 — getMyNotifications의
      // 태그묶음(tagGroups, `${group_name||''}|${date}`)과 같은 방식. group_name 있을 때만
      // 세던 옛 코드는 전체 기록의 14%(group_name null)를 통째로 못 셌다(2026-08-09 실측,
      // 회원 「덕 지」 08-03 기록 2건이 여기 걸려 모임참여 3회가 2회로 보였음).
      const moimSessions = new Set();
      for (const r of merged) {
        const d = r.played_at || (r.created_at || '').slice(0, 10);
        if (!r.group_name && !d) continue; // 세션 식별 불가(game-sheet.js 731번 줄과 같은 기준)
        moimSessions.add(`${r.group_name || ''}_${d}`);
      }
      return {
        plays: merged,
        comments: commentRes.data || [],
        suggestions: suggestRes.count || 0,
        moimCount: moimSessions.size,
        profile: profile.data || null,
        reviewCount: reviewRes?.count || 0,
      };
    } catch (err) { console.error('[getMyStats]', err); return { plays: [], comments: [], suggestions: 0, moimCount: 0, profile: null, reviewCount: 0 }; }
  }


  async function getMyNotifications(userId, nickname, notifSeenAt, newGameSeenAt) {
    if (!userId) return [];
    try {
      // new_intro/new_member는 "읽은 뒤에도 누가 왔었는지 유지"가 의도(2026-07-31)인데,
      // 날짜 제한 없이 limit(20)만 걸려 있어 회원이 늘수록 한 문장에 이름이 끝없이
      // 쌓였다(2026-08-02 사용자 지적 — "춘팝,이파리...등등" 실제 관찰). 교환권 알림에
      // 이미 쓰던 30일 창을 여기도 공유해 상한을 만든다.
      const _NOTIF_RECENT_SINCE = new Date(Date.now() - 30 * 86400000).toISOString();
      const taggedPromise = nickname
        ? db.from('game_play_records')
            .select('id, game_id, group_name, played_at, created_at, player_names')
            .ilike('player_names', `%${_escapeLike(nickname)}%`)
            .neq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20)
        : Promise.resolve({ data: [] });
      const curiousPromise = db.from('game_curious')
        .select('game_id')
        .eq('user_id', userId);
      const purchasedPromise = db.from('game_requests')
        .select('id, game_name, purchased_at')
        .eq('user_id', userId)
        .eq('status', 'done')
        .not('purchased_at', 'is', null)
        .order('purchased_at', { ascending: false })
        .limit(10);
      const snackDonePromise = db.from('snack_requests')
        .select('id, item_name, done_at')
        .eq('user_id', userId)
        .eq('is_done', true)
        .not('done_at', 'is', null)
        .order('done_at', { ascending: false })
        .limit(10);
      const oneMinAgo = new Date(Date.now() - 60000).toISOString();
      const newGamePromise = db.from('game_requests')
        .select('id, game_name, added_at, actual_games')
        .not('added_at', 'is', null)
        .lt('added_at', oneMinAgo)
        .order('added_at', { ascending: false })
        .limit(10);
      // 동호회 소개글: 타인 최근 소개글 (로그인 회원 전체 수신)
      const introListPromise = db.from('member_intros')
        .select('id, user_id, nickname, created_at')
        .neq('user_id', userId)
        .not('user_id', 'is', null)
        .gte('created_at', _NOTIF_RECENT_SINCE)
        .order('created_at', { ascending: false })
        .limit(20);
      // 신규 회원가입: new_intro와 동일하게 로그인 회원 전체 수신(관리자 action 필요 없는 정보성 알림).
      // 새 테이블·컬럼 없이 이미 있는 signup_complete 이벤트(page_events)를 그대로 쓴다.
      const newMemberPromise = db.from('page_events')
        .select('id, user_id, created_at')
        .eq('event_type', 'signup_complete')
        .neq('user_id', userId)
        .not('user_id', 'is', null)
        .gte('created_at', _NOTIF_RECENT_SINCE)
        .order('created_at', { ascending: false })
        .limit(20);
      const profileSeenPromise = db.from('profiles').select('notif_seen_at, notif_read_keys').eq('user_id', userId).maybeSingle();
      const _ADMIN_ID = '4916417947';
      // 교환권 이벤트는 **관리자에게만** 뜨는 감시용 피드다(의도된 사양). 문제는 존재가 아니라 비중이었다:
      // 2026-07-20 실측에서 관리자 알림 35건 중 30건이 교환권이었는데, 그 30건 중 **26건이
      // 2026-06-24 하루치**이고 **13건이 `dev_test`**(개발 중 발급)였다. 실제 유입은 월 3~4건이라
      // **알림 설계 문제가 아니라 오래된 테스트 로그가 limit 창을 점유한 것**이다.
      //   → ①개발용 발급 제외 ②최근 30일로 제한. **voucher_log 행은 건드리지 않는다** —
      //      잔액·이력의 원장이고, 데이터 삭제는 표시 문제의 해법이 아니다.
      const _VOUCHER_NOTIF_SINCE = new Date(Date.now() - 30 * 86400000).toISOString();
      const voucherEventsPromise = String(userId) === _ADMIN_ID
        ? db.from('voucher_log').select('id, user_id, delta, reason, created_at')
            .neq('reason', 'dev_test')
            .gte('created_at', _VOUCHER_NOTIF_SINCE)
            .order('created_at', { ascending: false }).limit(30)
        : Promise.resolve({ data: [] });
      // 간식·음료 요청 — 관리자에게만, voucher와 같은 30일 창 + 날짜 묶음(새 항목만: 기존 항목
      // 재요청은 request_count UPDATE라 created_at이 안 바뀌어 여기 안 잡힘 = 의도된 동작).
      const snackRequestPromise = String(userId) === _ADMIN_ID
        ? db.from('snack_requests').select('id, item_name, created_at')
            .gte('created_at', _VOUCHER_NOTIF_SINCE)
            .order('created_at', { ascending: false }).limit(30)
        : Promise.resolve({ data: [] });
      // 업적 달성은 지금까지 showAchievementToast(일회성 토스트)만 있고 알림판엔 안 남았다.
      // user_achievements.earned_at 그대로 써서 tagged/new_game과 같은 패턴으로 추가한다.
      const achievementPromise = db.from('user_achievements')
        .select('achievement_id, earned_at')
        .eq('user_id', userId)
        .order('earned_at', { ascending: false })
        .limit(20);
      const [taggedRes, curiousRes, purchasedRes, snackDoneRes, newGameRes, introListRes, newMemberRes, profileSeenRes, voucherEventsRes, snackRequestRes, achievementRes] = await Promise.all([
        taggedPromise, curiousPromise, purchasedPromise, snackDonePromise, newGamePromise, introListPromise, newMemberPromise, profileSeenPromise, voucherEventsPromise, snackRequestPromise, achievementPromise
      ]);
      // Promise.all + 비구조분해 결과라 2단계 codemod가 지나친 자리 — 쿼리 오류가 조용히 빈 값이 됨
      // (taggedRes·voucherEventsRes·snackRequestRes는 조건부 Promise.resolve라 .error 없음 = 정상 falsy)
      if (taggedRes.error) console.error('[getMyNotifications:game_play_records tagged]', taggedRes.error);
      if (curiousRes.error) console.error('[getMyNotifications:game_curious]', curiousRes.error);
      if (purchasedRes.error) console.error('[getMyNotifications:game_requests purchased]', purchasedRes.error);
      if (snackDoneRes.error) console.error('[getMyNotifications:snack_requests done]', snackDoneRes.error);
      if (newGameRes.error) console.error('[getMyNotifications:game_requests new]', newGameRes.error);
      if (introListRes.error) console.error('[getMyNotifications:member_intros]', introListRes.error);
      if (newMemberRes.error) console.error('[getMyNotifications:page_events signup_complete]', newMemberRes.error);
      if (profileSeenRes.error) console.error('[getMyNotifications:profiles]', profileSeenRes.error);
      if (voucherEventsRes.error) console.error('[getMyNotifications:voucher_log]', voucherEventsRes.error);
      if (snackRequestRes.error) console.error('[getMyNotifications:snack_requests]', snackRequestRes.error);
      if (achievementRes.error) console.error('[getMyNotifications:user_achievements]', achievementRes.error);
      const dbSeenAt = profileSeenRes?.data?.notif_seen_at || null;
      const effectiveSeenAt = [notifSeenAt, dbSeenAt].filter(Boolean).sort().pop() || null;
      const effectiveNewGameSeenAt = [newGameSeenAt, dbSeenAt].filter(Boolean).sort().pop() || null;
      // 개별 읽음 키 — `${type}:${소스행 id}`. notif_seen_at(지평선)이 못 표현하는
      // "이것만 읽음"을 담는다. 지평선을 새로 그으면(모두 읽기) 전부 무의미해지므로
      // updateNotifSeenAt이 이 배열을 비운다 → 무한 증가 없음.
      const _rawReadKeys = profileSeenRes?.data?.notif_read_keys;
      const readKeys = new Set(Array.isArray(_rawReadKeys) ? _rawReadKeys : []);
      const notifs = [];
      if (nickname) {
        // 태그 알림은 **모임(그룹명+날짜) 단위로 묶는다** — `new_intro`·`voucher_*`와 같은 방식.
        // 한 모임에서 게임 여러 개를 한 번에 기록하므로 1:1로 넣으면 그 모임 하나가 목록을
        // 통째로 차지한다(2026-07-21 실측: 김기성 14줄 → 모임 3개, 설애 15줄 → 6개).
        // ⚠️ 게임별로 묶으면 안 접힌다 — 같은 실측에서 16건 중 게임이 11종이었다(거의 전부 다른 게임).
        const tagGroups = new Map();
        for (const r of taggedRes.data || []) {
          const names = (r.player_names || '').split(',').map(n => n.trim());
          if (!names.some(n => n.toLowerCase() === nickname.toLowerCase())) continue;
          const date = r.played_at || r.created_at.slice(0, 10);
          const gk = `${r.group_name || ''}|${date}`;
          if (!tagGroups.has(gk)) tagGroups.set(gk, { groupName: r.group_name, date, rows: [] });
          tagGroups.get(gk).rows.push(r);
        }
        for (const g of tagGroups.values()) {
          // taggedRes가 created_at 내림차순이라 rows[0]이 그 모임의 최신 기록이다.
          const keys = g.rows.map(r => `tagged:${r.id}`);
          const isNew = g.rows.some(r =>
            (effectiveSeenAt ? r.created_at > effectiveSeenAt : true) && !readKeys.has(`tagged:${r.id}`));
          notifs.push({
            type: 'tagged',
            key: keys[0],
            keys,
            count: g.rows.length,
            gameId: g.rows[0].game_id,
            // 한 모임에서 같은 게임을 여러 판 하면 행이 여러 개다 → 칩은 게임 단위로 중복 제거.
            // count는 그대로 **기록 수**다(둘이 다를 수 있음 — voucher 묶음의 names/count와 같은 관계).
            gameIds: [...new Set(g.rows.map(r => r.game_id))],
            groupName: g.groupName,
            date: g.date,
            isNew,
          });
        }
      }
      const curiousKeys = (curiousRes.data || []).map(r => r.game_id);
      if (curiousKeys.length > 0) {
        const [{ data: recentComments, error: rcErr }, { data: playRecords, error: prErr }] = await Promise.all([
          db.from('game_comments')
            .select('id, game_key, nickname, created_at')
            .in('game_key', curiousKeys)
            .neq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20),
          db.from('game_play_records')
            .select('id, game_id, created_at')
            .in('game_id', curiousKeys)
            .neq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20),
        ]);
        // Promise.all + 비구조분해 결과라 2단계 codemod가 지나친 자리 — 쿼리 오류가 조용히 빈 값이 됨
        if (rcErr) console.error('[getMyNotifications:game_comments curious]', rcErr);
        if (prErr) console.error('[getMyNotifications:game_play_records curious]', prErr);
        for (const c of recentComments || []) {
          const key = `curious_comment:${c.id}`;
          const isNew = (effectiveSeenAt ? c.created_at > effectiveSeenAt : true) && !readKeys.has(key);
          notifs.push({ type: 'curious_comment', key, gameKey: c.game_key, commenter: c.nickname, date: c.created_at, isNew });
        }
        const seenPlayGameIds = new Set();
        for (const r of playRecords || []) {
          if (seenPlayGameIds.has(r.game_id)) continue;
          seenPlayGameIds.add(r.game_id);
          const key = `curious_play:${r.id}`;
          const isNew = (effectiveSeenAt ? r.created_at > effectiveSeenAt : true) && !readKeys.has(key);
          notifs.push({ type: 'curious_play', key, gameId: r.game_id, date: r.created_at, isNew });
        }
      }
      for (const r of purchasedRes.data || []) {
        const key = `ordered:${r.id}`;
        const isNew = (effectiveSeenAt ? new Date(r.purchased_at) > new Date(effectiveSeenAt) : true) && !readKeys.has(key);
        notifs.push({ type: 'ordered', key, gameName: r.game_name, date: r.purchased_at, isNew });
      }
      for (const r of snackDoneRes.data || []) {
        const key = `snack_done:${r.id}`;
        const isNew = (effectiveSeenAt ? new Date(r.done_at) > new Date(effectiveSeenAt) : true) && !readKeys.has(key);
        notifs.push({ type: 'snack_done', key, itemName: r.item_name, date: r.done_at, isNew });
      }
      for (const r of newGameRes.data || []) {
        const key = `new_game:${r.id}`;
        const isNew = (effectiveNewGameSeenAt ? new Date(r.added_at) > new Date(effectiveNewGameSeenAt) : true) && !readKeys.has(key);
        const actualGames = Array.isArray(r.actual_games) && r.actual_games.length ? r.actual_games : null;
        notifs.push({ type: 'new_game', key, gameName: r.game_name, actualGames, date: r.added_at, isNew });
      }
      // 동호회 소개글 알림: 로그인 회원 전체, 새 소개글 N개 묶음
      {
        const allIntros = introListRes.data || [];
        // 묶음 알림이라 키가 N개 — 읽음 처리 시 구성원 전부를 한 번에 마킹해야 한다
        const newIntros = allIntros.filter(r =>
          (effectiveSeenAt ? r.created_at > effectiveSeenAt : true) && !readKeys.has(`new_intro:${r.id}`)
        );
        if (newIntros.length > 0) {
          notifs.push({
            type: 'new_intro',
            key: `new_intro:${newIntros[0].id}`,
            keys: newIntros.map(r => `new_intro:${r.id}`),
            count: newIntros.length,
            names: newIntros.map(r => r.nickname),
            firstUserId: newIntros[0].user_id,
            date: newIntros[0].created_at,
            isNew: true,
          });
        } else if (allIntros.length > 0) {
          // 최신 1건으로 접지 않고 전원 유지 — new_member와 같은 이유(2026-07-31,
          // 읽음 처리 후 재조회하면 나머지가 사라지는 게 실제로 불편했다).
          notifs.push({
            type: 'new_intro',
            key: `new_intro:${allIntros[0].id}`,
            keys: allIntros.map(r => `new_intro:${r.id}`),
            count: allIntros.length,
            names: allIntros.map(r => r.nickname),
            firstUserId: allIntros[0].user_id,
            date: allIntros[0].created_at,
            isNew: false,
          });
        }
      }
      // 신규 회원가입: new_intro와 동일한 묶음 알림 패턴. page_events엔 닉네임이 없어 profiles에서 별도 조회.
      {
        const allNewMembers = newMemberRes.data || [];
        if (allNewMembers.length > 0) {
          const memberIds = [...new Set(allNewMembers.map(r => r.user_id))];
          const { data: nickRows, error: nickErr } = await db.from('profiles')
            .select('user_id, nickname').in('user_id', memberIds);
          if (nickErr) console.error('[getMyNotifications:profiles new_member nicks]', nickErr);
          const nickMap = new Map((nickRows || []).map(r => [String(r.user_id), r.nickname]));
          const newOnes = allNewMembers.filter(r =>
            (effectiveSeenAt ? r.created_at > effectiveSeenAt : true) && !readKeys.has(`new_member:${r.id}`)
          );
          if (newOnes.length > 0) {
            notifs.push({
              type: 'new_member',
              key: `new_member:${newOnes[0].id}`,
              keys: newOnes.map(r => `new_member:${r.id}`),
              count: newOnes.length,
              names: newOnes.map(r => nickMap.get(String(r.user_id)) || '회원'),
              userIds: newOnes.map(r => r.user_id),
              date: newOnes[0].created_at,
              isNew: true,
            });
          } else {
            // 이미 읽은 뒤에도 "누가 왔었는지"는 유지한다 — 최신 1건으로 접으면 나머지는
            // 다시 볼 방법이 없다(2026-07-31 지적: "읽었더니 나머지 2명이 사라짐"). new_intro의
            // "최신 1건만 기록용" 접기와 같은 패턴이었으나 여기선 의도적으로 안 따른다.
            notifs.push({
              type: 'new_member',
              key: `new_member:${allNewMembers[0].id}`,
              keys: allNewMembers.map(r => `new_member:${r.id}`),
              count: allNewMembers.length,
              names: allNewMembers.map(r => nickMap.get(String(r.user_id)) || '회원'),
              userIds: allNewMembers.map(r => r.user_id),
              date: allNewMembers[0].created_at,
              isNew: false,
            });
          }
        }
      }
      {
        const achData = achievementRes.data || [];
        if (achData.length > 0) {
          const _kstDayAch = iso => new Date(new Date(iso).getTime() + 9 * 3600000).toISOString().slice(0, 10);
          const achGroups = new Map();
          for (const r of achData) {
            const gk = _kstDayAch(r.earned_at);
            if (!achGroups.has(gk)) achGroups.set(gk, []);
            achGroups.get(gk).push(r);
          }
          for (const rows of achGroups.values()) {
            const keys = rows.map(r => `achievement:${r.achievement_id}`);
            const isNew = rows.some(r =>
              (effectiveSeenAt ? r.earned_at > effectiveSeenAt : true) && !readKeys.has(`achievement:${r.achievement_id}`));
            notifs.push({
              type: 'achievement',
              key: keys[0],
              keys,
              count: rows.length,
              achievementIds: rows.map(r => r.achievement_id),
              date: rows[0].earned_at,
              isNew,
            });
          }
        }
      }
      if (String(userId) === _ADMIN_ID) {
        const snackData = snackRequestRes.data || [];
        if (snackData.length > 0) {
          const _kstDaySnack = iso => new Date(new Date(iso).getTime() + 9 * 3600000).toISOString().slice(0, 10);
          const snackGroups = new Map();
          for (const r of snackData) {
            const gk = _kstDaySnack(r.created_at);
            if (!snackGroups.has(gk)) snackGroups.set(gk, []);
            snackGroups.get(gk).push(r);
          }
          for (const rows of snackGroups.values()) {
            const keys = rows.map(r => `snack:${r.id}`);
            const isNew = rows.some(r =>
              (effectiveSeenAt ? r.created_at > effectiveSeenAt : true) && !readKeys.has(`snack:${r.id}`));
            notifs.push({
              type: 'snack_request',
              key: keys[0],
              keys,
              count: rows.length,
              names: rows.map(r => r.item_name),
              date: rows[0].created_at,
              isNew,
            });
          }
        }
        const voucherData = voucherEventsRes.data || [];
        if (voucherData.length > 0) {
          const userIds = [...new Set(voucherData.map(r => r.user_id))];
          const { data: profData, error: profErr } = await db.from('profiles').select('user_id, nickname').in('user_id', userIds);
          if (profErr) console.error('[getMyNotifications]', profErr);
          const nickMap = Object.fromEntries((profData || []).map(p => [p.user_id, p.nickname || p.user_id]));
          // 유형+날짜(KST)로 묶는다 — `new_intro`와 같은 묶음 알림 방식.
          // 개별로 넣으면 하루에 몰린 이벤트가 목록을 통째로 차지한다(2026-07-20 실측:
          // 06-24 하루에 교환 13건이 몰려 관리자 알림 8칸이 전부 교환권이었다).
          // 30일 제한만으로는 안 풀린다 — 그 하루가 창 안에 있으면 그대로 13줄이다.
          const _kstDay = iso => new Date(new Date(iso).getTime() + 9 * 3600000).toISOString().slice(0, 10);
          const groups = new Map();
          for (const r of voucherData) {
            const type = r.delta > 0 ? 'voucher_granted' : 'voucher_used';
            const gk = `${type}|${_kstDay(r.created_at)}`;
            if (!groups.has(gk)) groups.set(gk, { type, rows: [] });
            groups.get(gk).rows.push(r);
          }
          for (const g of groups.values()) {
            // 묶음 안에 안 읽은 게 하나라도 있으면 NEW — 읽음 처리는 keys 전부를 한 번에 마킹한다.
            const keys = g.rows.map(r => `voucher:${r.id}`);
            const isNew = g.rows.some(r =>
              (effectiveSeenAt ? r.created_at > effectiveSeenAt : true) && !readKeys.has(`voucher:${r.id}`));
            const names = [...new Set(g.rows.map(r => nickMap[r.user_id] || '사용자'))];
            notifs.push({
              type: g.type,
              key: keys[0],
              keys,
              count: g.rows.length,
              nickname: names[0],
              names,
              reason: g.rows[0].reason,
              delta: g.rows[0].delta,
              date: g.rows[0].created_at,
              isNew,
            });
          }
        }
      }
      notifs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      return notifs;
    } catch (err) { console.error('[getMyNotifications]', err); return []; }
  }

  window.CottageDB = {
    trackView,
    trackPageView,
    trackEvent,
    getGameRating,
    submitRating,
    getMyRating,
    getPopularGames,
    getAllGameRatings,
    uploadPlayPhoto,
    uploadOrganizerPhoto,
    getGameOverride,
    upsertGameOverride,
    recordGamePlay,
    deleteGamePlay,
    updateGamePlay,
    getGamePlayCount,
    getPlayHighlights,
    getVisitorStats,
    getPlayReviewsByGame,
    getGameComments,
    getRecordComments,
    insertComment,
    deleteComment,
    updateComment,
    getGamePlayRecords,
    getGroupNames,
    getPlayerNames,
    getAllPlayRecordsForHistory,
    getGameLikeCount,
    toggleGameLike,
    hasUserLiked,
    getGameCuriousCount,
    toggleGameCurious,
    hasUserCurious,
    getGameLikers,
    getGameCuriousUsers,
    startSession,
    upsertProfile,
    getAllProfiles,
    checkNicknameAvailable,
    getPageAnalytics,
    getEventCounts,
    getPageViewCounts,
    getUserPageSessions,
    getUserEvents,
    getProfileUsage,
    getMyStats,
    getMyNotifications,
    getGameReviews,
    insertGameReview,
    deleteGameReview,
    banUser,
    unbanUser,
    isUserBanned,
    updateProfilePhoto,
    getProfilePhoto,
    getProfileSnapshot,
    getAllPlayRecordsForHub,
    playRecordSortDate,
    getUserAchievements,
    grantAchievement,
    setRepAchievement,
    getUserPlayCount,
    getUserDistinctGameCount,
    getUserPlayedGames,
    getUserPhotoCount,
    getUserRatingCount,
    getUserCommentCount,
    getUserVisitCount,
    getUserParticipationCount,
    getUserFirstRecordCount,
    getRepAchievement,
    setRepTitle,
    grantFirstPlayVoucher,
    grantAchievementVoucher,
    getUserUniqueDayCount,
    grantDevVoucher,
    getVoucherBalance,
    getVoucherProducts,
    redeemVoucher,
    getVoucherHistory,
    getUserLikedGames,
    getUserCuriousGames,
    getUserLikedGamesAll,
    getUserCuriousGamesAll,
    addGamePref,
    removeGamePref,
    getCustomPrefSuggestions,
    updateUserBio,
    updateUserAvoidTags,
    getAllBioTagSuggestions,
    getAllAvoidTagSuggestions,
    getMeetingVotes,
    getPartySize,
    sumPartySize,
    sumWeeklyPartySize,
    upsertMeetingVote,
    deleteMeetingVote,
    updateNotifSeenAt,
    addNotifReadKeys,
    getNoticeAckKeys,
    normalizeMemberIntroTimes,
    formatMemberIntroTimes,
    getMeetingProfile,
    upsertMeetingIntro,
    submitMemberIntro,
    addMeetingGamePref,
    removeMeetingGamePref,
    getMeetingVoteGames,
    addMeetingVoteGame,
    removeMeetingVoteGame,
    setMeetingVoteGamePriority,
    setMeetingVoteGameCondition,
  };

  // notif_seen_at/notif_read_keys에 쓰는 두 함수는 select→merge→update라 원자적이지 않다.
  // 사용자가 알림 두 개를 빠르게 연달아 "읽음" 누르면 두 호출이 겹쳐 나중 쓰기가 먼저
  // 쓰기의 select 스냅샷을 덮어써 한쪽 읽음이 사라진다(실측: 동시 호출 시 유실 재현) —
  // "읽었는데 또 뜸"의 원인. 유저별 체인으로 직렬화해 같은 탭 안에서는 겹치지 않게 한다.
  const _notifWriteChains = new Map();
  function _queueNotifWrite(userId, fn) {
    const prev = _notifWriteChains.get(userId) || Promise.resolve();
    const next = prev.catch(() => {}).then(fn);
    _notifWriteChains.set(userId, next);
    return next;
  }

  async function updateNotifSeenAt(userId, timestamp) {
    if (!userId || !timestamp) return;
    return _queueNotifWrite(userId, async () => {
      try {
        // notif_read_keys를 대부분 비운다 — 지평선을 지금으로 옮기면 그 이전의 개별
        // 읽음 키는 전부 지평선에 흡수돼 중복이다. 이게 배열 크기의 상한선 역할.
        // 단 'notice:' 접두사(전체공지·교환권공지 확인)는 시간 지평선과 무관한 1회성
        // ack라 지평선 리셋에 휩쓸리면 안 된다 — 보존한다.
        const { data: cur, error: selError } = await db.from('profiles').select('notif_read_keys').eq('user_id', userId).maybeSingle();
        if (selError) console.error('[updateNotifSeenAt] select', selError);
        // select 실패 시 현재 값을 모르니 notif_read_keys를 건드리지 않는다 — 잘못 비우면
        // notice:* ack가 조용히 사라져 공지가 재노출된다(방금 고친 버그의 재발 경로가 되므로 방어).
        const _updatePayload = { notif_seen_at: timestamp };
        if (!selError) _updatePayload.notif_read_keys = (Array.isArray(cur?.notif_read_keys) ? cur.notif_read_keys : []).filter(k => k.startsWith('notice:'));
        const { error } = await db.from('profiles')
          .update(_updatePayload)
          .eq('user_id', userId);
        if (error) console.error('[updateNotifSeenAt]', error);
      } catch (err) { console.error('[updateNotifSeenAt]', err);}
    });
  }

  // 개별 알림 읽음 — 키 배열을 기존 notif_read_keys에 합집합으로 추가.
  // 묶음 알림(new_intro)은 구성원 키를 한 번에 넘긴다.
  async function addNotifReadKeys(userId, keys) {
    if (!userId || !Array.isArray(keys) || keys.length === 0) return { error: null };
    return _queueNotifWrite(userId, async () => {
      try {
        const { data, error: selectError } = await db.from('profiles')
          .select('notif_read_keys').eq('user_id', userId).maybeSingle();
        if (selectError) { console.error('[addNotifReadKeys] select', selectError); return { error: selectError }; }
        const existing = Array.isArray(data?.notif_read_keys) ? data.notif_read_keys : [];
        const merged = [...new Set([...existing, ...keys])];
        const { error } = await db.from('profiles')
          .update({ notif_read_keys: merged }).eq('user_id', userId);
        if (error) console.error('[addNotifReadKeys] update', error);
        return { error: error || null };
      } catch (err) { console.error('[addNotifReadKeys]', err); return { error: err }; }
    });
  }

  // 전체공지·교환권공지 확인(ack) 여부 — profiles.notif_read_keys를 'notice:' 접두사로 재사용.
  // feeNoticeSeen/voucherNoticeSeen이 localStorage(기기별)에만 있어 기기·브라우저를 바꾸면
  // 재노출되던 문제를 notif_seen_at과 같은 방식(DB 동기화)으로 해소한다.
  async function getNoticeAckKeys(userId) {
    if (!userId) return [];
    try {
      const { data, error } = await db.from('profiles').select('notif_read_keys').eq('user_id', userId).maybeSingle();
      if (error) { console.error('[getNoticeAckKeys]', error); return []; }
      return Array.isArray(data?.notif_read_keys) ? data.notif_read_keys : [];
    } catch (err) { console.error('[getNoticeAckKeys]', err); return []; }
  }

  // 기록의 정렬·표시 기준 날짜 — played_at이 없으면 작성일로 본다.
  // ⚠️ played_at NULL 기록이 실재한다(2026-07-21 실측 70행 중 8건). Postgres는 DESC 정렬에서
  //    NULL을 **맨 앞**에 두므로, 이 폴백 없이 DB 정렬만 믿으면 옛 기록이 목록 선두를 점유한다
  //    (홈 히어로가 6월 27일 기록을 최신으로 보여주던 원인).
  function playRecordSortDate(rec) {
    return rec?.played_at || (rec?.created_at || '').slice(0, 10);
  }

  // 플레이기록 허브용 — 모든 기록 조회 (200건, played_at/created_at 정렬)
  async function getAllPlayRecordsForHub(limit = 200) {
    try {
      const { data, error } = await db.from('game_play_records')
        .select('id, game_id, user_id, nickname, player_count, player_names, play_time_min, score_note, group_name, played_at, photo_url, review_text, created_at')
        // nullsFirst:false — NULL이 선두를 먹으면 limit 절단이 엉뚱한 행을 남긴다
        .order('played_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) console.error('[getAllPlayRecordsForHub]', error);
      // DB는 두 컬럼을 각각 정렬할 뿐 COALESCE 정렬을 못 한다 → 폴백 기준으로 한 번 더 세운다.
      return (data || []).sort((a, b) => {
        const d = playRecordSortDate(b).localeCompare(playRecordSortDate(a));
        return d !== 0 ? d : String(b.created_at || '').localeCompare(String(a.created_at || ''));
      });
    } catch (err) { console.error('[getAllPlayRecordsForHub]', err); return []; }
  }

  async function getGameReviews(gameId) {
    try {
      const { data, error } = await db.from('game_reviews')
        .select('id, user_id, nickname, content, created_at')
        .eq('game_id', gameId)
        .order('created_at', { ascending: false });
      if (error) console.error('[getGameReviews]', error);
      return data || [];
    } catch (err) { console.error('[getGameReviews]', err); return []; }
  }

  async function insertGameReview(gameId, content, nickname, userId) {
    try {
      const { error } = await db.from('game_reviews').insert({
        game_id: gameId, content, nickname: nickname || null, user_id: userId || null,
      });
      return error ? { error } : { success: true };
    } catch (e) { return { error: e }; }
  }

  async function deleteGameReview(id) {
    try {
      const { error } = await db.from('game_reviews').delete().eq('id', id);
      return error ? { error } : { success: true };
    } catch (e) { return { error: e }; }
  }

  // ── 업적/캐릭터 ────────────────────────────────────────────

  async function getUserAchievements(userId) {
    try {
      const { data, error } = await db.from('user_achievements')
        .select('achievement_id, earned_at')
        .eq('user_id', userId)
        .order('earned_at', { ascending: true });
      if (error) console.error('[getUserAchievements]', error);
      return (data || []).map(r => ({ id: r.achievement_id, earned_at: r.earned_at }));
    } catch (err) { console.error('[getUserAchievements]', err); return []; }
  }

  async function grantAchievement(userId, achievementId) {
    try {
      const { error } = await db.from('user_achievements').insert({ user_id: userId, achievement_id: achievementId });
      if (error) {
        // 23505 = UNIQUE 위반(이미 달성 = 정상 중복)만 조용히, 그 외는 컬럼오타·RLS 등 진짜 실패라 로그
        if (error.code !== '23505') console.error('[grantAchievement]', error);
        return false;
      }
      return true;
    } catch (err) { console.error('[grantAchievement]', err); return false; }
  }

  async function setRepAchievement(userId, achievementId) {
    try {
      const { error } = await db.from('profiles').update({ rep_achievement_id: achievementId }).eq('user_id', userId);
      if (error) console.error('[setRepAchievement]', error);
      return !error;
    } catch (err) { console.error('[setRepAchievement]', err); return false; }
  }

  async function getUserPlayCount(userId) {
    try {
      const { count, error } = await db.from('game_play_records').select('id', { count: 'exact', head: true }).eq('user_id', userId);
      if (error) console.error('[getUserPlayCount]', error);
      return count || 0;
    } catch (err) { console.error('[getUserPlayCount]', err); return 0; }
  }

  async function getUserDistinctGameCount(userId) {
    try {
      const { data, error } = await db.from('game_play_records').select('game_id').eq('user_id', userId);
      if (error) console.error('[getUserDistinctGameCount]', error);
      return new Set((data || []).map(r => r.game_id)).size;
    } catch (err) { console.error('[getUserDistinctGameCount]', err); return 0; }
  }

  // 기록자(user_id)뿐 아니라 player_names에 참여자로만 적힌 사람도 "플레이한 게임"에 잡는다.
  // getUserUniqueDayCount/getUserParticipationCount와 같은 패턴 — 여긴 그동안 기록자만 봤다.
  async function getUserPlayedGames(userId, nickname) {
    try {
      const { data: authorRows, error } = await db.from('game_play_records')
        .select('game_id, played_at, created_at')
        .eq('user_id', userId);
      if (error) console.error('[getUserPlayedGames]', error);
      let participantRows = [];
      if (nickname) {
        const { data, error: pErr } = await db.from('game_play_records')
          .select('game_id, played_at, created_at')
          .ilike('player_names', `%${_escapeLike(nickname)}%`);
        if (pErr) console.error('[getUserPlayedGames]', pErr);
        participantRows = data || [];
      }
      const byGame = new Map();
      for (const r of [...(authorRows || []), ...participantRows]) {
        const existing = byGame.get(r.game_id);
        if (!existing || playRecordSortDate(r) > playRecordSortDate(existing)) byGame.set(r.game_id, r);
      }
      return [...byGame.values()].sort((a, b) => playRecordSortDate(b).localeCompare(playRecordSortDate(a)));
    } catch (err) { console.error('[getUserPlayedGames]', err); return []; }
  }

  async function getUserPhotoCount(userId) {
    try {
      const { data, error } = await db.from('game_play_records').select('photo_url').eq('user_id', userId).not('photo_url', 'is', null);
      if (error) console.error('[getUserPhotoCount]', error);
      return (data || []).reduce((s, r) => {
        if (!r.photo_url) return s;
        try {
          const parsed = JSON.parse(r.photo_url);
          return s + (Array.isArray(parsed) ? parsed.length : 1);
        } catch (_) {
          // 사진 1장은 JSON 배열이 아니라 단일 URL 문자열로 저장된다 → parse 실패가 정상 경로.
          // 여기에 로그를 달면 정상 데이터마다 가짜 에러가 찍힌다(로그 아님, 의도된 분기).
          return s + (r.photo_url.trim() ? 1 : 0);
        }
      }, 0);
    } catch (err) { console.error('[getUserPhotoCount]', err); return 0; }
  }

  async function getUserRatingCount(userId) {
    try {
      const { count, error } = await db.from('game_ratings').select('id', { count: 'exact', head: true }).eq('user_id', userId);
      if (error) console.error('[getUserRatingCount]', error);
      return count || 0;
    } catch (err) { console.error('[getUserRatingCount]', err); return 0; }
  }

  async function getUserCommentCount(userId) {
    try {
      const { count, error } = await db.from('game_comments').select('id', { count: 'exact', head: true }).eq('user_id', userId);
      if (error) console.error('[getUserCommentCount]', error);
      return count || 0;
    } catch (err) { console.error('[getUserCommentCount]', err); return 0; }
  }

  async function getUserVisitCount(userId) {
    try {
      const { data, error } = await db.from('profiles').select('visit_count').eq('user_id', userId).maybeSingle();
      if (error) console.error('[getUserVisitCount]', error);
      return data?.visit_count || 0;
    } catch (err) { console.error('[getUserVisitCount]', err); return 0; }
  }

  async function getUserParticipationCount(userId, nickname) {
    if (!nickname) return 0;
    try {
      // 내 닉네임이 player_names에 포함된 기록 수 (내가 쓴 기록 포함)
      const { count, error } = await db.from('game_play_records')
        .select('id', { count: 'exact', head: true })
        .ilike('player_names', `%${_escapeLike(nickname)}%`);
      if (error) console.error('[getUserParticipationCount]', error);
      return count || 0;
    } catch (err) { console.error('[getUserParticipationCount]', err); return 0; }
  }

  async function getUserFirstRecordCount(userId) {
    try {
      // 내가 작성한 기록들의 game_id를 가져옴
      const { data: myRecords, error: myErr } = await db.from('game_play_records')
        .select('game_id, created_at')
        .eq('user_id', String(userId));
      if (myErr) console.error('[getUserFirstRecordCount]', myErr);
      if (!myRecords || myRecords.length === 0) return 0;

      const myGameIds = [...new Set(myRecords.map(r => r.game_id))];

      // 해당 game_id들의 전체 기록 중 각 game_id별 가장 오래된 기록 조회
      const { data: allRecords, error: allErr } = await db.from('game_play_records')
        .select('game_id, user_id, created_at')
        .in('game_id', myGameIds)
        .order('created_at', { ascending: true })
        .limit(2000);
      if (allErr) console.error('[getUserFirstRecordCount]', allErr);

      if (!allRecords) return 0;

      // game_id별 최초 기록자 추출 (order ascending이므로 첫 번째가 최초)
      const firstByGame = {};
      for (const r of allRecords) {
        if (!firstByGame[r.game_id]) firstByGame[r.game_id] = r;
      }

      return Object.values(firstByGame)
        .filter(r => String(r.user_id) === String(userId))
        .length;
    } catch (err) { console.error('[getUserFirstRecordCount]', err); return 0; }
  }

  async function getRepAchievement(userId) {
    try {
      const { data, error } = await db.from('profiles').select('rep_achievement_id').eq('user_id', userId).maybeSingle();
      if (error) console.error('[getRepAchievement]', error);
      if (!data?.rep_achievement_id) return null;
      return { id: data.rep_achievement_id };
    } catch (err) { console.error('[getRepAchievement]', err); return null; }
  }

  async function setRepTitle(userId, titleId) {
    try {
      const { error } = await db.from('profiles').update({ rep_title_id: titleId || null }).eq('user_id', userId);
      if (error) console.error('[setRepTitle]', error);
      return !error;
    } catch (err) { console.error('[setRepTitle]', err); return false; }
  }

  // ── 음료교환권 ──────────────────────────────────────────────────────────

  // 업적 달성 교환권 지급 (record_1 제외 — grantFirstPlayVoucher 경로 사용)
  // [임시] player_names 텍스트 기반 보조 판정 포함. 닉네임 변경/동명이인/부분매칭 오탐 가능성 있음.
  async function grantAchievementVoucher(userId, achievementId) {
    const _OWNER_ID = '4916417947';
    if (!userId || String(userId) === _OWNER_ID) return false;
    try {
      const { data: existing, error: existErr } = await db.from('voucher_log')
        .select('id').eq('user_id', String(userId)).eq('reason', 'achievement').eq('note', achievementId).maybeSingle();
      if (existErr) console.error('[grantAchievementVoucher]', existErr);
      if (existing) return false; // JS 1차 방어
      const nickname = window.getKakaoUser?.()?.nickname || null;
      const { error } = await db.from('voucher_log')
        .insert({ user_id: String(userId), delta: 1, reason: 'achievement', note: achievementId, nickname });
      if (error) {
        // 23505 = partial unique 위반(중복 지급 방어 = 정상)만 조용히, 그 외는 진짜 실패라 로그
        if (error.code !== '23505') console.error('[grantAchievementVoucher]', error);
        return false;
      }
      return true;
    } catch (err) { console.error('[grantAchievementVoucher]', err); return false; }
  }

  // 함께한 날 카운팅 — 매장에 함께한 고유 날짜 수
  // 기준: played_at 우선, 없으면 created_at KST 변환
  // [임시] user_id 작성자 + player_names 닉네임 보조 병행 판정.
  //        닉네임 변경/동명이인/부분매칭 오탐 가능성 있음.
  //        장기적으로 game_play_participants 테이블 전환 예정.
  async function getUserUniqueDayCount(userId, nickname) {
    try {
      const toDateStr = r => {
        if (r.played_at) return r.played_at;
        const d = new Date(r.created_at);
        d.setHours(d.getHours() + 9);
        return d.toISOString().slice(0, 10);
      };
      const { data: authorRows, error: authorErr } = await db.from('game_play_records')
        .select('played_at, created_at').eq('user_id', userId);
      if (authorErr) console.error('[getUserUniqueDayCount]', authorErr);
      const dateSet = new Set((authorRows || []).map(toDateStr));
      if (nickname) {
        const { data: participantRows, error: participantErr } = await db.from('game_play_records')
          .select('played_at, created_at').ilike('player_names', `%${_escapeLike(nickname)}%`);
        if (participantErr) console.error('[getUserUniqueDayCount]', participantErr);
        (participantRows || []).forEach(r => dateSet.add(toDateStr(r)));
      }
      return dateSet.size;
    } catch (err) { console.error('[getUserUniqueDayCount]', err); return 0; }
  }

  async function grantFirstPlayVoucher(userId) {
    if (!userId) return false;
    try {
      const { data: existing, error: existErr } = await db.from('voucher_log')
        .select('id').eq('user_id', String(userId)).eq('reason', 'first_play').maybeSingle();
      if (existErr) console.error('[grantFirstPlayVoucher]', existErr);
      if (existing) return false; // JS 1차 방어
      const nickname = window.getKakaoUser?.()?.nickname || null;
      const { error } = await db.from('voucher_log')
        .insert({ user_id: String(userId), delta: 1, reason: 'first_play', nickname });
      if (error) {
        // 23505 = unique 위반(중복 지급 방어 = 정상)만 조용히, 그 외는 진짜 실패라 로그
        if (error.code !== '23505') console.error('[grantFirstPlayVoucher]', error);
        return false;
      }
      return true;
    } catch (err) { console.error('[grantFirstPlayVoucher]', err); return false; }
  }

  async function grantDevVoucher(userId) {
    try {
      const { error } = await db.from('voucher_log')
        .insert({ user_id: String(userId), delta: 1, reason: 'dev_test' });
      if (error) console.error('[grantDevVoucher]', error);
      return !error;
    } catch (err) { console.error('[grantDevVoucher]', err); return false; }
  }

  async function getVoucherBalance(userId) {
    try {
      const { data, error } = await db.from('voucher_log')
        .select('delta').eq('user_id', String(userId));
      if (error) console.error('[getVoucherBalance]', error);
      return (data || []).reduce((sum, r) => sum + r.delta, 0);
    } catch (err) { console.error('[getVoucherBalance]', err); return 0; }
  }

  async function getVoucherProducts() {
    try {
      const { data, error } = await db.from('voucher_products')
        .select('id, name, cost').eq('is_active', true).order('id');
      if (error) console.error('[getVoucherProducts]', error);
      return data || [];
    } catch (err) { console.error('[getVoucherProducts]', err); return []; }
  }

  async function redeemVoucher(userId, productId) {
    try {
      const { data: product, error: productErr } = await db.from('voucher_products')
        .select('cost, name').eq('id', productId).maybeSingle();
      if (productErr) console.error('[redeemVoucher]', productErr);
      if (!product) return { ok: false, reason: 'no_product' };
      const balance = await getVoucherBalance(userId);
      if (balance < product.cost) return { ok: false, reason: 'insufficient' };
      const nickname = window.getKakaoUser?.()?.nickname || null;
      const { error } = await db.from('voucher_log')
        .insert({ user_id: String(userId), delta: -product.cost, reason: 'redeem', product_id: productId, nickname, note: product.name });
      if (error) { console.error('[redeemVoucher]', error); return { ok: false, reason: 'db_error' }; }
      return { ok: true };
    } catch (err) { console.error('[redeemVoucher]', err); return { ok: false, reason: 'error' }; }
  }

  async function getVoucherHistory(userId, limit = 20) {
    try {
      const { data, error } = await db.from('voucher_log')
        .select('id, delta, reason, created_at, voucher_products(name)')
        .eq('user_id', String(userId))
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) console.error('[getVoucherHistory]', error);
      return data || [];
    } catch (err) { console.error('[getVoucherHistory]', err); return []; }
  }

  // ── 모임 플래너 ────────────────────────────────────────────

  async function getMeetingVotes(startDate, endDate) {
    try {
      const { data, error } = await db.from('meeting_votes')
        .select('vote_date, user_id, nickname, time_start, time_end, guest_count, game_style, game_style_custom, game_depth, play_traits, recruitment_message')
        .gte('vote_date', startDate)
        .lte('vote_date', endDate)
        .order('vote_date');
      if (error) console.error('[getMeetingVotes]', error);
      return data || [];
    } catch (err) { console.error('[getMeetingVotes]', err); return []; }
  }

  // 등록 1건 ≠ 방문 인원. 철수가 2명을 데려오면 등록은 1건이고 인원은 3명이다.
  // 「N명」을 세는 자리는 전부 이 둘만 쓴다 — 일부만 자체 계산하면 그 일부가 조용히 다른 답을 낸다.
  function getPartySize(vote) {
    const g = Number(vote?.guest_count);
    return 1 + (Number.isFinite(g) && g > 0 ? Math.floor(g) : 0);
  }

  // votes 배열의 총 방문 인원. UNIQUE(vote_date,user_id)라 같은 날 중복 행은 없지만,
  // 호출부가 여러 날짜를 섞어 넘길 수 있어 user_id 기준 dedupe 후 합산한다(기존 Set 의미 보존).
  function sumPartySize(votes) {
    if (!Array.isArray(votes) || !votes.length) return 0;
    const byUser = new Map();
    for (const v of votes) byUser.set(String(v.user_id), v);
    let total = 0;
    for (const v of byUser.values()) total += getPartySize(v);
    return total;
  }

  // guestCount(동반 인원 수)는 기본값 0 — 인자를 안 넘기는 기존 호출부는 동작이 바뀌지 않는다.
  // 상한 99는 DB CHECK와 같은 값(오타 방지). 음수·NaN·소수는 0/정수로 접는다.
  // 여러 날짜에 걸친 「이번주 인원」. 한 사람이 여러 날 등록해도 중복으로 세지 않도록
  // 유저별 **최대** 인원을 합산한다(월 3명·수 1명이면 그 사람 몫은 3).
  // sumPartySize와 다른 질문이다 — 저건 "그날 몇 명", 이건 "이 기간에 올 사람이 몇 명".
  // 동반이 전부 0이면 각자 1이 되어 옛 Set(user_id).size와 정확히 같다(회귀 없음).
  function sumWeeklyPartySize(votes) {
    if (!Array.isArray(votes) || !votes.length) return 0;
    const maxByUser = new Map();
    for (const v of votes) {
      const uid = String(v.user_id);
      const size = getPartySize(v);
      if (size > (maxByUser.get(uid) || 0)) maxByUser.set(uid, size);
    }
    let total = 0;
    for (const n of maxByUser.values()) total += n;
    return total;
  }

  async function upsertMeetingVote(userId, nickname, voteDate, timeStart, timeEnd, guestCount = 0, playIntent) {
    try {
      const g = Number(guestCount);
      const guest = Number.isFinite(g) && g > 0 ? Math.min(99, Math.floor(g)) : 0;
      const row = {
        vote_date: voteDate,
        user_id: String(userId),
        nickname,
        time_start: timeStart,
        time_end: timeEnd,
        guest_count: guest,
      };
      // 기존 호출은 playIntent를 생략한다. 이때 신규 필드를 payload에 넣지 않아
      // 이미 저장된 오늘의 판 의도를 의도치 않게 NULL/빈 배열로 덮지 않는다.
      if (playIntent && typeof playIntent === 'object') {
        const gameStyle = playIntent.gameStyle ?? null;
        const gameStyleCustom = String(playIntent.gameStyleCustom ?? '').trim().slice(0, 30);
        if (gameStyle === 'other' && !gameStyleCustom) {
          return { error: new Error('기타 게임 유형을 입력해주세요.') };
        }
        row.game_style = gameStyle;
        row.game_style_custom = gameStyle === 'other' ? gameStyleCustom : null;
        row.game_depth = playIntent.gameDepth ?? null;
        row.play_traits = Array.isArray(playIntent.playTraits) ? playIntent.playTraits : [];
        const message = String(playIntent.recruitmentMessage ?? '').trim();
        row.recruitment_message = message || null;
      }
      const { error } = await db.from('meeting_votes').upsert(row, { onConflict: 'vote_date,user_id' });
      return error ? { error } : { success: true };
    } catch (e) { return { error: e }; }
  }

  async function deleteMeetingVote(userId, voteDate) {
    try {
      const { error } = await db.from('meeting_votes')
        .delete()
        .eq('vote_date', voteDate)
        .eq('user_id', String(userId));
      // 참여 취소 시 그 날 하고싶은/배우고싶은 게임(meeting_vote_games)도 함께 제거 — orphan 방지
      const { error: vgErr } = await db.from('meeting_vote_games')
        .delete()
        .eq('vote_date', voteDate)
        .eq('user_id', String(userId));
      if (vgErr) console.error('[deleteMeetingVote] vote_games 정리 실패', vgErr);
      return error ? { error } : { success: true };
    } catch (e) { console.error('[deleteMeetingVote]', e); return { error: e }; }
  }

  // ── 모임 플래너 날짜별 게임 선호 (meeting_vote_games) ─────────────
  async function getMeetingVoteGames(startDate, endDate) {
    try {
      const { data, error } = await db.from('meeting_vote_games')
        .select('vote_date, user_id, list_type, game_id, custom_name, is_priority, player_condition')
        .gte('vote_date', startDate)
        .lte('vote_date', endDate)
        .order('vote_date');
      if (error) { console.error('[getMeetingVoteGames] DB error:', error); return []; }
      return data || [];
    } catch (e) { console.error('[getMeetingVoteGames] exception:', e); return []; }
  }

  async function addMeetingVoteGame(userId, voteDate, listType, gameId, customName) {
    if (!userId || !voteDate || (!gameId && !customName)) return { error: 'invalid' };
    try {
      const row = { user_id: String(userId), vote_date: voteDate, list_type: listType };
      if (gameId) row.game_id = gameId;
      if (customName) row.custom_name = customName;
      const { error } = await db.from('meeting_vote_games').insert(row);
      // 중복(23505)은 이미 등록된 것으로 간주해 성공 처리
      if (error && error.code === '23505') return { success: true };
      return error ? { error } : { success: true };
    } catch (e) { return { error: e }; }
  }

  async function setMeetingVoteGamePriority(userId, voteDate, gameId, customName, listType, isPriority) {
    if (!userId || !voteDate || (!gameId && !customName) || !listType) return { ok: false, reason: 'invalid' };
    try {
      // 1. 대상 행 존재 확인 (list_type 가드)
      let existQ = db.from('meeting_vote_games').select('id')
        .eq('user_id', String(userId)).eq('vote_date', voteDate).eq('list_type', listType);
      if (gameId) existQ = existQ.eq('game_id', gameId);
      else existQ = existQ.is('game_id', null).eq('custom_name', customName);
      const { data: existRows, error: existErr } = await existQ;
      if (existErr) return { ok: false, reason: 'db_error' };
      if (!existRows || existRows.length === 0) return { ok: false, reason: 'not_found' };

      // 2. max_priority 체크 (want+learn 합산)
      if (isPriority) {
        const { data: rows, error: cntErr } = await db.from('meeting_vote_games')
          .select('id')
          .eq('user_id', String(userId))
          .eq('vote_date', voteDate)
          .eq('is_priority', true);
        if (cntErr) return { ok: false, reason: 'db_error' };
        if ((rows || []).length >= 2) return { ok: false, reason: 'max_priority' };
      }

      // 3. UPDATE
      let q = db.from('meeting_vote_games')
        .update({ is_priority: isPriority })
        .eq('user_id', String(userId))
        .eq('vote_date', voteDate)
        .eq('list_type', listType)
        .select('id');
      if (gameId) q = q.eq('game_id', gameId);
      else q = q.is('game_id', null).eq('custom_name', customName);

      const { data, error } = await q;
      if (error) return { ok: false, reason: 'db_error' };
      if (!data || data.length === 0) return { ok: false, reason: 'not_found' };
      return { ok: true };
    } catch (err) { console.error('[setMeetingVoteGamePriority]', err); return { ok: false, reason: 'exception' }; }
  }

  async function setMeetingVoteGameCondition(userId, voteDate, gameId, customName, listType, condition) {
    if (!userId || !voteDate || (!gameId && !customName) || !listType || !condition) return { ok: false, reason: 'invalid' };
    try {
      // 1. 대상 행 존재 확인 (list_type 가드)
      let existQ = db.from('meeting_vote_games').select('id')
        .eq('user_id', String(userId)).eq('vote_date', voteDate).eq('list_type', listType);
      if (gameId) existQ = existQ.eq('game_id', gameId);
      else existQ = existQ.is('game_id', null).eq('custom_name', customName);
      const { data: existRows, error: existErr } = await existQ;
      if (existErr) return { ok: false, reason: 'db_error' };
      if (!existRows || existRows.length === 0) return { ok: false, reason: 'not_found' };

      // 2. UPDATE
      let q = db.from('meeting_vote_games')
        .update({ player_condition: condition })
        .eq('user_id', String(userId))
        .eq('vote_date', voteDate)
        .eq('list_type', listType)
        .select('id');
      if (gameId) q = q.eq('game_id', gameId);
      else q = q.is('game_id', null).eq('custom_name', customName);

      const { data, error } = await q;
      if (error) return { ok: false, reason: 'db_error' };
      if (!data || data.length === 0) return { ok: false, reason: 'not_found' };
      return { ok: true };
    } catch (e) { console.error('[setMeetingVoteGameCondition]', e); return { ok: false, reason: 'exception' }; }
  }

  async function removeMeetingVoteGame(userId, voteDate, listType, gameId, customName) {
    if (!userId || !voteDate) return { error: 'invalid' };
    try {
      let q = db.from('meeting_vote_games').delete()
        .eq('user_id', String(userId))
        .eq('vote_date', voteDate)
        .eq('list_type', listType);
      if (gameId) q = q.eq('game_id', gameId);
      else if (customName) q = q.eq('custom_name', customName).is('game_id', null);
      const { error } = await q;
      return error ? { error } : { success: true };
    } catch (e) { return { error: e }; }
  }
})();
