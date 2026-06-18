// 업적/캐릭터/칭호 시스템 V2
// rewards 객체로 보상 정참조. ACH_DEFS는 캐릭터·칭호·교환권 개수와 무관하게 독립 확장 가능.

(function () {
  const ACH_DEFS = [
    // 플레이 기록 작성 계열 — 작성자(user_id) 기준 (1→3→5→8→10→15→20→30→40→50→75→100→125→150→200→250→300→400→500)
    { id: 'rabbit_first',  name: '기록의 시작',        emoji: '🌱', type: 'play', threshold: 1,
      rewards: { character: 'rabbit_first', char_name: '새싹 토끼', voucher: true } },
    { id: 'play_3',        name: '세 번의 기록',        emoji: '🐾', type: 'play', threshold: 3,   rewards: {} },
    { id: 'play_5',        name: '다섯 번의 기록',      emoji: '🐻', type: 'play', threshold: 5,
      rewards: { character: 'bear_10', char_name: '단골 곰' } },
    { id: 'play_8',        name: '코티지의 밤',         emoji: '🌙', type: 'play', threshold: 8,
      rewards: { character: 'rare_night', char_name: '밤의 곰' } },
    { id: 'squirrel_10',   name: '열 번의 기록',        emoji: '🌰', type: 'play', threshold: 10,
      rewards: { character: 'squirrel_10', char_name: '도토리 다람쥐', title: 'title_squirrel_10' } },
    { id: 'play_15',       name: '고수의 길',           emoji: '🐾', type: 'play', threshold: 15,  rewards: {} },
    { id: 'play_20',       name: '스무 번의 기록',      emoji: '🐻', type: 'play', threshold: 20,
      rewards: { character: 'bear_50', char_name: '활발한 곰' } },
    { id: 'bear_30',       name: '서른 번의 기록',      emoji: '🐻', type: 'play', threshold: 30,
      rewards: { character: 'bear_30', char_name: '놀이 곰돌이', title: 'title_bear_30' } },
    { id: 'play_40',       name: '꾸준한 플레이어',     emoji: '🏃', type: 'play', threshold: 40,  rewards: {} },
    { id: 'squirrel_50',   name: '쉰 번의 기록',        emoji: '📦', type: 'play', threshold: 50,
      rewards: { character: 'squirrel_50', char_name: '창고 다람쥐', title: 'title_squirrel_50' } },
    { id: 'play_75',       name: '장인 게이머',          emoji: '⚒️', type: 'play', threshold: 75,  rewards: {} },
    { id: 'squirrel_100',  name: '백 번의 기록',         emoji: '🧺', type: 'play', threshold: 100,
      rewards: { character: 'squirrel_100', char_name: '겨울준비 다람쥐', title: 'title_squirrel_100' } },
    { id: 'play_125',      name: '코티지 베테랑',        emoji: '🏅', type: 'play', threshold: 125, rewards: {} },
    { id: 'bear_100',      name: '백오십 번의 기록',     emoji: '🏠', type: 'play', threshold: 150,
      rewards: { character: 'bear_100', char_name: '코티지 곰', title: 'title_bear_100' } },
    { id: 'squirrel_200',  name: '이백 번의 기록',       emoji: '📖', type: 'play', threshold: 200,
      rewards: { character: 'squirrel_200', char_name: '사서 다람쥐', title: 'title_squirrel_200' } },
    { id: 'play_250',      name: '봄의 전령',            emoji: '🌸', type: 'play', threshold: 250,
      rewards: { character: 'season_spring', char_name: '봄 토끼' } },
    { id: 'bear_300',      name: '삼백 번의 기록',       emoji: '🌙', type: 'play', threshold: 300,
      rewards: { character: 'bear_300', char_name: '동면 곰', title: 'title_bear_300' } },
    { id: 'play_400',      name: '여름의 플레이어',      emoji: '☀️', type: 'play', threshold: 400,
      rewards: { character: 'season_summer', char_name: '여름 곰' } },
    { id: 'cottage_master', name: '코티지 마스터',       emoji: '✨', type: 'play', threshold: 500,
      rewards: { character: 'cottage_master', char_name: '코티지 마스터', title: 'title_cottage_master' } },
    // 새 게임 탐험 계열 — 작성자 기준 (1→3→5→7→10→15→20→30→40→50→75→100→125→150→200→250→300)
    { id: 'new_game_1',    name: '첫 탐험',              emoji: '✨', type: 'new_game', threshold: 1,
      rewards: { character: 'rare_new_game', char_name: '탐험 토끼' } },
    { id: 'new_game_3',    name: '게임 입문',             emoji: '🎮', type: 'new_game', threshold: 3,  rewards: {} },
    { id: 'rabbit_5',      name: '다섯 번째 탐험',        emoji: '🔍', type: 'new_game', threshold: 5,
      rewards: { character: 'rabbit_5', char_name: '호기심 토끼' } },
    { id: 'new_game_7',    name: '다양한 취향',           emoji: '🌈', type: 'new_game', threshold: 7,  rewards: {} },
    { id: 'owl_10',        name: '열 가지 탐험',          emoji: '🦉', type: 'new_game', threshold: 10,
      rewards: { character: 'owl_10', char_name: '탐구 올빼미' } },
    { id: 'new_game_15',   name: '게임 수집가',           emoji: '🎲', type: 'new_game', threshold: 15, rewards: {} },
    { id: 'rabbit_20',     name: '스무 가지 탐험',        emoji: '🎒', type: 'new_game', threshold: 20,
      rewards: { character: 'rabbit_20', char_name: '탐험 토끼', title: 'title_rabbit_20' } },
    { id: 'owl_30',        name: '서른 가지 탐험',        emoji: '🦉', type: 'new_game', threshold: 30,
      rewards: { character: 'owl_30', char_name: '연구 올빼미', title: 'title_owl_30' } },
    { id: 'new_game_40',   name: '게임 전도사',           emoji: '📢', type: 'new_game', threshold: 40, rewards: {} },
    { id: 'rabbit_50',     name: '오십 종 탐험',          emoji: '🧭', type: 'new_game', threshold: 50,
      rewards: { character: 'rabbit_50', char_name: '여행 토끼', title: 'title_rabbit_50' } },
    { id: 'new_game_75',   name: '장르 탐험자',           emoji: '🗺️', type: 'new_game', threshold: 75, rewards: {} },
    { id: 'rabbit_100',    name: '백 종 탐험',            emoji: '🗺️', type: 'new_game', threshold: 100,
      rewards: { character: 'rabbit_100', char_name: '유랑 토끼', title: 'title_rabbit_100' } },
    { id: 'new_game_125',  name: '게임계 여행자',         emoji: '✈️', type: 'new_game', threshold: 125, rewards: {} },
    { id: 'rabbit_200',    name: '백오십 종 탐험',        emoji: '🧳', type: 'new_game', threshold: 150,
      rewards: { character: 'rabbit_200', char_name: '방랑 토끼', title: 'title_rabbit_200' } },
    { id: 'owl_200',       name: '이백 종 탐험',          emoji: '📚', type: 'new_game', threshold: 200,
      rewards: { character: 'owl_100', char_name: '박학 올빼미', title: 'title_owl_200' } },
    { id: 'new_game_250',  name: '핼러윈 수집가',         emoji: '🎃', type: 'new_game', threshold: 250,
      rewards: { character: 'season_halloween', char_name: '핼러윈 올빼미' } },
    { id: 'owl_300',       name: '삼백 종 탐험',          emoji: '🦉', type: 'new_game', threshold: 300,
      rewards: { character: 'owl_300', char_name: '전설 올빼미', title: 'title_owl_300' } },
    // 사진 계열 (1→2→3→5→10→20→30→50→75→100→150→200)
    { id: 'hedgehog_1',    name: '첫 사진',               emoji: '📸', type: 'photo', threshold: 1,
      rewards: { character: 'hedgehog_1', char_name: '초보 고슴도치', title: 'title_hedgehog_1' } },
    { id: 'photo_2',       name: '두 번째 사진',           emoji: '📸', type: 'photo', threshold: 2,  rewards: {} },
    { id: 'photo_3',       name: '세 번의 추억',           emoji: '✨', type: 'photo', threshold: 3,
      rewards: { character: 'rare_first_record', char_name: '기록 고슴도치' } },
    { id: 'photo_5',       name: '사진사 지망생',          emoji: '🤳', type: 'photo', threshold: 5,  rewards: {} },
    { id: 'photo_10',      name: '순간 수집',              emoji: '🖼️', type: 'photo', threshold: 10, rewards: {} },
    { id: 'hedgehog_10',   name: '스무 장의 기록',         emoji: '🎞️', type: 'photo', threshold: 20,
      rewards: { character: 'hedgehog_10', char_name: '기록가 고슴도치', title: 'title_hedgehog_10' } },
    { id: 'photo_30',      name: '사진 작가',              emoji: '📷', type: 'photo', threshold: 30, rewards: {} },
    { id: 'photo_50',      name: '기억 포착',              emoji: '🎞️', type: 'photo', threshold: 50, rewards: {} },
    { id: 'photo_75',      name: '필름 요정',              emoji: '🧚', type: 'photo', threshold: 75, rewards: {} },
    { id: 'hedgehog_50',   name: '백 장의 기억',           emoji: '📷', type: 'photo', threshold: 100,
      rewards: { character: 'hedgehog_50', char_name: '포토마스터 고슴도치', title: 'title_hedgehog_50' } },
    { id: 'photo_150',     name: '사진 마스터',            emoji: '🎨', type: 'photo', threshold: 150, rewards: {} },
    { id: 'hedgehog_100',  name: '이백 장의 추억',         emoji: '🎨', type: 'photo', threshold: 200,
      rewards: { character: 'hedgehog_100', char_name: '작가 고슴도치', title: 'title_hedgehog_100' } },
    // 게임평 계열 (1→2→3→5→8→10→15→20→25→40→50→75→100→150→200→300)
    { id: 'hamster_1',     name: '첫 게임평',             emoji: '✏️', type: 'review', threshold: 1,
      rewards: { character: 'hamster_1', char_name: '리뷰어 햄스터', title: 'title_hamster_1' } },
    { id: 'review_2',      name: '첫 분석',               emoji: '🔍', type: 'review', threshold: 2,  rewards: {} },
    { id: 'review_3',      name: '감상 시작',             emoji: '✍️', type: 'review', threshold: 3,  rewards: {} },
    { id: 'fox_5',         name: '다섯 번의 감상',        emoji: '🦊', type: 'review', threshold: 5,
      rewards: { character: 'fox_10', char_name: '감상 여우' } },
    { id: 'review_8',      name: '번개 리뷰어',           emoji: '⚡', type: 'review', threshold: 8,
      rewards: { character: 'rare_lightning', char_name: '번개 햄스터' } },
    { id: 'hamster_10',    name: '열 번의 감상',          emoji: '📝', type: 'review', threshold: 10,
      rewards: { character: 'hamster_10', char_name: '서평가 햄스터', title: 'title_hamster_10' } },
    { id: 'review_15',     name: '이야기꾼',              emoji: '✨', type: 'review', threshold: 15,
      rewards: { character: 'rare_storyteller', char_name: '이야기꾼 토끼' } },
    { id: 'review_20',     name: '코티지 논객',           emoji: '🗣️', type: 'review', threshold: 20, rewards: {} },
    { id: 'fox_25',        name: '스물다섯 감상',         emoji: '🦊', type: 'review', threshold: 25,
      rewards: { character: 'fox_30', char_name: '취향 여우', title: 'title_fox_25' } },
    { id: 'review_40',     name: '리뷰 마니아',           emoji: '📋', type: 'review', threshold: 40, rewards: {} },
    { id: 'hamster_50',    name: '쉰 번의 감상',          emoji: '📚', type: 'review', threshold: 50,
      rewards: { character: 'hamster_50', char_name: '평론가 햄스터', title: 'title_hamster_50' } },
    { id: 'review_75',     name: '비평 전문가',           emoji: '🎓', type: 'review', threshold: 75, rewards: {} },
    { id: 'hamster_100',   name: '백 번의 감상',          emoji: '🎓', type: 'review', threshold: 100,
      rewards: { character: 'hamster_100', char_name: '비평가 햄스터', title: 'title_hamster_100' } },
    { id: 'hamster_200',   name: '백오십 번의 감상',      emoji: '🏆', type: 'review', threshold: 150,
      rewards: { character: 'hamster_300', char_name: '마스터 햄스터', title: 'title_hamster_200' } },
    { id: 'review_200',    name: '이백 번의 감상',        emoji: '🦊', type: 'review', threshold: 200,
      rewards: { character: 'fox_100', char_name: '박식한 여우' } },
    { id: 'fox_300',       name: '삼백 번의 감상',        emoji: '🦊', type: 'review', threshold: 300,
      rewards: { character: 'fox_300', char_name: '코티지 여우', title: 'title_fox_300' } },
    // 방문 계열 (3→5→10→15→20→25→30→40→50→75→100→150→200→300→400→500)
    { id: 'visit_3',   name: '코티지 방문객',  emoji: '✨', type: 'visit', threshold: 3,
      rewards: { character: 'rare_friend', char_name: '방문 참새' } },
    { id: 'visit_5',   name: '코티지 친구',    emoji: '🤗', type: 'visit', threshold: 5,  rewards: {} },
    { id: 'visit_10',  name: '코티지 단골',    emoji: '☕', type: 'visit', threshold: 10,
      rewards: { character: 'sparrow_10', char_name: '단골 참새', title: 'title_visit_10' } },
    { id: 'visit_15',  name: '코티지 팬',      emoji: '💙', type: 'visit', threshold: 15, rewards: {} },
    { id: 'visit_20',  name: '코티지 단골 Lv2', emoji: '☕', type: 'visit', threshold: 20, rewards: {} },
    { id: 'visit_25',  name: '코티지의 기둥',  emoji: '🏛️', type: 'visit', threshold: 25, rewards: {} },
    { id: 'visit_30',  name: '코티지 이웃',    emoji: '🏡', type: 'visit', threshold: 30,
      rewards: { title: 'title_visit_30' } },
    { id: 'visit_40',  name: '오랜 인연',       emoji: '🤝', type: 'visit', threshold: 40, rewards: {} },
    { id: 'visit_50',  name: '코티지 주민',     emoji: '🔥', type: 'visit', threshold: 50,
      rewards: { character: 'sparrow_50', char_name: '주민 참새', title: 'title_visit_50' } },
    { id: 'visit_75',  name: '코티지 충성단',   emoji: '⚔️', type: 'visit', threshold: 75, rewards: {} },
    { id: 'visit_100', name: '터줏대감',        emoji: '🌳', type: 'visit', threshold: 100,
      rewards: { title: 'title_visit_100' } },
    { id: 'visit_150', name: '코티지 수호자',   emoji: '🛡️', type: 'visit', threshold: 150, rewards: {} },
    { id: 'visit_200', name: '코티지의 오랜 친구', emoji: '🐦', type: 'visit', threshold: 200,
      rewards: { character: 'sparrow_200', char_name: '코티지 참새', title: 'title_visit_200' } },
    { id: 'visit_300', name: '코티지 원로',     emoji: '👑', type: 'visit', threshold: 300,
      rewards: { title: 'title_visit_300' } },
    { id: 'visit_400', name: '코티지의 산타',   emoji: '🎄', type: 'visit', threshold: 400,
      rewards: { character: 'season_christmas', char_name: '산타 참새' } },
    { id: 'visit_500', name: '전설의 방문자',   emoji: '🐦', type: 'visit', threshold: 500,
      rewards: { character: 'sparrow_1000', char_name: '전설 참새', title: 'title_visit_500' } },
    // 코티지 최초 기록 계열 — 해당 game_id 최초 기록 작성자 기준 (1→3→5→10→20→50)
    { id: 'first_record_1',  name: '첫 개척',         emoji: '🗺️', type: 'first_record', threshold: 1,  rewards: {} },
    { id: 'first_record_3',  name: '세 게임 개척',    emoji: '⛺', type: 'first_record', threshold: 3,  rewards: {} },
    { id: 'first_record_5',  name: '다섯 게임 개척',  emoji: '🧭', type: 'first_record', threshold: 5,  rewards: {} },
    { id: 'first_record_10', name: '개척자',           emoji: '🌟', type: 'first_record', threshold: 10, rewards: {} },
    { id: 'first_record_20', name: '코티지 개척단',   emoji: '🏅', type: 'first_record', threshold: 20, rewards: {} },
    { id: 'first_record_50', name: '전설의 개척자',   emoji: '✨', type: 'first_record', threshold: 50, rewards: {} },
    // 플레이 참여 계열 — 보조 업적, player_names 닉네임 기반 (닉네임 변경 시 과거 기록 누락 가능) — 5→10→20→30→50→100→150→200→300→500
    { id: 'participated_5',   name: '게임 친구',       emoji: '🤝', type: 'participated', threshold: 5,   rewards: {} },
    { id: 'participated_10',  name: '활발한 참여자',   emoji: '🎮', type: 'participated', threshold: 10,  rewards: {} },
    { id: 'participated_20',  name: '게임 동반자',     emoji: '🎲', type: 'participated', threshold: 20,  rewards: {} },
    { id: 'participated_30',  name: '코티지 플레이어', emoji: '🎯', type: 'participated', threshold: 30,  rewards: {} },
    { id: 'participated_50',  name: '코티지 피플',     emoji: '🌟', type: 'participated', threshold: 50,  rewards: {} },
    { id: 'participated_100', name: '백전노장',         emoji: '🏆', type: 'participated', threshold: 100, rewards: {} },
    { id: 'participated_150', name: '코티지 레전드',   emoji: '⚜️', type: 'participated', threshold: 150, rewards: {} },
    { id: 'participated_200', name: '게임왕',           emoji: '👑', type: 'participated', threshold: 200, rewards: {} },
    { id: 'participated_300', name: '코티지 신화',     emoji: '🌙', type: 'participated', threshold: 300, rewards: {} },
    { id: 'participated_500', name: '전설의 게이머',   emoji: '✨', type: 'participated', threshold: 500, rewards: {} },
  ];

  // 칭호 정의 — 연결 관계는 ACH_DEFS.rewards.title이 담당 (역참조 필드 없음)
  const TITLE_DEFS = [
    // 플레이 계열
    { id: 'title_squirrel_10',   name: '첫 페이지',          emoji: '📝', rarity: '일반' },
    { id: 'title_bear_30',       name: '놀이쟁이',           emoji: '🐻', rarity: '일반' },
    { id: 'title_squirrel_50',   name: '이야기 수집가',      emoji: '📖', rarity: '고급' },
    { id: 'title_squirrel_100',  name: '코티지 연대기 작가', emoji: '📚', rarity: '희귀' },
    { id: 'title_bear_100',      name: '코티지 단골손님',    emoji: '🏠', rarity: '고급' },
    { id: 'title_squirrel_200',  name: '코티지 사서',        emoji: '🏛', rarity: '전설' },
    { id: 'title_bear_300',      name: '코티지 골수팬',      emoji: '💪', rarity: '희귀' },
    { id: 'title_cottage_master', name: '코티지 마스터',     emoji: '✨', rarity: '전설' },
    // 새 게임 탐험 계열
    { id: 'title_rabbit_20',     name: '탐험가',             emoji: '🗺', rarity: '일반' },
    { id: 'title_owl_30',        name: '게임 사냥꾼',        emoji: '🎯', rarity: '일반' },
    { id: 'title_rabbit_50',     name: '개척자',             emoji: '⛺', rarity: '희귀' },
    { id: 'title_rabbit_100',    name: '코티지 유랑자',      emoji: '🚂', rarity: '전설' },
    { id: 'title_rabbit_200',    name: '게임 방랑자',        emoji: '🧳', rarity: '고급' },
    { id: 'title_owl_200',       name: '게임 학자',          emoji: '📚', rarity: '희귀' },
    { id: 'title_owl_300',       name: '전설 탐험가',        emoji: '🗺', rarity: '전설' },
    // 사진 계열
    { id: 'title_hedgehog_1',    name: '첫 셔터',            emoji: '📸', rarity: '일반' },
    { id: 'title_hedgehog_10',   name: '순간 수집가',        emoji: '🎞', rarity: '고급' },
    { id: 'title_hedgehog_50',   name: '기억 포착자',        emoji: '📷', rarity: '희귀' },
    { id: 'title_hedgehog_100',  name: '코티지 사진사',      emoji: '🎨', rarity: '전설' },
    // 게임평 계열
    { id: 'title_hamster_1',     name: '첫 감상가',          emoji: '✍', rarity: '일반' },
    { id: 'title_hamster_10',    name: '취향 기록자',        emoji: '📖', rarity: '고급' },
    { id: 'title_fox_25',        name: '취향 분석가',        emoji: '🔍', rarity: '일반' },
    { id: 'title_hamster_50',    name: '코티지 안내자',      emoji: '📚', rarity: '희귀' },
    { id: 'title_hamster_100',   name: '코티지 큐레이터',    emoji: '🏛', rarity: '전설' },
    { id: 'title_hamster_200',   name: '코티지 비평가',      emoji: '🖊', rarity: '고급' },
    { id: 'title_fox_300',       name: '전설의 리뷰어',      emoji: '🏅', rarity: '전설' },
    // 방문 계열
    { id: 'title_visit_10',  name: '코티지 단골',    emoji: '☕', rarity: '일반' },
    { id: 'title_visit_30',  name: '코티지 이웃',    emoji: '🏡', rarity: '고급' },
    { id: 'title_visit_50',  name: '코티지 주민',    emoji: '🔥', rarity: '희귀' },
    { id: 'title_visit_100', name: '터줏대감',       emoji: '🌳', rarity: '영웅' },
    { id: 'title_visit_200', name: '오랜 친구',      emoji: '🤝', rarity: '고급' },
    { id: 'title_visit_300', name: '코티지 원로',    emoji: '👑', rarity: '전설' },
    { id: 'title_visit_500', name: '코티지 전설',    emoji: '🌟', rarity: '전설' },
  ];

  // titleId → achId 역방향 맵 (빌드 시 1회 생성)
  const _titleToAchId = {};
  ACH_DEFS.forEach(d => { if (d.rewards?.title) _titleToAchId[d.rewards.title] = d.id; });

  // 캐릭터 보상 있는 업적만 (buildCharacterSection 그리드용)
  const CHAR_DEFS = ACH_DEFS.filter(d => d.rewards?.character);

  // 도감 등급표
  const CODEX_GRADES = [
    { min: 100, label: '👑 코티지 마스터' },
    { min: 80,  label: '🏛️ 게임 큐레이터' },
    { min: 60,  label: '📚 게임학자' },
    { min: 40,  label: '🚂 유랑자' },
    { min: 20,  label: '⛺ 개척자' },
    { min: 10,  label: '🗺️ 탐험가' },
    { min: 5,   label: '🍀 입문자' },
    { min: 0,   label: '🌱 새싹' },
  ];

  function getCodexGrade(pct) {
    for (const g of CODEX_GRADES) if (pct >= g.min) return g.label;
    return '🌱 새싹';
  }

  const TYPE_LABELS = { play: '기록 작성', new_game: '새 게임', photo: '사진', review: '게임평', visit: '방문', first_record: '코티지 최초 기록', participated: '플레이 참여 (보조)' };
  const SHORT_TYPE_LABELS = { play: '기록 작성', new_game: '새 게임', photo: '사진', review: '게임평', visit: '방문', first_record: '최초 기록', participated: '참여' };

  const POINTS = {
    // 플레이
    rabbit_first: 300, play_3: 100, play_5: 200, play_8: 300,
    squirrel_10: 500, play_15: 300, play_20: 500, bear_30: 500, play_40: 500,
    squirrel_50: 1000, play_75: 1000, squirrel_100: 2000, play_125: 1000,
    bear_100: 1500, squirrel_200: 5000, play_250: 2000, bear_300: 3000,
    play_400: 3000, cottage_master: 10000,
    // 새 게임
    new_game_1: 200, new_game_3: 100, rabbit_5: 300, new_game_7: 200,
    owl_10: 300, new_game_15: 300, rabbit_20: 1000, owl_30: 500,
    new_game_40: 500, rabbit_50: 2000, new_game_75: 1000, rabbit_100: 3000,
    new_game_125: 1000, rabbit_200: 2500, owl_200: 3000, new_game_250: 2000, owl_300: 5000,
    // 사진
    hedgehog_1: 300, photo_2: 100, photo_3: 300, photo_5: 200,
    photo_10: 300, hedgehog_10: 500, photo_30: 500, photo_50: 500,
    photo_75: 1000, hedgehog_50: 1000, photo_150: 1000, hedgehog_100: 3000,
    // 게임평
    hamster_1: 300, review_2: 100, review_3: 100, fox_5: 300, review_8: 300,
    hamster_10: 500, review_15: 500, review_20: 500, fox_25: 500, review_40: 500,
    hamster_50: 1000, review_75: 1000, hamster_100: 2000, hamster_200: 2500,
    review_200: 2000, fox_300: 5000,
    // 방문
    visit_3: 200, visit_5: 200, visit_10: 300, visit_15: 300,
    visit_20: 300, visit_25: 300, visit_30: 500, visit_40: 500,
    visit_50: 1000, visit_75: 1000, visit_100: 2000, visit_150: 1000,
    visit_200: 3000, visit_300: 5000, visit_400: 3000, visit_500: 10000,
    // 코티지 최초 기록
    first_record_1: 300, first_record_3: 500, first_record_5: 800,
    first_record_10: 1500, first_record_20: 3000, first_record_50: 8000,
    // 참여 (보조)
    participated_5: 200, participated_10: 300, participated_20: 500, participated_30: 500,
    participated_50: 1000, participated_100: 2000, participated_150: 1500,
    participated_200: 3000, participated_300: 5000, participated_500: 10000,
  };

  // 업적 체크 진입점 — supabase-client.js에서 호출
  async function checkAchievements(category, userId, opts = {}) {
    if (!userId || !window.CottageDB) return;
    const db = window.CottageDB;

    const [playCount, distinctCount, photoCount, ratingCount] = await Promise.all([
      (category === 'play' || category === 'review') ? db.getUserPlayCount(userId) : Promise.resolve(null),
      category === 'play' ? db.getUserDistinctGameCount(userId) : Promise.resolve(null),
      category === 'play' ? db.getUserPhotoCount(userId) : Promise.resolve(null),
      category === 'review' ? db.getUserRatingCount(userId) : Promise.resolve(null),
    ]);

    const checks = [];

    if (category === 'play') {
      checks.push(
        { id: 'rabbit_first', v: playCount, t: 1 },
        { id: 'play_3',       v: playCount, t: 3 },
        { id: 'play_5',       v: playCount, t: 5 },
        { id: 'play_8',       v: playCount, t: 8 },
        { id: 'squirrel_10',  v: playCount, t: 10 },
        { id: 'play_15',      v: playCount, t: 15 },
        { id: 'play_20',      v: playCount, t: 20 },
        { id: 'bear_30',      v: playCount, t: 30 },
        { id: 'play_40',      v: playCount, t: 40 },
        { id: 'squirrel_50',  v: playCount, t: 50 },
        { id: 'play_75',      v: playCount, t: 75 },
        { id: 'squirrel_100', v: playCount, t: 100 },
        { id: 'play_125',     v: playCount, t: 125 },
        { id: 'bear_100',     v: playCount, t: 150 },
        { id: 'squirrel_200', v: playCount, t: 200 },
        { id: 'play_250',     v: playCount, t: 250 },
        { id: 'bear_300',     v: playCount, t: 300 },
        { id: 'play_400',     v: playCount, t: 400 },
        { id: 'cottage_master', v: playCount, t: 500 },
        { id: 'new_game_1',   v: distinctCount, t: 1 },
        { id: 'new_game_3',   v: distinctCount, t: 3 },
        { id: 'rabbit_5',     v: distinctCount, t: 5 },
        { id: 'new_game_7',   v: distinctCount, t: 7 },
        { id: 'owl_10',       v: distinctCount, t: 10 },
        { id: 'new_game_15',  v: distinctCount, t: 15 },
        { id: 'rabbit_20',    v: distinctCount, t: 20 },
        { id: 'owl_30',       v: distinctCount, t: 30 },
        { id: 'new_game_40',  v: distinctCount, t: 40 },
        { id: 'rabbit_50',    v: distinctCount, t: 50 },
        { id: 'new_game_75',  v: distinctCount, t: 75 },
        { id: 'rabbit_100',   v: distinctCount, t: 100 },
        { id: 'new_game_125', v: distinctCount, t: 125 },
        { id: 'rabbit_200',   v: distinctCount, t: 150 },
        { id: 'owl_200',      v: distinctCount, t: 200 },
        { id: 'new_game_250', v: distinctCount, t: 250 },
        { id: 'owl_300',      v: distinctCount, t: 300 },
        { id: 'hedgehog_1',   v: photoCount, t: 1 },
        { id: 'photo_2',      v: photoCount, t: 2 },
        { id: 'photo_3',      v: photoCount, t: 3 },
        { id: 'photo_5',      v: photoCount, t: 5 },
        { id: 'photo_10',     v: photoCount, t: 10 },
        { id: 'hedgehog_10',  v: photoCount, t: 20 },
        { id: 'photo_30',     v: photoCount, t: 30 },
        { id: 'photo_50',     v: photoCount, t: 50 },
        { id: 'photo_75',     v: photoCount, t: 75 },
        { id: 'hedgehog_50',  v: photoCount, t: 100 },
        { id: 'photo_150',    v: photoCount, t: 150 },
        { id: 'hedgehog_100', v: photoCount, t: 200 },
      );
    }

    if (category === 'review') {
      checks.push(
        { id: 'hamster_1',   v: ratingCount, t: 1 },
        { id: 'review_2',    v: ratingCount, t: 2 },
        { id: 'review_3',    v: ratingCount, t: 3 },
        { id: 'fox_5',       v: ratingCount, t: 5 },
        { id: 'review_8',    v: ratingCount, t: 8 },
        { id: 'hamster_10',  v: ratingCount, t: 10 },
        { id: 'review_15',   v: ratingCount, t: 15 },
        { id: 'review_20',   v: ratingCount, t: 20 },
        { id: 'fox_25',      v: ratingCount, t: 25 },
        { id: 'review_40',   v: ratingCount, t: 40 },
        { id: 'hamster_50',  v: ratingCount, t: 50 },
        { id: 'review_75',   v: ratingCount, t: 75 },
        { id: 'hamster_100', v: ratingCount, t: 100 },
        { id: 'hamster_200', v: ratingCount, t: 150 },
        { id: 'review_200',  v: ratingCount, t: 200 },
        { id: 'fox_300',     v: ratingCount, t: 300 },
      );
    }

    if (category === 'visit') {
      const vc = opts.visitCount || 0;
      checks.push(
        { id: 'visit_3',   v: vc, t: 3 },
        { id: 'visit_5',   v: vc, t: 5 },
        { id: 'visit_10',  v: vc, t: 10 },
        { id: 'visit_15',  v: vc, t: 15 },
        { id: 'visit_20',  v: vc, t: 20 },
        { id: 'visit_25',  v: vc, t: 25 },
        { id: 'visit_30',  v: vc, t: 30 },
        { id: 'visit_40',  v: vc, t: 40 },
        { id: 'visit_50',  v: vc, t: 50 },
        { id: 'visit_75',  v: vc, t: 75 },
        { id: 'visit_100', v: vc, t: 100 },
        { id: 'visit_150', v: vc, t: 150 },
        { id: 'visit_200', v: vc, t: 200 },
        { id: 'visit_300', v: vc, t: 300 },
        { id: 'visit_400', v: vc, t: 400 },
        { id: 'visit_500', v: vc, t: 500 },
      );
    }

    if (category === 'first_record') {
      const frc = opts.firstRecordCount || 0;
      checks.push(
        { id: 'first_record_1',  v: frc, t: 1 },
        { id: 'first_record_3',  v: frc, t: 3 },
        { id: 'first_record_5',  v: frc, t: 5 },
        { id: 'first_record_10', v: frc, t: 10 },
        { id: 'first_record_20', v: frc, t: 20 },
        { id: 'first_record_50', v: frc, t: 50 },
      );
    }

    if (category === 'participated') {
      const pc = opts.participationCount || 0;
      checks.push(
        { id: 'participated_5',   v: pc, t: 5 },
        { id: 'participated_10',  v: pc, t: 10 },
        { id: 'participated_20',  v: pc, t: 20 },
        { id: 'participated_30',  v: pc, t: 30 },
        { id: 'participated_50',  v: pc, t: 50 },
        { id: 'participated_100', v: pc, t: 100 },
        { id: 'participated_150', v: pc, t: 150 },
        { id: 'participated_200', v: pc, t: 200 },
        { id: 'participated_300', v: pc, t: 300 },
        { id: 'participated_500', v: pc, t: 500 },
      );
    }

    const achieved = checks.filter(c => c.v !== null && c.v >= c.t);
    if (!achieved.length) return;

    for (const { id } of achieved) {
      const def = ACH_DEFS.find(d => d.id === id);
      const granted = await db.grantAchievement(userId, id, POINTS[id] || 0);
      if (granted) {
        showAchievementToast(def?.name || id, POINTS[id] || 0);
        if (id === 'rabbit_first') {
          const currentRep = await db.getRepAchievement?.(userId).catch(() => null);
          if (!currentRep?.id) {
            await db.setRepAchievement?.(userId, 'rabbit_first').catch(() => {});
            const menuImg = document.getElementById('kakaoProfileImg');
            if (menuImg) menuImg.src = '/assets/images/characters/characters_basic/rabbit_first.png';
          }
        }
      }
    }
  }

  // 달성 토스트
  function showAchievementToast(name, points) {
    const existing = document.getElementById('achievementToast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'achievementToast';
    toast.className = 'achievement-toast';
    toast.innerHTML = `
      <div class="achievement-toast-icon">🏆</div>
      <div class="achievement-toast-body">
        <div class="achievement-toast-title">캐릭터 해금!</div>
        <div class="achievement-toast-name">${name}</div>
      </div>
      <a class="achievement-toast-link" href="#" onclick="event.preventDefault();document.querySelector('#kakaoProfileBtn')?.click()">내 보드 →</a>
    `;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('is-visible'));
    setTimeout(() => {
      toast.classList.remove('is-visible');
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  }

  function getGameName(gameId) {
    if (!gameId) return String(gameId);
    if (window.gameData?.[gameId]) {
      const g = window.gameData[gameId];
      return g.display || g.titleKo || g.titleEn || String(gameId);
    }
    if (window.COTTAGE_GAMES) {
      const g = window.COTTAGE_GAMES.find(g => String(g.bggId) === String(gameId));
      if (g) return g.display || g.titleKo || g.titleEn || String(gameId);
    }
    return String(gameId);
  }

  // 칭호 섹션 HTML 빌드 — { html, earnedIds } 반환
  async function buildTitleSection(userId, repTitleId, visitCount, nickname) {
    const db = window.CottageDB;
    if (!db) return { html: '', earnedIds: new Set() };
    try {
      const [achievements, playCount, distinctCount, photoCount, ratingCount, participationCount, firstRecordCount] = await Promise.all([
        db.getUserAchievements(userId),
        db.getUserPlayCount(userId),
        db.getUserDistinctGameCount(userId),
        db.getUserPhotoCount(userId),
        db.getUserRatingCount(userId),
        nickname ? db.getUserParticipationCount(userId, nickname) : Promise.resolve(0),
        db.getUserFirstRecordCount(userId),
      ]);
      const earnedAchIds = new Set(achievements.map(a => a.id));
      const vc = Number(visitCount) || 0;
      const COUNTS = { play: playCount, new_game: distinctCount, photo: photoCount, review: ratingCount, visit: vc, first_record: firstRecordCount, participated: participationCount };

      // ACH_DEFS.rewards.title 정참조 기준으로 획득 여부 판단
      const earnedIds = new Set();
      TITLE_DEFS.forEach(def => {
        const achId = _titleToAchId[def.id];
        if (achId && earnedAchIds.has(achId)) earnedIds.add(def.id);
      });

      const RARITY_COLOR = { '일반': '#888', '고급': '#4caf50', '희귀': '#2196f3', '영웅': '#9c27b0', '전설': '#ff9800' };

      const cards = TITLE_DEFS.map(def => {
        const earned = earnedIds.has(def.id);
        const isRep = earned && repTitleId === def.id;
        let cls = 'profile-title-card';
        if (!earned) cls += ' is-locked';
        if (isRep) cls += ' is-rep';
        const rarityColor = RARITY_COLOR[def.rarity] || '#888';

        let progressHtml = '';
        const _pAchId = _titleToAchId[def.id];
        const _pAchDef = _pAchId ? ACH_DEFS.find(a => a.id === _pAchId) : null;
        if (_pAchDef) {
          const cur = COUNTS[_pAchDef.type] || 0;
          progressHtml = `<span class="profile-title-progress">${cur}/${_pAchDef.threshold}</span>`;
        }

        return `<button class="${cls}" data-title-id="${def.id}" data-earned="${earned}" type="button">` +
          `<span class="profile-title-emoji">${def.emoji}</span>` +
          `<span class="profile-title-name">${def.name}</span>` +
          `<span class="profile-title-rarity" style="color:${rarityColor}">${earned ? def.rarity : '???'}</span>` +
          `${progressHtml}` +
          `</button>`;
      }).join('');

      const repActionHtml = earnedIds.size
        ? `<div class="profile-title-action-row" id="profileTitleActionRow" data-user-id="${userId}" data-orig-rep-id="${repTitleId || ''}" style="display:none">` +
          `<button class="profile-title-change-btn" type="button">변경</button>` +
          `<button class="profile-title-cancel-btn" type="button">취소</button>` +
          `</div>`
        : '';

      const _earnedTitleList = TITLE_DEFS.filter(t => earnedIds.has(t.id));
      const _unearnedTitleList = TITLE_DEFS.filter(t => !earnedIds.has(t.id));
      let _titlePreviewHtml = '';
      if (_earnedTitleList.length > 0) {
        const _shown = _earnedTitleList.slice(-3);
        _titlePreviewHtml = `<div class="profile-section-preview">${_shown.map(t => `${t.emoji} ${t.name}`).join(' · ')}</div>`;
      } else if (_unearnedTitleList.length > 0) {
        const _nt = _unearnedTitleList[0];
        const _ntAchId = _titleToAchId[_nt.id];
        const _ntAchDef = _ntAchId ? ACH_DEFS.find(a => a.id === _ntAchId) : null;
        const _ntCur = _ntAchDef ? (COUNTS[_ntAchDef.type] || 0) : 0;
        _titlePreviewHtml = `<div class="profile-section-preview">다음: ${_nt.emoji} ${_nt.name} (${_ntAchDef ? `${SHORT_TYPE_LABELS[_ntAchDef.type] || _ntAchDef.type} ${_ntCur}/${_ntAchDef.threshold}` : ''})</div>`;
      }

      const html = `<div class="profile-title-section" data-earned-count="${earnedIds.size}" data-title-total="${TITLE_DEFS.length}">` +
        `<div class="profile-title-header">🏷 칭호 <span class="profile-title-count">${earnedIds.size} / ${TITLE_DEFS.length}종</span>` +
        `<button class="profile-title-toggle-btn" type="button">전체 보기 ▾</button></div>` +
        `${_titlePreviewHtml}` +
        `<div class="profile-title-body is-hidden">` +
        `${earnedIds.size === 0 ? '<p class="profile-title-empty">칭호를 획득하려면 업적을 달성해보세요 🏷</p>' : ''}` +
        `<div class="profile-title-grid">${cards}</div>` +
        `${repActionHtml}` +
        `</div></div>`;

      return { html, earnedIds };
    } catch (_) { return { html: '', earnedIds: new Set() }; }
  }

  // 대표 칭호 변경 핸들러
  async function handleRepTitleSelect(userId, titleId, origId, titleBody) {
    if (!userId || !titleId) return;
    const ok = await window.CottageDB?.setRepTitle?.(userId, titleId);
    if (ok === false) {
      console.warn('[CottageAchievements] 대표 칭호 저장 실패');
      titleBody.querySelectorAll('.profile-title-card').forEach(c => c.classList.remove('is-selected'));
      if (origId) titleBody.querySelector(`.profile-title-card[data-title-id="${origId}"]`)?.classList.add('is-selected');
    } else {
      titleBody.querySelectorAll('.profile-title-card').forEach(c => c.classList.remove('is-rep', 'is-selected'));
      if (titleId) titleBody.querySelector(`.profile-title-card[data-title-id="${titleId}"]`)?.classList.add('is-rep');
      const actionRow = titleBody.querySelector('#profileTitleActionRow');
      if (actionRow) { actionRow.style.display = 'none'; actionRow.dataset.origRepId = titleId || ''; }
      const titleDef = TITLE_DEFS.find(t => t.id === titleId);
      const panelTitleEl = document.querySelector('#profilePanel .profile-panel-title-name');
      if (panelTitleEl && titleDef) panelTitleEl.textContent = `${titleDef.emoji} ${titleDef.name}`;
    }
  }

  // 게임 도감 섹션 HTML 빌드
  async function buildCodexSection(userId) {
    const db = window.CottageDB;
    if (!db) return '';

    const [playedGames] = await Promise.all([
      db.getUserPlayedGames(userId),
    ]);

    const totalGames = window.gameData ? Object.keys(window.gameData).length : 0;
    const playedCount = playedGames.length;
    const pct = totalGames > 0 ? Math.round((playedCount / totalGames) * 100) : 0;
    const grade = getCodexGrade(pct);
    const barWidth = Math.min(pct, 100);

    const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    const PREVIEW = 3;
    const previewGames = playedGames.slice(0, PREVIEW);
    const restGames = playedGames.slice(PREVIEW);

    const previewHtml = previewGames.map(r =>
      `<li class="profile-codex-game-item">✅ ${esc(getGameName(r.game_id))}</li>`
    ).join('');

    const restHtml = restGames.length
      ? `<div class="profile-codex-more-wrap is-hidden">
          <ul class="profile-codex-game-list">${restGames.map(r =>
            `<li class="profile-codex-game-item">✅ ${esc(getGameName(r.game_id))}</li>`
          ).join('')}</ul>
        </div>
        <button class="profile-codex-more-btn" type="button">전체 보기 (${restGames.length}개 더) ▾</button>`
      : '';

    const listHtml = playedCount
      ? `<div class="profile-codex-list-section">
          <ul class="profile-codex-game-list">${previewHtml}</ul>
          ${restHtml}
        </div>`
      : `<p class="profile-codex-empty">아직 수집한 게임이 없어요.</p>`;

    const _codexPreviewGames = playedGames.slice(0, 2);
    const _codexPreviewHtml = _codexPreviewGames.length
      ? `<div class="profile-section-preview">${_codexPreviewGames.map(r => `✅ ${esc(getGameName(r.game_id))}`).join(' · ')}${playedGames.length > 2 ? ` 외 ${playedGames.length - 2}종` : ''}</div>`
      : `<div class="profile-section-preview">아직 수집한 게임이 없어요</div>`;

    return `<div class="profile-codex-section" data-played-count="${playedCount}" data-total-games="${totalGames}">
      <div class="profile-codex-header">
        🎲 게임 도감 <span class="profile-codex-summary">${playedCount} / ${totalGames}</span>
        <button class="profile-codex-toggle-btn" type="button">전체 보기 ▾</button>
      </div>
      ${_codexPreviewHtml}
      <div class="profile-codex-body is-hidden">
        <div class="profile-codex-count">${playedCount} <span>/ ${totalGames}</span></div>
        <div class="profile-codex-bar-wrap"><div class="profile-codex-bar" style="width:${barWidth}%"></div></div>
        <div class="profile-codex-grade">${grade}</div>
        ${listHtml}
      </div>
    </div>`;
  }

  // 캐릭터/대표 캐릭터 섹션 HTML 빌드
  // 캐릭터 표시명: char_name 필드 우선, 없으면 name 폴백
  function _charName(def) { return def.rewards?.char_name || def.name; }

  async function buildCharacterSection(userId, nickname) {
    const db = window.CottageDB;
    if (!db) return '';

    const [achievements, repAch, playCount, distinctCount, photoCount, ratingCount, visitCount, participationCount, firstRecordCount] = await Promise.all([
      db.getUserAchievements(userId),
      db.getRepAchievement(userId),
      db.getUserPlayCount(userId),
      db.getUserDistinctGameCount(userId),
      db.getUserPhotoCount(userId),
      db.getUserRatingCount(userId),
      db.getUserVisitCount(userId),
      nickname ? db.getUserParticipationCount(userId, nickname) : Promise.resolve(0),
      db.getUserFirstRecordCount(userId),
    ]);

    const earnedIds = new Set(achievements.map(a => a.id));
    const earnedCount = earnedIds.size;
    const COUNTS = { play: playCount, new_game: distinctCount, photo: photoCount, review: ratingCount, visit: visitCount, first_record: firstRecordCount, participated: participationCount };

    // CHAR_DEFS: 캐릭터 보상 있는 17종만 그리드에 표시
    const gridCards = CHAR_DEFS.map(def => {
      const done = earnedIds.has(def.id);
      const isRep = repAch?.id === def.id;
      const imgSrc = `/assets/images/characters/characters_basic/${def.rewards.character}.png`;
      let cls = 'profile-char-card';
      if (!done) cls += ' is-locked';
      if (isRep) cls += ' is-rep';
      const dataAttr = done ? ` data-ach-id="${def.id}"` : '';
      const disabledAttr = done ? '' : ' disabled';

      const cur = COUNTS[def.type] || 0;
      const progressLabel = `<span class="profile-char-card-progress">${SHORT_TYPE_LABELS[def.type] || def.type} ${cur}/${def.threshold}</span>`;

      return `<button class="${cls}" title="${_charName(def)}" type="button"${dataAttr}${disabledAttr}>` +
        `<img src="${imgSrc}" alt="${_charName(def)}" ` +
        `onerror="this.onerror=null;this.style.display='none';this.nextElementSibling.style.display='flex'">` +
        `<span class="profile-char-emoji-fallback" style="display:none">${def.emoji}</span>` +
        `<span class="profile-char-card-name">${_charName(def)}</span>` +
        `${progressLabel}` +
        `</button>`;
    }).join('');

    const repActionHtml = earnedCount
      ? `<div class="profile-rep-action-row" id="profileRepActionRow" data-user-id="${userId}" data-orig-rep-id="${repAch?.id || ''}" style="display:none">
          <button class="profile-rep-change-btn" type="button">변경</button>
          <button class="profile-rep-cancel-btn" type="button">취소</button>
        </div>`
      : '';

    const emptyHint = earnedCount === 0
      ? '<p class="profile-char-empty">게임을 플레이하면 캐릭터가 해금됩니다 🐾</p>'
      : '';

    const _repIconHtml = repAch?.id
      ? `<img class="profile-char-rep-icon" src="/assets/images/characters/characters_basic/${repAch.id}.png" alt="">`
      : '';

    const _earnedCharList = CHAR_DEFS.filter(d => earnedIds.has(d.id));
    const _unearnedCharList = CHAR_DEFS.filter(d => !earnedIds.has(d.id));
    const _lastEarnedChar = _earnedCharList[_earnedCharList.length - 1];
    const _nextChar = _unearnedCharList.find(d => (COUNTS[d.type] || 0) < d.threshold) || _unearnedCharList[0];
    const _charPreviewParts = [];
    if (_lastEarnedChar) _charPreviewParts.push(`✓ ${_lastEarnedChar.emoji} ${_charName(_lastEarnedChar)}`);
    if (_nextChar) {
      const _nc = COUNTS[_nextChar.type] || 0;
      _charPreviewParts.push(`→ ${_nextChar.emoji} ${_charName(_nextChar)} (${SHORT_TYPE_LABELS[_nextChar.type] || _nextChar.type} ${_nc}/${_nextChar.threshold})`);
    }
    const _charPreviewHtml = _charPreviewParts.length
      ? `<div class="profile-section-preview">${_charPreviewParts.join('  ')}</div>` : '';

    return `<div class="profile-char-section" data-char-count="${earnedCount}" data-char-total="${CHAR_DEFS.length}">
      <div class="profile-char-header">🐾 내 캐릭터 ${_repIconHtml}<span class="profile-char-count">${earnedCount} / ${CHAR_DEFS.length}종</span><button class="profile-char-toggle-btn" type="button">전체 보기 ▾</button></div>
      ${_charPreviewHtml}
      <div class="profile-char-body is-hidden">
        ${emptyHint}
        <div class="profile-char-grid">${gridCards}</div>
        ${repActionHtml}
      </div>
    </div>`;
  }

  // 업적 전체 목록 섹션 HTML 빌드
  async function buildAchievementsSection(userId, nickname) {
    const db = window.CottageDB;
    if (!db) return '';

    const [earned, playCount, distinctCount, photoCount, ratingCount, visitCount, participationCount, firstRecordCount] = await Promise.all([
      db.getUserAchievements(userId),
      db.getUserPlayCount(userId),
      db.getUserDistinctGameCount(userId),
      db.getUserPhotoCount(userId),
      db.getUserRatingCount(userId),
      db.getUserVisitCount(userId),
      nickname ? db.getUserParticipationCount(userId, nickname) : Promise.resolve(0),
      db.getUserFirstRecordCount(userId),
    ]);

    const earnedIds = new Set(earned.map(a => a.id));
    const COUNTS = { play: playCount, new_game: distinctCount, photo: photoCount, review: ratingCount, visit: visitCount, first_record: firstRecordCount, participated: participationCount };

    const items = ACH_DEFS.map(def => {
      const done = earnedIds.has(def.id);
      const cur = Math.min(COUNTS[def.type] || 0, def.threshold);
      const typeLabel = TYPE_LABELS[def.type] || def.type;

      const rewardParts = [];
      if (def.rewards?.character) rewardParts.push('🐾 캐릭터');
      if (def.rewards?.title) rewardParts.push('🏷 칭호');
      if (def.rewards?.voucher) rewardParts.push('🥤 교환권');
      const rewardHtml = rewardParts.length
        ? `<span class="profile-ach-reward">${done ? '획득한 보상' : '받을 보상'}: ${rewardParts.join(' · ')}</span>`
        : '';

      let iconHtml;
      if (def.rewards?.character && done) {
        const imgSrc = `/assets/images/characters/characters_basic/${def.rewards.character}.png`;
        iconHtml = `<img class="profile-ach-img" src="${imgSrc}" alt="${def.name}" ` +
          `onerror="this.onerror=null;this.style.display='none';this.nextElementSibling.style.display='inline'">` +
          `<span class="profile-ach-img-fallback" style="display:none">${def.emoji}</span>`;
      } else {
        iconHtml = `<span class="profile-ach-img-lock">${def.emoji}</span>`;
      }

      const statusCls = done ? ' is-done' : '';
      const statusText = done ? `✓ ${typeLabel} · ${def.threshold}` : `${typeLabel} · ${cur}/${def.threshold}`;

      return `<li class="profile-ach-item${done ? ' is-achieved' : ' is-locked'}">` +
        `${iconHtml}` +
        `<div class="profile-ach-info"><span class="profile-ach-name">${def.name}</span>${rewardHtml}</div>` +
        `<span class="profile-ach-status${statusCls}">${statusText}</span></li>`;
    }).join('');

    const _earnedAchList = ACH_DEFS.filter(d => earnedIds.has(d.id));
    const _unearnedAchList = ACH_DEFS.filter(d => !earnedIds.has(d.id));
    const _lastEarnedAch = _earnedAchList[_earnedAchList.length - 1];
    const _nextAch = _unearnedAchList.find(d => (COUNTS[d.type] || 0) < d.threshold) || _unearnedAchList[0];
    const _achPreviewParts = [];
    if (_lastEarnedAch) _achPreviewParts.push(`✓ ${_lastEarnedAch.name}`);
    if (_nextAch) {
      const _nc = COUNTS[_nextAch.type] || 0;
      _achPreviewParts.push(`→ ${_nextAch.name} (${SHORT_TYPE_LABELS[_nextAch.type] || _nextAch.type} ${_nc}/${_nextAch.threshold})`);
    }
    const _achPreviewHtml = _achPreviewParts.length
      ? `<div class="profile-section-preview">${_achPreviewParts.join('  ')}</div>` : '';

    return `<div class="profile-ach-section" data-ach-count="${earnedIds.size}" data-ach-total="${ACH_DEFS.length}">` +
      `<div class="profile-ach-header">` +
      `<span class="profile-ach-title">🏆 업적 <span class="profile-ach-count">${earnedIds.size} / ${ACH_DEFS.length}</span></span>` +
      `<button class="profile-ach-toggle-btn" type="button">전체 보기 ▾</button>` +
      `</div>` +
      `${_achPreviewHtml}` +
      `<ul class="profile-ach-list is-hidden">${items}</ul>` +
      `</div>`;
  }

  // 대표 캐릭터 변경 핸들러
  async function handleRepCardSelect(userId, achId, origId, charBody) {
    if (!userId) return;
    const ok = await window.CottageDB?.setRepAchievement(userId, achId || null);
    if (ok === false) {
      console.warn('[CottageAchievements] 대표 캐릭터 저장 실패');
      charBody.querySelectorAll('.profile-char-card').forEach(c => c.classList.remove('is-selected'));
      if (origId) charBody.querySelector(`.profile-char-card[data-ach-id="${origId}"]`)?.classList.add('is-selected');
    } else {
      charBody.querySelectorAll('.profile-char-card').forEach(c => c.classList.remove('is-rep', 'is-selected'));
      if (achId) charBody.querySelector(`.profile-char-card[data-ach-id="${achId}"]`)?.classList.add('is-rep');
      const actionRow = charBody.querySelector('#profileRepActionRow');
      if (actionRow) { actionRow.style.display = 'none'; actionRow.dataset.origRepId = achId || ''; }
      const panelAvatar = document.querySelector('#profilePanel .profile-panel-avatar');
      if (panelAvatar && achId) panelAvatar.src = `/assets/images/characters/characters_basic/${achId}.png`;
      const menuAvatar = document.getElementById('kakaoProfileImg');
      if (menuAvatar && achId) menuAvatar.src = `/assets/images/characters/characters_basic/${achId}.png`;
    }
  }

  window.CottageAchievements = {
    checkAchievements,
    buildCodexSection,
    buildCharacterSection,
    buildAchievementsSection,
    handleRepCardSelect,
    buildTitleSection,
    handleRepTitleSelect,
    getTitleById: (id) => TITLE_DEFS.find(t => t.id === id) || null,
  };

  window.checkAchievements = checkAchievements;
})();
