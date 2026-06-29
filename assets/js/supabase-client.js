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

  // LIKE 패턴에서 와일드카드 문자 제거 — ilike() 호출 시 닉네임 안전화
  function _escapeLike(str) {
    return String(str || '').replace(/[%_]/g, '');
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

  async function trackPageView(page, referrer = null) {
    if (!page) return;
    try {
      const payload = { page };
      if (referrer) payload.referrer = referrer;
      const { error } = await db.from("page_views").insert(payload);
      if (error) console.warn('[trackPageView] insert error:', error.message);
    } catch (e) { console.warn('[trackPageView] exception:', e); }
  }

  // ── 이벤트 트래킹 ───────────────────────────────────────

  async function trackEvent(eventType, opts = {}) {
    if (typeof location === 'undefined') return;
    if (location.hostname === '127.0.0.1' || location.hostname === 'localhost') return;
    if (localStorage.getItem('cottage_is_admin')) return;
    const kstDate = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
    const referrer = localStorage.getItem(`cottage_orig_src_${kstDate}`) || null;
    const payload = { event_type: eventType, referrer };
    if (opts.game_id) payload.game_id = opts.game_id;
    try {
      await db.from('page_events').insert(payload);
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
      const base = db.from("game_play_records")
        .select("id, nickname, user_id, player_count, player_names, play_time_min, score_note, group_name, played_at, photo_url, review_text, created_at");
      const { data } = await (ids.length > 1 ? base.in("game_id", ids) : base.eq("game_id", ids[0]))
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
        .order("created_at", { ascending: false })
        .limit(limit);
      return data || [];
    } catch (_) {
      return [];
    }
  }

  async function getGamePlayCount(gameId) {
    try {
      const ids = Array.isArray(gameId) ? gameId.map(String) : [String(gameId)];
      const base = db.from("game_play_records").select("*", { count: "exact", head: true });
      const { count } = await (ids.length > 1 ? base.in("game_id", ids) : base.eq("game_id", ids[0]));
      return count || 0;
    } catch (_) {
      return 0;
    }
  }

  // ── 플레이 하이라이트 ────────────────────────────────────

  async function getPlayHighlights(gameId) {
    try {
      const ids = Array.isArray(gameId) ? gameId.map(String) : [String(gameId)];
      const base = db.from("play_highlights").select("highlight_text, created_at");
      const { data } = await (ids.length > 1 ? base.in("game_id", ids) : base.eq("game_id", ids[0]))
        .order("created_at", { ascending: false })
        .limit(3);
      return data || [];
    } catch (_) {
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
      const { data } = await (ids.length > 1 ? base.in('game_id', ids) : base.eq('game_id', ids[0]));
      return data || [];
    } catch (_) { return []; }
  }

  async function getGameComments(gameKey, limit = 10) {
    try {
      const keys = Array.isArray(gameKey) ? gameKey.map(String) : [String(gameKey)];
      const base = db
        .from("game_comments")
        .select("id, comment_text, nickname, user_id, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      const { data } = await (keys.length > 1 ? base.in('game_key', keys) : base.eq('game_key', keys[0]));
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

  async function getUserLikedGames(userId) {
    if (!userId) return [];
    try {
      const { data } = await db.from('game_likes').select('game_id').eq('user_id', userId);
      return (data || []).map(r => r.game_id);
    } catch (_) { return []; }
  }

  async function getUserCuriousGames(userId) {
    if (!userId) return [];
    try {
      const { data } = await db.from('game_curious').select('game_id').eq('user_id', userId);
      return (data || []).map(r => r.game_id);
    } catch (_) { return []; }
  }

  async function _getReactionUsers(table, gameId, limit) {
    try {
      const { data: rows } = await db.from(table).select('user_id').eq('game_id', gameId).limit(limit);
      if (!rows?.length) return [];
      const ids = rows.map(r => r.user_id);
      const { data: profs } = await db.from('profiles').select('user_id, nickname, photo_url, rep_achievement_id').in('user_id', ids);
      return profs || [];
    } catch (_) { return []; }
  }

  function getGameLikers(gameId, limit = 6) { return _getReactionUsers('game_likes', gameId, limit); }
  function getGameCuriousUsers(gameId, limit = 6) { return _getReactionUsers('game_curious', gameId, limit); }

  // ── 취향보드 (game_likes / game_curious with custom_name) ────────────

  async function getUserLikedGamesAll(userId) {
    if (!userId) return [];
    try {
      const { data } = await db.from('game_likes').select('game_id, custom_name').eq('user_id', userId);
      return data || [];
    } catch (_) { return []; }
  }

  async function getUserCuriousGamesAll(userId) {
    if (!userId) return [];
    try {
      const { data } = await db.from('game_curious').select('game_id, custom_name').eq('user_id', userId);
      return data || [];
    } catch (_) { return []; }
  }

  async function getUserTasteProfile(userId) {
    if (!userId) return null;
    try {
      const [profileRes, introRes, likedGames, curiousGames] = await Promise.all([
        db.from('profiles').select('nickname, photo_url, bio, avoid_tags, rep_achievement_id').eq('user_id', userId).maybeSingle(),
        db.from('member_intros').select('nickname').eq('user_id', userId).maybeSingle(),
        getUserLikedGamesAll(userId),
        getUserCuriousGamesAll(userId),
      ]);
      const profile = profileRes.data || {};
      const nickname = introRes.data?.nickname || profile.nickname || '(알 수 없음)';
      return { nickname, photo_url: profile.photo_url, rep_achievement_id: profile.rep_achievement_id, bio: profile.bio, avoid_tags: profile.avoid_tags || [], likedGames, curiousGames };
    } catch (_) { return null; }
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
      const names = new Set([...(l.data || []), ...(c.data || [])].map(r => r.custom_name).filter(Boolean));
      return [...names].sort();
    } catch (_) { return []; }
  }

  async function updateUserBio(userId, bio) {
    if (!userId) return { error: 'invalid' };
    try {
      const { error } = await db.from('profiles').update({ bio: bio || null }).eq('user_id', userId);
      return error ? { error } : { success: true };
    } catch (e) { return { error: e }; }
  }

  async function getAllBioTagSuggestions() {
    try {
      const { data } = await db.from('profiles').select('bio').not('bio', 'is', null);
      const allTags = (data || []).flatMap(r => (r.bio || '').split(',').map(t => t.trim()).filter(Boolean));
      return [...new Set(allTags)].sort();
    } catch (_) { return []; }
  }

  async function getAllAvoidTagSuggestions() {
    try {
      const { data } = await db.from('profiles').select('avoid_tags').not('avoid_tags', 'is', null);
      const allTags = (data || []).flatMap(r => r.avoid_tags || []);
      return [...new Set(allTags)].sort();
    } catch (_) { return []; }
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
      return { total: totalRes.count || 0, today: todayRes.count || 0 };
    } catch (_) {
      return null;
    }
  }

  // ── 자동 페이지 뷰 트래킹 ──────────────────────────────

  document.addEventListener("DOMContentLoaded", function () {
    // localhost 개발 환경에서는 카운팅 안 함
    if (location.hostname === "127.0.0.1" || location.hostname === "localhost") return;
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
      } catch (_) { return null; }
    })();
    // 관리자 접속은 방문자 통계 전체 미포함
    const isAdmin = !!localStorage.getItem('cottage_is_admin');
    if (isAdmin) return;
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
        trackPageView('__visitor__', effectiveSource === 'direct' ? null : effectiveSource);
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
  let _sessionEnterAt = Date.now();
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
      } catch (_) {}
    }
    // 내부 이동 시 당일 마지막 외부 유입 소스로 귀속
    const kstDate = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
    return localStorage.getItem(`cottage_orig_src_${kstDate}`) || null;
  })();

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
    if (location.hostname === '127.0.0.1' || location.hostname === 'localhost') return;
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
          const referrer = _sessionReferrer;
          db.from('page_sessions').insert({ page, user_id: userId, session_key: getSessionKey(), duration_sec: secs, entered_at: enterAt, referrer }).then(() => {});
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

  async function _startAnonHeartbeat() {
    if (_anonHeartbeatTimer || _sessionUserId) return;
    if (location.hostname === '127.0.0.1' || location.hostname === 'localhost') return;
    const key = getSessionKey();
    const todayKst = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
    let _anonTodaySec = 0;
    try {
      const { data: existing } = await db.from('anon_sessions')
        .select('visit_count, today_date, today_seconds')
        .eq('session_key', key).maybeSingle();
      if (!existing) {
        await db.from('anon_sessions').insert({
          session_key: key, last_seen_at: new Date().toISOString(),
          first_seen_at: new Date().toISOString(),
          visit_count: 1, today_seconds: 0, today_date: todayKst
        });
      } else {
        const isNewDay = existing.today_date !== todayKst;
        _anonTodaySec = isNewDay ? 0 : (existing.today_seconds || 0);
        await db.from('anon_sessions').update({
          last_seen_at: new Date().toISOString(),
          visit_count: (existing.visit_count || 0) + (isNewDay ? 1 : 0),
          today_seconds: _anonTodaySec, today_date: todayKst
        }).eq('session_key', key);
      }
    } catch (_) {}
    // 비로그인 방문자도 page_sessions에 기록 (명 집계용); 실패해도 anon_sessions 영향 없음
    try {
      const page = window.location?.pathname?.split('/').filter(Boolean).pop()?.replace('.html', '') || 'index';
      db.from('page_sessions').insert({
        page, user_id: null, session_key: key,
        duration_sec: 0, entered_at: new Date().toISOString(), referrer: _sessionReferrer
      }).then(() => {}).catch(() => {});
    } catch (_) {}
    _anonHeartbeatTimer = setInterval(() => {
      if (_sessionUserId) { _stopAnonHeartbeat(); return; }
      if (document.hidden) return;
      _anonTodaySec += 60;
      db.from('anon_sessions').update({
        last_seen_at: new Date().toISOString(), today_seconds: _anonTodaySec
      }).eq('session_key', key).then(() => {}).catch(() => {});
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
      const isNewUser = !selectError && !data;
      const { error: upsertError } = await db.from('profiles').upsert({
        user_id: userId,
        nickname: nickToSave,
        real_name: data?.real_name || realName || null,
        last_seen_at: new Date().toISOString(),
        ...visitCountField,
        ...timeFields,
        ...(data?.photo_url ? { photo_url: data.photo_url } : {}),
        ...(isNewUser ? { first_source: _sessionReferrer || null } : {}),
      }, { onConflict: 'user_id' });
      if (!upsertError && !selectError) {
        const s = window._cottageSess.get(userId);
        s.timeSec = 0;
        window._cottageSess.set(userId, s);
      }
      if (!upsertError && explicitVisitCount !== undefined) {
        const newVisitCount = visitCountField.visit_count;
        window.checkAchievements?.('visit', userId, { visitCount: newVisitCount });
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
      const since = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
      const { data } = await db.from('page_sessions')
        .select('page, referrer, user_id, session_key, duration_sec, entered_at')
        .gte('entered_at', since)
        .order('entered_at', { ascending: false })
        .limit(20000);
      return data || [];
    } catch (_) { return []; }
  }

  async function getEventCounts(eventTypes, daysBack = 7) {
    try {
      const since = new Date(Date.now() - daysBack * 24 * 3600 * 1000).toISOString();
      const { data } = await db.from('page_events')
        .select('event_type, created_at')
        .in('event_type', eventTypes)
        .gte('created_at', since);
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
        reviewCount: reviewRes?.count || 0,
      };
    } catch (_) { return { plays: [], comments: [], suggestions: 0, moimCount: 0, profile: null, reviewCount: 0 }; }
  }


  async function getMyNotifications(userId, nickname, notifSeenAt, newGameSeenAt) {
    if (!userId) return [];
    try {
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
      const oneMinAgo = new Date(Date.now() - 60000).toISOString();
      const newGamePromise = db.from('game_requests')
        .select('id, game_name, added_at, actual_games')
        .not('added_at', 'is', null)
        .lt('added_at', oneMinAgo)
        .order('added_at', { ascending: false })
        .limit(10);
      // 동호회 소개글: 본인 글 존재 여부 + 타인 최근 소개글
      const myIntroPromise = db.from('member_intros').select('id').eq('user_id', userId).limit(1);
      const introListPromise = db.from('member_intros')
        .select('id, nickname, created_at')
        .neq('user_id', userId)
        .not('user_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20);
      const profileSeenPromise = db.from('profiles').select('notif_seen_at').eq('user_id', userId).maybeSingle();
      const _ADMIN_ID = '4916417947';
      const voucherEventsPromise = String(userId) === _ADMIN_ID
        ? db.from('voucher_log').select('id, user_id, delta, reason, created_at').order('created_at', { ascending: false }).limit(30)
        : Promise.resolve({ data: [] });
      const [taggedRes, curiousRes, purchasedRes, newGameRes, myIntroRes, introListRes, profileSeenRes, voucherEventsRes] = await Promise.all([
        taggedPromise, curiousPromise, purchasedPromise, newGamePromise, myIntroPromise, introListPromise, profileSeenPromise, voucherEventsPromise
      ]);
      const dbSeenAt = profileSeenRes?.data?.notif_seen_at || null;
      const effectiveSeenAt = [notifSeenAt, dbSeenAt].filter(Boolean).sort().pop() || null;
      const effectiveNewGameSeenAt = [newGameSeenAt, dbSeenAt].filter(Boolean).sort().pop() || null;
      const notifs = [];
      if (nickname) {
        for (const r of taggedRes.data || []) {
          const names = (r.player_names || '').split(',').map(n => n.trim());
          if (names.some(n => n.toLowerCase() === nickname.toLowerCase())) {
            const date = r.played_at || r.created_at.slice(0, 10);
            const isNew = effectiveSeenAt ? r.created_at > effectiveSeenAt : true;
            notifs.push({ type: 'tagged', gameId: r.game_id, groupName: r.group_name, date, isNew });
          }
        }
      }
      const curiousKeys = (curiousRes.data || []).map(r => r.game_id);
      if (curiousKeys.length > 0) {
        const [{ data: recentComments }, { data: playRecords }] = await Promise.all([
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
        for (const c of recentComments || []) {
          const isNew = effectiveSeenAt ? c.created_at > effectiveSeenAt : true;
          notifs.push({ type: 'curious_comment', gameKey: c.game_key, commenter: c.nickname, date: c.created_at, isNew });
        }
        const seenPlayGameIds = new Set();
        for (const r of playRecords || []) {
          if (seenPlayGameIds.has(r.game_id)) continue;
          seenPlayGameIds.add(r.game_id);
          const isNew = effectiveSeenAt ? r.created_at > effectiveSeenAt : true;
          notifs.push({ type: 'curious_play', gameId: r.game_id, date: r.created_at, isNew });
        }
      }
      for (const r of purchasedRes.data || []) {
        const isNew = effectiveSeenAt ? new Date(r.purchased_at) > new Date(effectiveSeenAt) : true;
        notifs.push({ type: 'ordered', gameName: r.game_name, date: r.purchased_at, isNew });
      }
      for (const r of newGameRes.data || []) {
        const isNew = effectiveNewGameSeenAt ? new Date(r.added_at) > new Date(effectiveNewGameSeenAt) : true;
        const actualGames = Array.isArray(r.actual_games) && r.actual_games.length ? r.actual_games : null;
        notifs.push({ type: 'new_game', gameName: r.game_name, actualGames, date: r.added_at, isNew });
      }
      // 동호회 소개글 알림: 본인 글이 있는 회원에게만, 새 소개글 N개 묶음
      if ((myIntroRes.data || []).length > 0) {
        const allIntros = introListRes.data || [];
        const newIntros = allIntros.filter(r => effectiveSeenAt ? r.created_at > effectiveSeenAt : true);
        if (newIntros.length > 0) {
          notifs.push({
            type: 'new_intro',
            count: newIntros.length,
            names: newIntros.map(r => r.nickname),
            date: newIntros[0].created_at,
            isNew: true,
          });
        } else if (allIntros.length > 0) {
          // 이미 본 소개글 — 최신 1건만 기록용으로 표시
          notifs.push({
            type: 'new_intro',
            count: 1,
            names: [allIntros[0].nickname],
            date: allIntros[0].created_at,
            isNew: false,
          });
        }
      }
      if (String(userId) === _ADMIN_ID) {
        const voucherData = voucherEventsRes.data || [];
        if (voucherData.length > 0) {
          const userIds = [...new Set(voucherData.map(r => r.user_id))];
          const { data: profData } = await db.from('profiles').select('user_id, nickname').in('user_id', userIds);
          const nickMap = Object.fromEntries((profData || []).map(p => [p.user_id, p.nickname || p.user_id]));
          for (const r of voucherData) {
            const isNew = effectiveSeenAt ? r.created_at > effectiveSeenAt : true;
            notifs.push({
              type: r.delta > 0 ? 'voucher_granted' : 'voucher_used',
              nickname: nickMap[r.user_id] || '사용자',
              reason: r.reason,
              delta: r.delta,
              date: r.created_at,
              isNew,
            });
          }
        }
      }
      notifs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      return notifs;
    } catch (_) { return []; }
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
    recordGamePlay,
    deleteGamePlay,
    updateGamePlay,
    getGamePlayCount,
    getPlayHighlights,
    getVisitorStats,
    getPlayReviewsByGame,
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
    getGameLikers,
    getGameCuriousUsers,
    startSession,
    upsertProfile,
    getAllProfiles,
    checkNicknameAvailable,
    getPageAnalytics,
    getEventCounts,
    getMyStats,
    getMyNotifications,
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
    getUserTasteProfile,
    addGamePref,
    removeGamePref,
    getCustomPrefSuggestions,
    updateUserBio,
    updateUserAvoidTags,
    getAllBioTagSuggestions,
    getAllAvoidTagSuggestions,
    getMeetingVotes,
    upsertMeetingVote,
    deleteMeetingVote,
    updateNotifSeenAt,
  };

  async function updateNotifSeenAt(userId, timestamp) {
    if (!userId || !timestamp) return;
    try {
      await db.from('profiles').update({ notif_seen_at: timestamp }).eq('user_id', userId);
    } catch (_) {}
  }

  // 플레이기록 허브용 — 모든 기록 조회 (200건, played_at/created_at 정렬)
  async function getAllPlayRecordsForHub(limit = 200) {
    try {
      const { data } = await db.from('game_play_records')
        .select('id, game_id, user_id, nickname, player_count, player_names, play_time_min, score_note, group_name, played_at, photo_url, review_text, created_at')
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

  // ── 업적/캐릭터 ────────────────────────────────────────────

  async function getUserAchievements(userId) {
    try {
      const { data } = await db.from('user_achievements')
        .select('achievement_id, earned_at')
        .eq('user_id', userId)
        .order('earned_at', { ascending: true });
      return (data || []).map(r => ({ id: r.achievement_id, earned_at: r.earned_at }));
    } catch (_) { return []; }
  }

  async function grantAchievement(userId, achievementId) {
    try {
      const { error } = await db.from('user_achievements').insert({ user_id: userId, achievement_id: achievementId });
      if (error) return false; // 중복이면 UNIQUE 위반 → 조용히 false
      return true;
    } catch (_) { return false; }
  }

  async function setRepAchievement(userId, achievementId) {
    try {
      const { error } = await db.from('profiles').update({ rep_achievement_id: achievementId }).eq('user_id', userId);
      return !error;
    } catch (_) { return false; }
  }

  async function getUserPlayCount(userId) {
    try {
      const { count } = await db.from('game_play_records').select('id', { count: 'exact', head: true }).eq('user_id', userId);
      return count || 0;
    } catch (_) { return 0; }
  }

  async function getUserDistinctGameCount(userId) {
    try {
      const { data } = await db.from('game_play_records').select('game_id').eq('user_id', userId);
      return new Set((data || []).map(r => r.game_id)).size;
    } catch (_) { return 0; }
  }

  async function getUserPlayedGames(userId) {
    try {
      const { data } = await db.from('game_play_records')
        .select('game_id, played_at, created_at')
        .eq('user_id', userId)
        .order('played_at', { ascending: false });
      const seen = new Set();
      return (data || []).filter(r => {
        if (seen.has(r.game_id)) return false;
        seen.add(r.game_id);
        return true;
      });
    } catch (_) { return []; }
  }

  async function getUserPhotoCount(userId) {
    try {
      const { data } = await db.from('game_play_records').select('photo_url').eq('user_id', userId).not('photo_url', 'is', null);
      return (data || []).reduce((s, r) => {
        if (!r.photo_url) return s;
        try {
          const parsed = JSON.parse(r.photo_url);
          return s + (Array.isArray(parsed) ? parsed.length : 1);
        } catch (_) {
          return s + (r.photo_url.trim() ? 1 : 0);
        }
      }, 0);
    } catch (_) { return 0; }
  }

  async function getUserRatingCount(userId) {
    try {
      const { count } = await db.from('game_ratings').select('id', { count: 'exact', head: true }).eq('user_id', userId);
      return count || 0;
    } catch (_) { return 0; }
  }

  async function getUserCommentCount(userId) {
    try {
      const { count } = await db.from('game_comments').select('id', { count: 'exact', head: true }).eq('user_id', userId);
      return count || 0;
    } catch (_) { return 0; }
  }

  async function getUserVisitCount(userId) {
    try {
      const { data } = await db.from('profiles').select('visit_count').eq('user_id', userId).maybeSingle();
      return data?.visit_count || 0;
    } catch (_) { return 0; }
  }

  async function getUserParticipationCount(userId, nickname) {
    if (!nickname) return 0;
    try {
      // 내 닉네임이 player_names에 포함된 기록 수 (내가 쓴 기록 포함)
      const { count } = await db.from('game_play_records')
        .select('id', { count: 'exact', head: true })
        .ilike('player_names', `%${_escapeLike(nickname)}%`);
      return count || 0;
    } catch (_) { return 0; }
  }

  async function getUserFirstRecordCount(userId) {
    try {
      // 내가 작성한 기록들의 game_id를 가져옴
      const { data: myRecords } = await db.from('game_play_records')
        .select('game_id, created_at')
        .eq('user_id', String(userId));
      if (!myRecords || myRecords.length === 0) return 0;

      const myGameIds = [...new Set(myRecords.map(r => r.game_id))];

      // 해당 game_id들의 전체 기록 중 각 game_id별 가장 오래된 기록 조회
      const { data: allRecords } = await db.from('game_play_records')
        .select('game_id, user_id, created_at')
        .in('game_id', myGameIds)
        .order('created_at', { ascending: true })
        .limit(2000);

      if (!allRecords) return 0;

      // game_id별 최초 기록자 추출 (order ascending이므로 첫 번째가 최초)
      const firstByGame = {};
      for (const r of allRecords) {
        if (!firstByGame[r.game_id]) firstByGame[r.game_id] = r;
      }

      return Object.values(firstByGame)
        .filter(r => String(r.user_id) === String(userId))
        .length;
    } catch (_) { return 0; }
  }

  async function getRepAchievement(userId) {
    try {
      const { data } = await db.from('profiles').select('rep_achievement_id').eq('user_id', userId).maybeSingle();
      if (!data?.rep_achievement_id) return null;
      return { id: data.rep_achievement_id };
    } catch (_) { return null; }
  }

  async function setRepTitle(userId, titleId) {
    try {
      const { error } = await db.from('profiles').update({ rep_title_id: titleId || null }).eq('user_id', userId);
      return !error;
    } catch (_) { return false; }
  }

  // ── 음료교환권 ──────────────────────────────────────────────────────────

  // 업적 달성 교환권 지급 (record_1 제외 — grantFirstPlayVoucher 경로 사용)
  // [임시] player_names 텍스트 기반 보조 판정 포함. 닉네임 변경/동명이인/부분매칭 오탐 가능성 있음.
  async function grantAchievementVoucher(userId, achievementId) {
    const _OWNER_ID = '4916417947';
    if (!userId || String(userId) === _OWNER_ID) return false;
    try {
      const { data: existing } = await db.from('voucher_log')
        .select('id').eq('user_id', String(userId)).eq('reason', 'achievement').eq('note', achievementId).maybeSingle();
      if (existing) return false; // JS 1차 방어
      const nickname = window.getKakaoUser?.()?.nickname || null;
      const { error } = await db.from('voucher_log')
        .insert({ user_id: String(userId), delta: 1, reason: 'achievement', note: achievementId, nickname });
      if (error) return false; // partial unique index 위반 포함 — DB 2차 방어
      return true;
    } catch (_) { return false; }
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
      const { data: authorRows } = await db.from('game_play_records')
        .select('played_at, created_at').eq('user_id', userId);
      const dateSet = new Set((authorRows || []).map(toDateStr));
      if (nickname) {
        const { data: participantRows } = await db.from('game_play_records')
          .select('played_at, created_at').ilike('player_names', `%${_escapeLike(nickname)}%`);
        (participantRows || []).forEach(r => dateSet.add(toDateStr(r)));
      }
      return dateSet.size;
    } catch (_) { return 0; }
  }

  async function grantFirstPlayVoucher(userId) {
    const _OWNER_ID = '4916417947';
    if (!userId || String(userId) === _OWNER_ID) return false;
    try {
      const { data: existing } = await db.from('voucher_log')
        .select('id').eq('user_id', String(userId)).eq('reason', 'first_play').maybeSingle();
      if (existing) return false; // JS 1차 방어
      const nickname = window.getKakaoUser?.()?.nickname || null;
      const { error } = await db.from('voucher_log')
        .insert({ user_id: String(userId), delta: 1, reason: 'first_play', nickname });
      if (error) return false; // unique index 위반 포함 — DB 2차 방어
      return true;
    } catch (_) { return false; }
  }

  async function grantDevVoucher(userId) {
    try {
      const { error } = await db.from('voucher_log')
        .insert({ user_id: String(userId), delta: 1, reason: 'dev_test' });
      return !error;
    } catch (_) { return false; }
  }

  async function getVoucherBalance(userId) {
    try {
      const { data } = await db.from('voucher_log')
        .select('delta').eq('user_id', String(userId));
      return (data || []).reduce((sum, r) => sum + r.delta, 0);
    } catch (_) { return 0; }
  }

  async function getVoucherProducts() {
    try {
      const { data } = await db.from('voucher_products')
        .select('id, name, cost').eq('is_active', true).order('id');
      return data || [];
    } catch (_) { return []; }
  }

  async function redeemVoucher(userId, productId) {
    try {
      const { data: product } = await db.from('voucher_products')
        .select('cost, name').eq('id', productId).maybeSingle();
      if (!product) return { ok: false, reason: 'no_product' };
      const balance = await getVoucherBalance(userId);
      if (balance < product.cost) return { ok: false, reason: 'insufficient' };
      const nickname = window.getKakaoUser?.()?.nickname || null;
      const { error } = await db.from('voucher_log')
        .insert({ user_id: String(userId), delta: -product.cost, reason: 'redeem', product_id: productId, nickname, note: product.name });
      if (error) return { ok: false, reason: 'db_error' };
      return { ok: true };
    } catch (_) { return { ok: false, reason: 'error' }; }
  }

  async function getVoucherHistory(userId, limit = 20) {
    try {
      const { data } = await db.from('voucher_log')
        .select('id, delta, reason, created_at, voucher_products(name)')
        .eq('user_id', String(userId))
        .order('created_at', { ascending: false })
        .limit(limit);
      return data || [];
    } catch (_) { return []; }
  }

  // ── 모임 플래너 ────────────────────────────────────────────

  async function getMeetingVotes(startDate, endDate) {
    try {
      const { data } = await db.from('meeting_votes')
        .select('vote_date, user_id, nickname, time_start, time_end')
        .gte('vote_date', startDate)
        .lte('vote_date', endDate)
        .order('vote_date');
      return data || [];
    } catch (_) { return []; }
  }

  async function upsertMeetingVote(userId, nickname, voteDate, timeStart, timeEnd) {
    try {
      const { error } = await db.from('meeting_votes').upsert({
        vote_date: voteDate,
        user_id: String(userId),
        nickname,
        time_start: timeStart,
        time_end: timeEnd,
      }, { onConflict: 'vote_date,user_id' });
      return error ? { error } : { success: true };
    } catch (e) { return { error: e }; }
  }

  async function deleteMeetingVote(userId, voteDate) {
    try {
      const { error } = await db.from('meeting_votes')
        .delete()
        .eq('vote_date', voteDate)
        .eq('user_id', String(userId));
      return error ? { error } : { success: true };
    } catch (e) { return { error: e }; }
  }
})();
