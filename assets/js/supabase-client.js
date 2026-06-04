// HTML 특수문자 이스케이프 — 전역 공용 (game-reviews.html, kakao-auth.js 등에서 참조)
window.escH = function(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
};

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
    const existing = localStorage.getItem(storageKey);
    if (existing) {
      return { alreadyRated: true, myRating: Number(existing) };
    }
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
    } catch (e) {
      return { error: e };
    }
  }

  // ── 내 별점 확인 (로컬스토리지) ────────────────────────

  function getMyRating(gameId) {
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

  async function getPlayerNames() {
    try {
      const { data } = await db
        .from("game_play_records")
        .select("player_names")
        .not("player_names", "is", null)
        .neq("player_names", "");
      if (!data) return [];
      const combos = [...new Set(data.map(r => r.player_names.trim()).filter(Boolean))];
      const individuals = [...new Set(
        data.flatMap(r => (r.player_names || "").split(",").map(n => n.trim()).filter(Boolean))
      )];
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
        .select("id, game_id, nickname, user_id, player_count, player_names, play_time_min, score_note, group_name, played_at, photo_url, created_at")
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

  // ── 비추 (game_dislikes) ─────────────────────────────
  async function getGameDislikeCount(gameId) {
    try {
      const { count } = await db
        .from("game_dislikes")
        .select("*", { count: "exact", head: true })
        .eq("game_id", gameId);
      return count || 0;
    } catch (_) { return 0; }
  }

  async function toggleGameDislike(gameId, userId) {
    if (!gameId || !userId) return { error: "invalid" };
    try {
      const { data: existing } = await db
        .from("game_dislikes")
        .select("id")
        .eq("game_id", gameId)
        .eq("user_id", userId)
        .maybeSingle();
      if (existing) {
        await db.from("game_dislikes").delete().eq("id", existing.id);
        return { disliked: false };
      } else {
        await db.from("game_likes").delete().eq("game_id", gameId).eq("user_id", userId);
        await db.from("game_dislikes").insert({ game_id: gameId, user_id: userId });
        return { disliked: true };
      }
    } catch (e) { return { error: e }; }
  }

  async function hasUserDisliked(gameId, userId) {
    if (!gameId || !userId) return false;
    try {
      const { data } = await db
        .from("game_dislikes")
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
    if (localStorage.getItem(visitedKey)) return;
    localStorage.setItem(visitedKey, "1");
    const page =
      location.pathname.split("/").filter(Boolean).pop()?.replace(".html", "") ||
      "index";
    trackPageView(page);
  });

  // ── 밴 상태 ──────────────────────────────────────────────
  let _isBanned = false;
  function isUserBanned() { return _isBanned; }

  // ── 체류 시간 누적 ──────────────────────────────────────
  let _sessionStart = Date.now();
  let _sessionUserId = null;

  function _flushTime(userId) {
    if (!userId) return;
    const elapsed = Math.floor((Date.now() - _sessionStart) / 1000); // 초 단위 누적
    if (elapsed <= 0) return;
    const key = `cottage_time_sec_${userId}`;
    const prev = parseInt(localStorage.getItem(key) || '0');
    localStorage.setItem(key, String(prev + elapsed));
    _sessionStart = Date.now();
  }

  function _popAccumulatedMinutes(userId) {
    const key = `cottage_time_sec_${userId}`;
    const secs = parseInt(localStorage.getItem(key) || '0');
    return Math.floor(secs / 60); // DB는 total_minutes(분) 컬럼이므로 변환
  }

  // 당일 누적 시간을 즉시 DB에 반영 — visibilitychange/beforeunload에서 호출
  async function _syncTimeToDBNow(userId) {
    if (!userId) return;
    _flushTime(userId); // 현재 세션 시간을 localStorage에 먼저 저장
    const mins = _popAccumulatedMinutes(userId);
    if (mins <= 0) return;
    try {
      const { data } = await db.from('profiles').select('total_minutes').eq('user_id', userId).maybeSingle();
      const newTotal = (data?.total_minutes || 0) + mins;
      const { error } = await db.from('profiles').update({
        total_minutes: newTotal,
        last_seen_at: new Date().toISOString(),
      }).eq('user_id', userId);
      if (!error) localStorage.removeItem(`cottage_time_sec_${userId}`);
    } catch (_) {}
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      // 탭 숨김 시 DB에 즉시 반영 (async이므로 페이지 살아있는 동안 완료)
      if (document.hidden && _sessionUserId) _syncTimeToDBNow(_sessionUserId);
      else _sessionStart = Date.now();
    });
    window.addEventListener('beforeunload', () => {
      // 페이지 종료 시 best-effort 반영 (완료 보장 불가, localStorage가 백업)
      if (_sessionUserId) _syncTimeToDBNow(_sessionUserId);
    });
  }

  function startSession(userId) {
    _sessionUserId = userId;
    _sessionStart = Date.now();
    window._cottageSessionStart = _sessionStart;
  }

  async function upsertProfile(userId, nickname, realName) {
    startSession(userId);
    try {
      const accumulated = _popAccumulatedMinutes(userId);
      const { data } = await db.from('profiles').select('visit_count, total_minutes, real_name, is_banned, nickname').eq('user_id', userId).maybeSingle();
      _isBanned = !!data?.is_banned;
      // DB에 이미 커스텀 닉네임이 있고 새로 들어온 값이 Kakao 기본명(realName)과 같으면 기존 보호
      const nickToSave = (data?.nickname && realName && data.nickname !== realName && nickname === realName)
        ? data.nickname
        : nickname;
      const { error: upsertError } = await db.from('profiles').upsert({
        user_id: userId,
        nickname: nickToSave,
        real_name: data?.real_name || realName || null,
        last_seen_at: new Date().toISOString(),
        visit_count: (data?.visit_count || 0) + 1,
        total_minutes: (data?.total_minutes || 0) + accumulated,
      }, { onConflict: 'user_id' });
      if (!upsertError) localStorage.removeItem(`cottage_time_sec_${userId}`);
    } catch (_) {}
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
        .limit(2000);
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
    getGameDislikeCount,
    toggleGameDislike,
    hasUserDisliked,
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
  };

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
