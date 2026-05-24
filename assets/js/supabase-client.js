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

  window.CottageDB = {
    trackView,
    getGameRating,
    submitRating,
    getMyRating,
    getPopularGames,
    getAllGameRatings,
  };
})();
