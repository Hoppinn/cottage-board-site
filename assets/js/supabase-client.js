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
      catch (_) { return {}; }
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
      await db.from("game_views").insert({ game_id: gameId });
    } catch (_) {}
  }

  // ── 별점 조회 ───────────────────────────────────────────

  async function getGameRating(gameId) {
    try {
      const { data } = await db
        .from("game_ratings")
        .select("rating")
        .eq("game_id", gameId);
      if (!data?.length) return null;
      const avg = data.reduce((s, r) => s + r.rating, 0) / data.length;
      return { avg: parseFloat(avg.toFixed(1)), count: data.length };
    } catch (_) {
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
        const { data } = await db.from("game_ratings")
          .select("rating")
          .eq("game_id", gameId)
          .eq("user_id", String(userId))
          .maybeSingle();
        if (data?.rating != null) return Number(data.rating);
      } catch (_) {}
    }
    const stored = localStorage.getItem(`cottage_rated_${gameId}`);
    return stored ? Number(stored) : null;
  }

  // ── 인기게임 집계 (최근 30일 조회수) ───────────────────

  async function getPopularGames(limit = 20) {
    try {
      const { data } = await db.rpc("get_popular_games", { limit_count: limit });
      return data || [];
    } catch (_) {
      return [];
    }
  }

  // ── 전체 게임 별점 요약 ─────────────────────────────────

  async function getAllGameRatings() {
    try {
      const { data } = await db.rpc("get_all_game_ratings");
      if (!data) return {};
      return Object.fromEntries(
        data.map((r) => [
          r.game_id,
          { avg: Number(r.avg_rating), count: Number(r.rating_count) },
        ])
      );
    } catch (_) {
      return {};
    }
  }

  // ── 페이지 뷰 트래킹 ────────────────────────────────────

  async function trackPageView(page) {
    if (!page) return;
    try {
      await db.from("page_views").insert({ page });
    } catch (_) {}
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
        return { success: true, id };
      }
      return { error };
    } catch (e) {
      return { error: e };
    }
  }

  async function getGamePlayRecords(gameId, limit = 30) {
    try {
      const { data } = await db
        .from("game_play_records")
        .select("id, nickname, user_id, player_count, player_names, play_time_min, score_note, group_name, played_at, photo_url, review_text, created_at")
        .eq("game_id", gameId)
        .order("created_at", { ascending: false })
        .limit(limit);
      return data || [];
    } catch (_) {
      return [];
    }
  }

  async function deleteGamePlay(id) {
    if (!id) return { error: "invalid" };
    try {
      const { error } = await db.from("game_play_records").delete().eq("id", id);
      return error ? { error } : { success: true };
    } catch (e) {
      return { error: e };
    }
  }

  async function updateGamePlay(id, { player_count, player_names, play_time_min, score_note, group_name, played_at, review_text, game_id, photo_url }) {
    if (!id) return { error: "invalid" };
    try {
      const fields = { player_count, player_names, play_time_min, score_note, group_name: group_name || null, played_at: played_at || null };
      if (review_text !== undefined) fields.review_text = review_text || null;
      if (game_id) fields.game_id = game_id;
      if (photo_url !== undefined) fields.photo_url = photo_url || null;
      const { error } = await db.from("game_play_records")
        .update(fields)
        .eq("id", id);
      return error ? { error } : { success: true };
    } catch (e) {
      return { error: e };
    }
  }

  async function getGroupNames() {
    try {
      const { data } = await db
        .from("game_play_records")
        .select("group_name")
        .not("group_name", "is", null)
        .neq("group_name", "");
      if (!data) return [];
      return [...new Set(data.map(r => r.group_name).filter(Boolean))].sort();
    } catch (_) {
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
      const { data } = await db
        .from("game_play_records")
        .select("player_names")
        .not("player_names", "is", null)
        .neq("player_names", "");
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
    } catch (_) {
      return [];
    }
  }

  async function getAllPlayRecordsForHistory(limit = 500) {
    try {
      const { data } = await db
        .from("game_play_records")
        .select("id, game_id, nickname, user_id, player_count, player_names, play_time_min, score_note, group_name, played_at, photo_url, review_text, created_at")
        .not("group_name", "is", null)
        .neq("group_name", "")
        .order("created_at", { ascending: false })
        .limit(limit);
      return data || [];
    } catch (_) {
      return [];
    }
  }

  async function getGamePlayCount(gameId) {
    try {
      const { count } = await db
        .from("game_play_records")
        .select("*", { count: "exact", head: true })
        .eq("game_id", gameId);
      return count || 0;
    } catch (_) {
      return 0;
    }
  }

  // ── 플레이 하이라이트 ────────────────────────────────────

  async function getPlayHighlights(gameId) {
    try {
      const { data } = await db
        .from("play_highlights")
        .select("highlight_text, created_at")
        .eq("game_id", gameId)
        .order("created_at", { ascending: false })
        .limit(3);
      return data || [];
    } catch (_) {
      return [];
    }
  }

  // ── 게임 코멘트 ─────────────────────────────────────────

  async function getGameComments(gameKey, limit = 10) {
    try {
      const { data } = await db
        .from("game_comments")
        .select("id, comment_text, nickname, user_id, created_at")
        .eq("game_key", gameKey)
        .order("created_at", { ascending: false })
        .limit(limit);
      return data || [];
    } catch (_) {
      return [];
    }
  }

  async function insertComment(gameKey, commentText, nickname, userId) {
    if (!gameKey || !commentText?.trim()) return { error: "invalid" };
    try {
      const { data, error } = await db
        .from("game_comments")
        .insert({
          game_key: gameKey,
          comment_text: commentText.trim(),
          nickname: nickname || null,
          user_id: userId || null,
        })
        .select("id");
      if (error) return { error };
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
      const { count } = await db
        .from("game_likes")
        .select("*", { count: "exact", head: true })
        .eq("game_id", gameId);
      return count || 0;
    } catch (_) {
      return 0;
    }
  }

  async function toggleGameLike(gameId, userId) {
    if (!gameId || !userId) return { error: "invalid" };
    try {
      const { data: existing } = await db
        .from("game_likes")
        .select("id")
        .eq("game_id", gameId)
        .eq("user_id", userId)
        .maybeSingle();
      if (existing) {
        await db.from("game_likes").delete().eq("id", existing.id);
        return { liked: false };
      } else {
        await db.from("game_likes").insert({ game_id: gameId, user_id: userId });
        return { liked: true };
      }
    } catch (e) {
      return { error: e };
    }
  }

  async function hasUserLiked(gameId, userId) {
    if (!gameId || !userId) return false;
    try {
      const { data } = await db
        .from("game_likes")
        .select("id")
        .eq("game_id", gameId)
        .eq("user_id", userId)
        .maybeSingle();
      return !!data;
    } catch (_) {
      return false;
    }
  }

  // ── 궁금해요 (game_curious) ──────────────────────────
  async function getGameCuriousCount(gameId) {
    try {
      const { count } = await db
        .from("game_curious")
        .select("*", { count: "exact", head: true })
        .eq("game_id", gameId);
      return count || 0;
    } catch (_) { return 0; }
  }

  async function toggleGameCurious(gameId, userId) {
    if (!gameId || !userId) return { error: "invalid" };
    try {
      const { data: existing } = await db
        .from("game_curious")
        .select("id")
        .eq("game_id", gameId)
        .eq("user_id", userId)
        .maybeSingle();
      if (existing) {
        await db.from("game_curious").delete().eq("id", existing.id);
        return { curious: false };
      } else {
        await db.from("game_likes").delete().eq("game_id", gameId).eq("user_id", userId);
        await db.from("game_curious").insert({ game_id: gameId, user_id: userId });
        return { curious: true };
      }
    } catch (e) { return { error: e }; }
  }

  async function hasUserCurious(gameId, userId) {
    if (!gameId || !userId) return false;
    try {
      const { data } = await db
        .from("game_curious")
        .select("id")
        .eq("game_id", gameId)
        .eq("user_id", userId)
        .maybeSingle();
      return !!data;
    } catch (_) { return false; }
  }

  // ── 방문자 통계 ─────────────────────────────────────

  async function getVisitorStats() {
    try {
      const { data } = await db.from("page_views").select("created_at");
      if (!data) return null;
      // KST(UTC+9) 기준 오늘 날짜
      const kstNow = new Date(Date.now() + 9 * 3600000);
      const todayKst = kstNow.toISOString().slice(0, 10);
      const todayCount = data.filter(r =>
        r.created_at && (new Date(r.created_at).getTime() + 9 * 3600000 >= new Date(todayKst + "T00:00:00Z").getTime())
          && (new Date(r.created_at).getTime() + 9 * 3600000 < new Date(todayKst + "T00:00:00Z").getTime() + 86400000)
      ).length;
      return { total: data.length, today: todayCount };
    } catch (_) {
      return null;
    }
  }

  // ── 자동 페이지 뷰 트래킹 ──────────────────────────────

  document.addEventListener("DOMContentLoaded", function () {
    // localhost 개발 환경에서는 카운팅 안 함
    if (location.hostname === "127.0.0.1" || location.hostname === "localhost") return;
    // 로그인 여부 무관하게 카운트 — localStorage로 하루 1회만 집계
    const kstDate = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
    const visitedKey = "cottage_visited_" + kstDate;
    if (!localStorage.getItem(visitedKey)) {
      localStorage.setItem(visitedKey, "1");
      const page =
        location.pathname.split("/").filter(Boolean).pop()?.replace(".html", "") ||
        "index";
      trackPageView(page);
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
  let _sessionEnterAt = Date.now();
  let _sessionUserId = null;

  // ── heartbeat: 1분 주기, 로그인+탭 활성 상태에서 이용시간 누적 반영 ──
  let _heartbeatTimer = null;
  function _ensureHeartbeat() {
    if (_heartbeatTimer) return;
    _heartbeatTimer = setInterval(async () => {
      if (!_sessionUserId || document.hidden) return;
      await _syncTimeToDBNow(_sessionUserId, false);
    }, 60 * 1000);
  }

  function _flushTime(userId) {
    if (!userId) return;
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

  // 당일 누적 시간을 즉시 DB에 반영 — visibilitychange/heartbeat에서 호출
  // insertPageSession: 탭 숨김처럼 실제 페이지 이탈 시에만 true
  async function _syncTimeToDBNow(userId, insertPageSession = true) {
    if (!userId) return;
    const enterAt = new Date(_sessionEnterAt).toISOString(); // flush 전 세션 진입 시각 캡처
    _flushTime(userId); // 현재 세션 시간을 localStorage에 먼저 저장
    const secs = _popAccumulatedSecs(userId);
    if (secs <= 0) return;
    try {
      const { data, error: selectError } = await db.from('profiles').select('total_minutes, today_seconds, today_date').eq('user_id', userId).maybeSingle();
      if (selectError || !data) return; // 에러 또는 row 없으면 localStorage 유지 — upsertProfile 실행 시 처리
      const newTotal = (data.total_minutes || 0) + secs;
      const todayStr = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10); // KST
      const prevToday = data.today_date === todayStr ? (data.today_seconds || 0) : 0;
      const { error } = await db.from('profiles').update({
        total_minutes: newTotal,
        today_seconds: prevToday + secs,
        today_date: todayStr,
        last_seen_at: new Date().toISOString(),
      }).eq('user_id', userId);
      if (!error) {
        const s = window._cottageSess.get(userId);
        s.timeSec = 0;
        window._cottageSess.set(userId, s);
        _sessionEnterAt = Date.now();
        if (insertPageSession) {
          const page = typeof window !== 'undefined'
            ? (window.location?.pathname?.split('/').filter(Boolean).pop()?.replace('.html', '') || 'index')
            : 'unknown';
          const referrer = typeof document !== 'undefined' && document.referrer
            ? (() => { try { const u = new URL(document.referrer); return u.hostname !== location.hostname ? u.hostname : null; } catch (_) { return null; } })()
            : null;
          db.from('page_sessions').insert({ page, user_id: userId, duration_sec: secs, entered_at: enterAt, referrer }).then(() => {});
        }
      }
    } catch (_) {}
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      // 탭 숨김 시 DB에 즉시 반영 (async이므로 페이지 살아있는 동안 완료)
      if (document.hidden && _sessionUserId) _syncTimeToDBNow(_sessionUserId);
      else { _sessionStart = Date.now(); _sessionEnterAt = Date.now(); window._cottageSessionStart = _sessionStart; }
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
    _sessionEnterAt = Date.now();
    window._cottageSessionStart = _sessionStart;
    _ensureHeartbeat();
  }

  // ── 비로그인 방문자 heartbeat (anon_sessions 테이블) ──────────────
  let _anonHeartbeatTimer = null;

  function _stopAnonHeartbeat() {
    if (_anonHeartbeatTimer) { clearInterval(_anonHeartbeatTimer); _anonHeartbeatTimer = null; }
  }

  function _startAnonHeartbeat() {
    if (_anonHeartbeatTimer || _sessionUserId) return;
    if (location.hostname === '127.0.0.1' || location.hostname === 'localhost') return;
    const key = getSessionKey();
    db.from('anon_sessions').upsert(
      { session_key: key, last_seen_at: new Date().toISOString() },
      { onConflict: 'session_key' }
    ).then(() => {}).catch(() => {});
    _anonHeartbeatTimer = setInterval(() => {
      if (_sessionUserId) { _stopAnonHeartbeat(); return; }
      if (document.hidden) return;
      db.from('anon_sessions').update({ last_seen_at: new Date().toISOString() })
        .eq('session_key', key).then(() => {}).catch(() => {});
    }, 60 * 1000);
  }

  async function upsertProfile(userId, nickname, realName, explicitVisitCount) {
    startSession(userId);
    try {
      const accumulated = _popAccumulatedSecs(userId);
      const { data, error: selectError } = await db.from('profiles').select('visit_count, total_minutes, today_seconds, today_date, real_name, is_banned, nickname, photo_url').eq('user_id', userId).maybeSingle();
      _isBanned = !!data?.is_banned;
      // DB에 이미 커스텀 닉네임이 있고 새로 들어온 값이 Kakao 기본명과 같으면 기존 보호
      // realName이 null/empty일 때 DB의 real_name으로 fallback
      const effectiveRealName = realName || data?.real_name || null;
      const nickToSave = (data?.nickname && effectiveRealName && data.nickname !== effectiveRealName && nickname === effectiveRealName)
        ? data.nickname
        : nickname;
      // 일일 방문 시 DB값 기준 +1 (dedup은 kakao-auth.js의 sess.lastVisitDate !== kstDate 조건이 담당)
      // explicitVisitCount=undefined인 닉네임 변경 등의 호출은 visit_count를 건드리지 않음
      const visitCountField = {};
      if (explicitVisitCount !== undefined) {
        visitCountField.visit_count = (!selectError && data)
          ? (data.visit_count || 0) + 1      // DB값 기준 +1 (새 기기에서도 올바르게 증가)
          : explicitVisitCount;               // SELECT 실패 시 localStorage 값 fallback
      }
      const todayStr = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10); // KST
      const prevToday = data?.today_date === todayStr ? (data?.today_seconds || 0) : 0;
      // SELECT 실패 시 total_minutes를 upsert 대상에서 제외 — 에러로 data=null 상태에서 0으로 덮어쓰는 것 방지
      const timeFields = !selectError ? {
        total_minutes: (data?.total_minutes || 0) + accumulated,
        today_seconds: prevToday + accumulated,
        today_date: todayStr,
      } : {};
      const { error: upsertError } = await db.from('profiles').upsert({
        user_id: userId,
        nickname: nickToSave,
        real_name: data?.real_name || realName || null,
        last_seen_at: new Date().toISOString(),
        ...visitCountField,
        ...timeFields,
        ...(data?.photo_url ? { photo_url: data.photo_url } : {}),
      }, { onConflict: 'user_id' });
      if (!upsertError && !selectError) {
        const s = window._cottageSess.get(userId);
        s.timeSec = 0;
        window._cottageSess.set(userId, s);
      }
    } catch (_) {}
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
      const { data } = await db.from('profiles').select('photo_url').eq('user_id', userId).maybeSingle();
      return data?.photo_url || null;
    } catch (_) { return null; }
  }

  async function getProfileSnapshot(userId) {
    if (!userId) return null;
    try {
      const { data } = await db.from('profiles').select('photo_url,nickname').eq('user_id', userId).maybeSingle();
      return data || null;
    } catch (_) { return null; }
  }

  async function getAllProfiles() {
    try {
      const { data } = await db.from('profiles').select('*').order('last_seen_at', { ascending: false });
      return data || [];
    } catch (_) { return []; }
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

  async function deletePlayPhoto(recordId) {
    try {
      const { error } = await db.from('game_play_records').update({ photo_url: null }).eq('id', recordId);
      return error ? { error } : { success: true };
    } catch (e) { return { error: e }; }
  }

  async function getPageAnalytics() {
    try {
      const { data } = await db.from('page_sessions')
        .select('page, referrer, user_id, duration_sec, entered_at')
        .order('entered_at', { ascending: false })
        .limit(5000);
      return data || [];
    } catch (_) { return []; }
  }

  async function checkNicknameAvailable(nickname, currentUserId) {
    try {
      const { data } = await db.from('profiles')
        .select('user_id')
        .eq('nickname', nickname)
        .neq('user_id', String(currentUserId))
        .limit(1);
      return !data?.length;
    } catch (_) { return true; }
  }

  async function getMyStats(userId, nickname) {
    try {
      const queries = [
        db.from('game_play_records').select('id, game_id, played_at, created_at, group_name').eq('user_id', userId).order('created_at', { ascending: false }),
        db.from('game_comments').select('id, game_id, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
        db.from('suggestions').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        db.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
      ];
      if (nickname) {
        queries.push(
          db.from('game_play_records')
            .select('id, game_id, played_at, created_at, group_name')
            .ilike('player_names', `%${nickname}%`)
            .neq('user_id', userId)
            .order('created_at', { ascending: false })
        );
      }
      const [playRes, commentRes, suggestRes, profile, taggedRes] = await Promise.all(queries);
      const ownPlays = playRes.data || [];
      const taggedPlays = taggedRes?.data || [];
      // 중복 제거 후 합치기 (내 기록 우선)
      const seenIds = new Set(ownPlays.map(r => r.id));
      const merged = [...ownPlays, ...taggedPlays.filter(r => !seenIds.has(r.id))];
      merged.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      const moimSessions = new Set();
      for (const r of merged) {
        if (r.group_name) {
          const d = r.played_at || (r.created_at || '').slice(0, 10);
          moimSessions.add(`${r.group_name}_${d}`);
        }
      }
      return {
        plays: merged,
        comments: commentRes.data || [],
        suggestions: suggestRes.count || 0,
        moimCount: moimSessions.size,
        profile: profile.data || null,
      };
    } catch (_) { return { plays: [], comments: [], suggestions: 0, moimCount: 0, profile: null }; }
  }

  window.CottageDB = {
    trackView,
    trackPageView,
    getGameRating,
    submitRating,
    getMyRating,
    getPopularGames,
    getAllGameRatings,
    uploadPlayPhoto,
    recordGamePlay,
    deleteGamePlay,
    updateGamePlay,
    getGamePlayCount,
    getPlayHighlights,
    getVisitorStats,
    getGameComments,
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
    startSession,
    upsertProfile,
    getAllProfiles,
    checkNicknameAvailable,
    getPageAnalytics,
    getMyStats,
    getGameReviews,
    insertGameReview,
    deleteGameReview,
    banUser,
    unbanUser,
    deletePlayPhoto,
    isUserBanned,
    updateProfilePhoto,
    getProfilePhoto,
    getProfileSnapshot,
    getAllPlayRecordsForHub,
  };

  // 플레이기록 허브용 — 모든 기록 조회 (200건, played_at/created_at 정렬)
  async function getAllPlayRecordsForHub(limit = 200) {
    try {
      const { data } = await db.from('game_play_records')
        .select('id, game_id, user_id, nickname, player_count, player_names, play_time_min, score_note, group_name, played_at, photo_url, created_at')
        .order('played_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit);
      return data || [];
    } catch (_) { return []; }
  }

  async function getGameReviews(gameId) {
    try {
      const { data } = await db.from('game_reviews')
        .select('id, user_id, nickname, content, created_at')
        .eq('game_id', gameId)
        .order('created_at', { ascending: false });
      return data || [];
    } catch (_) { return []; }
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
})();
