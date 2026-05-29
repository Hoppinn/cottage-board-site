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

  const db = window.supabase.createClient(cfg.url, cfg.anonKey);

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

  async function recordGamePlay(gameId, playerCount, playerNames, playTimeMin, scoreNote, nickname, userId, groupName, playedAt) {
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
        .select("id, nickname, user_id, player_count, player_names, play_time_min, score_note, group_name, played_at, created_at")
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

  async function updateGamePlay(id, { player_count, player_names, play_time_min, score_note, group_name, played_at }) {
    if (!id) return { error: "invalid" };
    try {
      const { error } = await db.from("game_play_records")
        .update({ player_count, player_names, play_time_min, score_note, group_name: group_name || null, played_at: played_at || null })
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

  async function getAllPlayRecordsForHistory(limit = 500) {
    try {
      const { data } = await db
        .from("game_play_records")
        .select("id, game_id, nickname, user_id, player_count, player_names, play_time_min, score_note, group_name, played_at, created_at")
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
    if (sessionStorage.getItem("cottage_visited")) return;
    sessionStorage.setItem("cottage_visited", "1");
    const page =
      location.pathname.split("/").filter(Boolean).pop()?.replace(".html", "") ||
      "index";
    trackPageView(page);
  });

  async function upsertProfile(userId, nickname) {
    try {
      const { data } = await db.from('profiles').select('visit_count').eq('user_id', userId).maybeSingle();
      await db.from('profiles').upsert({
        user_id: userId,
        nickname,
        last_seen_at: new Date().toISOString(),
        visit_count: (data?.visit_count || 0) + 1,
      }, { onConflict: 'user_id' });
    } catch (_) {}
  }

  async function getAllProfiles() {
    try {
      const { data } = await db.from('profiles').select('*').order('last_seen_at', { ascending: false });
      return data || [];
    } catch (_) { return []; }
  }

  async function getMyStats(userId) {
    try {
      const [playRes, commentRes, suggestRes, profile] = await Promise.all([
        db.from('game_play_records').select('id, game_id, played_at, created_at, group_name').eq('user_id', userId).order('created_at', { ascending: false }),
        db.from('game_comments').select('id, game_id, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
        db.from('suggestions').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        db.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
      ]);
      const plays = playRes.data || [];
      const moimSessions = new Set();
      for (const r of plays) {
        if (r.group_name) {
          const d = r.played_at || (r.created_at || '').slice(0, 10);
          moimSessions.add(`${r.group_name}_${d}`);
        }
      }
      return {
        plays,
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
    getAllPlayRecordsForHistory,
    getGameLikeCount,
    toggleGameLike,
    hasUserLiked,
    getGameDislikeCount,
    toggleGameDislike,
    hasUserDisliked,
    upsertProfile,
    getAllProfiles,
    getMyStats,
  };
})();
