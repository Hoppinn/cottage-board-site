// 업적/캐릭터/칭호 시스템 V2
// rewards 객체로 보상 정참조. ACH_DEFS는 캐릭터·칭호·교환권 개수와 무관하게 독립 확장 가능.

(function () {
  const ACH_DEFS = [
    // ── record (다람쥐) ── 작성자 기준
    { id: 'record_1',   name: '기록의 시작',        emoji: '🌱', type: 'record', threshold: 1,
      rewards: { character: 'squirrel_lv1', char_name: '새싹 다람쥐', voucher: true } },
    { id: 'record_3',   name: '세 번의 기록',        emoji: '🐾', type: 'record', threshold: 3,   rewards: {} },
    { id: 'record_5',   name: '다섯 번의 기록',      emoji: '🐾', type: 'record', threshold: 5,   rewards: {} },
    { id: 'record_8',   name: '코티지의 밤',         emoji: '🌙', type: 'record', threshold: 8,   rewards: {} },
    { id: 'record_10',  name: '열 번의 기록',        emoji: '🌰', type: 'record', threshold: 10,
      rewards: { title: 'title_record_10' } },
    { id: 'record_15',  name: '고수의 길',           emoji: '🐾', type: 'record', threshold: 15,  rewards: {} },
    { id: 'record_20',  name: '스무 번의 기록',      emoji: '🐾', type: 'record', threshold: 20,  rewards: {} },
    { id: 'record_30',  name: '서른 번의 기록',      emoji: '🐾', type: 'record', threshold: 30,
      rewards: { character: 'squirrel_lv2', char_name: '도토리 다람쥐' } },
    { id: 'record_40',  name: '꾸준한 플레이어',     emoji: '🏃', type: 'record', threshold: 40,  rewards: {} },
    { id: 'record_50',  name: '쉰 번의 기록',        emoji: '📦', type: 'record', threshold: 50,
      rewards: { title: 'title_record_50' } },
    { id: 'record_75',  name: '장인 게이머',         emoji: '⚒️', type: 'record', threshold: 75,
      rewards: { character: 'squirrel_lv3', char_name: '창고 다람쥐' } },
    { id: 'record_100', name: '백 번의 기록',        emoji: '🧺', type: 'record', threshold: 100,
      rewards: { title: 'title_record_100' } },
    { id: 'record_125', name: '코티지 베테랑',       emoji: '🏅', type: 'record', threshold: 125, rewards: {} },
    { id: 'record_150', name: '백오십 번의 기록',    emoji: '🏠', type: 'record', threshold: 150,
      rewards: { character: 'squirrel_lv4', char_name: '겨울준비 다람쥐' } },
    { id: 'record_200', name: '이백 번의 기록',      emoji: '📖', type: 'record', threshold: 200,
      rewards: { title: 'title_record_200' } },
    { id: 'record_250', name: '이백오십 번의 기록',  emoji: '🌸', type: 'record', threshold: 250, rewards: {} },
    { id: 'record_300', name: '삼백 번의 기록',      emoji: '🌙', type: 'record', threshold: 300,
      rewards: { title: 'title_record_300' } },
    { id: 'record_400', name: '여름의 플레이어',     emoji: '☀️', type: 'record', threshold: 400,
      rewards: { character: 'squirrel_lv5', char_name: '사서 다람쥐' } },
    { id: 'record_500', name: '코티지 마스터',       emoji: '✨', type: 'record', threshold: 500,
      rewards: { character: 'cottage_master', char_name: '코티지 마스터', title: 'title_record_500' } },
    // ── first_record (부엉이) ── 해당 game_id 최초 기록 작성자 기준
    { id: 'first_record_1',  name: '첫 개척',         emoji: '🗺️', type: 'first_record', threshold: 1,
      rewards: { character: 'owl_lv1', char_name: '새내기 부엉이' } },
    { id: 'first_record_3',  name: '세 게임 개척',    emoji: '⛺', type: 'first_record', threshold: 3,
      rewards: { title: 'title_first_record_3' } },
    { id: 'first_record_5',  name: '다섯 게임 개척',  emoji: '🧭', type: 'first_record', threshold: 5,
      rewards: { character: 'owl_lv2', char_name: '지혜로운 부엉이' } },
    { id: 'first_record_10', name: '개척자',          emoji: '🌟', type: 'first_record', threshold: 10,
      rewards: { title: 'title_first_record_10' } },
    { id: 'first_record_20', name: '코티지 개척단',   emoji: '🏅', type: 'first_record', threshold: 20,
      rewards: { character: 'owl_lv3', char_name: '현자 부엉이' } },
    { id: 'first_record_50', name: '전설의 개척자',   emoji: '✨', type: 'first_record', threshold: 50,
      rewards: { character: 'owl_lv4', char_name: '대현자 부엉이', title: 'title_first_record_50', voucher: true } },
    // ── new_game (토끼) ── 작성자 기준 새 게임 탐험
    { id: 'new_game_1',   name: '첫 탐험',           emoji: '✨', type: 'new_game', threshold: 1,
      rewards: { character: 'rabbit_lv1', char_name: '새싹 토끼' } },
    { id: 'new_game_3',   name: '게임 입문',         emoji: '🎮', type: 'new_game', threshold: 3,   rewards: {} },
    { id: 'new_game_5',   name: '다섯 번째 탐험',    emoji: '🔍', type: 'new_game', threshold: 5,
      rewards: { character: 'rabbit_lv2', char_name: '호기심 토끼' } },
    { id: 'new_game_7',   name: '다양한 취향',       emoji: '🌈', type: 'new_game', threshold: 7,   rewards: {} },
    { id: 'new_game_10',  name: '열 가지 탐험',      emoji: '🎲', type: 'new_game', threshold: 10,  rewards: {} },
    { id: 'new_game_15',  name: '게임 수집가',       emoji: '🐰', type: 'new_game', threshold: 15,  rewards: {} },
    { id: 'new_game_20',  name: '스무 가지 탐험',    emoji: '🎒', type: 'new_game', threshold: 20,
      rewards: { character: 'rabbit_lv3', char_name: '탐험 토끼', voucher: true } },
    { id: 'new_game_30',  name: '서른 가지 탐험',    emoji: '🗺️', type: 'new_game', threshold: 30,
      rewards: { title: 'title_new_game_30' } },
    { id: 'new_game_40',  name: '게임 전도사',       emoji: '📢', type: 'new_game', threshold: 40,  rewards: {} },
    { id: 'new_game_50',  name: '오십 종 탐험',      emoji: '🧭', type: 'new_game', threshold: 50,
      rewards: { character: 'rabbit_lv4', char_name: '여행 토끼' } },
    { id: 'new_game_75',  name: '장르 탐험자',       emoji: '🗺️', type: 'new_game', threshold: 75,  rewards: {} },
    { id: 'new_game_100', name: '백 종 탐험',        emoji: '🗺️', type: 'new_game', threshold: 100,
      rewards: { title: 'title_new_game_100' } },
    { id: 'new_game_125', name: '게임계 여행자',     emoji: '✈️', type: 'new_game', threshold: 125, rewards: {} },
    { id: 'new_game_150', name: '백오십 종 탐험',    emoji: '🧳', type: 'new_game', threshold: 150,
      rewards: { character: 'rabbit_lv5', char_name: '유랑 토끼' } },
    { id: 'new_game_200', name: '이백 종 탐험',      emoji: '📚', type: 'new_game', threshold: 200,
      rewards: { title: 'title_new_game_200' } },
    { id: 'new_game_250', name: '핼러윈 수집가',     emoji: '🎃', type: 'new_game', threshold: 250, rewards: {} },
    { id: 'new_game_300', name: '삼백 종 탐험',      emoji: '🌍', type: 'new_game', threshold: 300,
      rewards: { character: 'rabbit_lv6', char_name: '전설의 토끼', title: 'title_new_game_300' } },
    // ── play (곰) ── player_names 닉네임 기반 보조 업적
    { id: 'play_5',   name: '게임 친구',       emoji: '🤝', type: 'play', threshold: 5,   rewards: {} },
    { id: 'play_10',  name: '활발한 참여자',   emoji: '🎮', type: 'play', threshold: 10,
      rewards: { character: 'bear_lv1', char_name: '손님 곰' } },
    { id: 'play_20',  name: '게임 동반자',     emoji: '🎲', type: 'play', threshold: 20,
      rewards: { title: 'title_play_20' } },
    { id: 'play_30',  name: '코티지 플레이어', emoji: '🎯', type: 'play', threshold: 30,  rewards: {} },
    { id: 'play_50',  name: '코티지 피플',     emoji: '🌟', type: 'play', threshold: 50,
      rewards: { character: 'bear_lv2', char_name: '주민 곰' } },
    { id: 'play_100', name: '백전노장',        emoji: '🏆', type: 'play', threshold: 100,
      rewards: { voucher: true } },
    { id: 'play_150', name: '코티지 레전드',   emoji: '⚜️', type: 'play', threshold: 150,
      rewards: { character: 'bear_lv3', char_name: '단골 곰' } },
    { id: 'play_200', name: '게임왕',          emoji: '👑', type: 'play', threshold: 200,
      rewards: { title: 'title_play_200' } },
    { id: 'play_300', name: '코티지 신화',     emoji: '🌙', type: 'play', threshold: 300, rewards: {} },
    { id: 'play_400', name: '전설의 게이머',   emoji: '✨', type: 'play', threshold: 400,
      rewards: { character: 'bear_lv4', char_name: '터줏대감 곰' } },
    { id: 'play_500', name: '코티지 마스터',   emoji: '✨', type: 'play', threshold: 500,
      rewards: { character: 'bear_lv5', char_name: '숲의 전설 곰', title: 'title_play_500' } },
    // ── photo (고슴도치)
    { id: 'photo_1',   name: '첫 사진',           emoji: '📸', type: 'photo', threshold: 1,
      rewards: { character: 'hedgehog_lv1', char_name: '초보 고슴도치' } },
    { id: 'photo_2',   name: '두 번째 사진',       emoji: '📸', type: 'photo', threshold: 2,   rewards: {} },
    { id: 'photo_3',   name: '세 번의 추억',       emoji: '✨', type: 'photo', threshold: 3,   rewards: {} },
    { id: 'photo_5',   name: '사진사 지망생',      emoji: '🤳', type: 'photo', threshold: 5,   rewards: {} },
    { id: 'photo_10',  name: '순간 수집',          emoji: '🖼️', type: 'photo', threshold: 10,
      rewards: { title: 'title_photo_10' } },
    { id: 'photo_20',  name: '스무 장의 기록',     emoji: '🎞️', type: 'photo', threshold: 20,
      rewards: { character: 'hedgehog_lv2', char_name: '기록가 고슴도치' } },
    { id: 'photo_30',  name: '사진 작가',          emoji: '📷', type: 'photo', threshold: 30,  rewards: {} },
    { id: 'photo_50',  name: '기억 포착',          emoji: '🎞️', type: 'photo', threshold: 50,
      rewards: { title: 'title_photo_50' } },
    { id: 'photo_75',  name: '필름 요정',          emoji: '🧚', type: 'photo', threshold: 75,  rewards: {} },
    { id: 'photo_100', name: '백 장의 기억',       emoji: '📷', type: 'photo', threshold: 100,
      rewards: { character: 'hedgehog_lv3', char_name: '포토마스터 고슴도치', voucher: true } },
    { id: 'photo_150', name: '사진 마스터',        emoji: '🎨', type: 'photo', threshold: 150,
      rewards: { title: 'title_photo_150' } },
    { id: 'photo_200', name: '이백 장의 추억',     emoji: '🎨', type: 'photo', threshold: 200,
      rewards: { character: 'hedgehog_lv4', char_name: '작가 고슴도치' } },
    { id: 'photo_300', name: '사진 예술가',        emoji: '🖼️', type: 'photo', threshold: 300,
      rewards: { title: 'title_photo_300' } },
    { id: 'photo_500', name: '전설의 사진가',      emoji: '🎭', type: 'photo', threshold: 500,
      rewards: { character: 'hedgehog_lv5', char_name: '작가 고슴도치' } },
    // ── review (햄스터) ── rare 캐릭터 임시 배치: 향후 special 조건 설계 시 재배치 가능
    { id: 'review_1',   name: '첫 게임평',          emoji: '✏️', type: 'review', threshold: 1,
      rewards: { character: 'hamster_lv1', char_name: '리뷰어 햄스터' } },
    { id: 'review_2',   name: '첫 분석',            emoji: '🔍', type: 'review', threshold: 2,   rewards: {} },
    { id: 'review_3',   name: '감상 시작',          emoji: '✍️', type: 'review', threshold: 3,   rewards: {} },
    { id: 'review_5',   name: '다섯 번의 감상',     emoji: '✍️', type: 'review', threshold: 5,   rewards: {} },
    { id: 'review_8',   name: '번개 리뷰어',        emoji: '⚡', type: 'review', threshold: 8,
      rewards: {} },
    { id: 'review_10',  name: '열 번의 감상',       emoji: '📝', type: 'review', threshold: 10,
      rewards: { title: 'title_review_10' } },
    { id: 'review_15',  name: '이야기꾼',           emoji: '✨', type: 'review', threshold: 15,
      rewards: {} },
    { id: 'review_20',  name: '코티지 논객',        emoji: '🗣️', type: 'review', threshold: 20,
      rewards: { character: 'hamster_lv2', char_name: '서평가 햄스터' } },
    { id: 'review_25',  name: '스물다섯 감상',      emoji: '📋', type: 'review', threshold: 25,  rewards: {} },
    { id: 'review_40',  name: '리뷰 마니아',        emoji: '📋', type: 'review', threshold: 40,  rewards: {} },
    { id: 'review_50',  name: '쉰 번의 감상',       emoji: '📚', type: 'review', threshold: 50,
      rewards: { title: 'title_review_50' } },
    { id: 'review_75',  name: '비평 전문가',        emoji: '🎓', type: 'review', threshold: 75,  rewards: {} },
    { id: 'review_100', name: '백 번의 감상',       emoji: '🎓', type: 'review', threshold: 100,
      rewards: { character: 'hamster_lv3', char_name: '평론가 햄스터', voucher: true } },
    { id: 'review_150', name: '백오십 번의 감상',   emoji: '🏆', type: 'review', threshold: 150,
      rewards: { title: 'title_review_150' } },
    { id: 'review_200', name: '이백 번의 감상',     emoji: '📝', type: 'review', threshold: 200,
      rewards: { character: 'hamster_lv4', char_name: '비평가 햄스터' } },
    { id: 'review_300', name: '삼백 번의 감상',     emoji: '🏆', type: 'review', threshold: 300,
      rewards: { title: 'title_review_300' } },
    { id: 'review_500', name: '전설의 리뷰어',      emoji: '✨', type: 'review', threshold: 500,
      rewards: { character: 'hamster_lv5', char_name: '전설의 평론가 햄스터' } },
    // ── visit (참새)
    { id: 'visit_3',   name: '코티지 방문객',      emoji: '✨', type: 'visit', threshold: 3,
      rewards: { character: 'sparrow_lv1', char_name: '공감받는 참새' } },
    { id: 'visit_5',   name: '코티지 친구',        emoji: '🤗', type: 'visit', threshold: 5,   rewards: {} },
    { id: 'visit_10',  name: '코티지 단골',        emoji: '☕', type: 'visit', threshold: 10,
      rewards: { title: 'title_visit_10' } },
    { id: 'visit_15',  name: '코티지 팬',          emoji: '💙', type: 'visit', threshold: 15,  rewards: {} },
    { id: 'visit_20',  name: '코티지 단골 Lv2',   emoji: '☕', type: 'visit', threshold: 20,
      rewards: { character: 'sparrow_lv2', char_name: '인기 참새' } },
    { id: 'visit_25',  name: '코티지의 기둥',      emoji: '🏛️', type: 'visit', threshold: 25,  rewards: {} },
    { id: 'visit_30',  name: '코티지 이웃',        emoji: '🏡', type: 'visit', threshold: 30,
      rewards: { title: 'title_visit_30' } },
    { id: 'visit_40',  name: '오랜 인연',          emoji: '🤝', type: 'visit', threshold: 40,  rewards: {} },
    { id: 'visit_50',  name: '코티지 주민',        emoji: '🔥', type: 'visit', threshold: 50,
      rewards: { character: 'sparrow_lv3', char_name: '스타 참새' } },
    { id: 'visit_75',  name: '코티지 충성단',      emoji: '⚔️', type: 'visit', threshold: 75,  rewards: {} },
    { id: 'visit_100', name: '터줏대감',           emoji: '🌳', type: 'visit', threshold: 100,
      rewards: { title: 'title_visit_100' } },
    { id: 'visit_150', name: '코티지 수호자',      emoji: '🛡️', type: 'visit', threshold: 150, rewards: {} },
    { id: 'visit_200', name: '코티지의 오랜 친구', emoji: '🐦', type: 'visit', threshold: 200,
      rewards: { character: 'sparrow_lv4', char_name: '전설의 참새', voucher: true } },
    { id: 'visit_300', name: '코티지 원로',        emoji: '👑', type: 'visit', threshold: 300,
      rewards: { title: 'title_visit_300' } },
    { id: 'visit_400', name: '코티지의 산타',      emoji: '🎄', type: 'visit', threshold: 400, rewards: {} },
    { id: 'visit_500', name: '전설의 방문자',      emoji: '🐦', type: 'visit', threshold: 500,
      rewards: { character: 'sparrow_lv5', char_name: '전설 참새', title: 'title_visit_500' } },
    // ── balance (여우) ── 함께한 날. 매장에 함께한 고유 날짜 수. user_id 작성자 + player_names 참여자 병행.
    // [임시] player_names 텍스트 기반 보조 판정. 장기적으로 game_play_participants 테이블로 전환 예정.
    { id: 'balance_10',  name: '다재다능',      emoji: '🦊', type: 'balance', threshold: 10,
      rewards: { character: 'fox_lv1', char_name: '수습 여우' } },
    { id: 'balance_30',  name: '균형의 시작',   emoji: '🦊', type: 'balance', threshold: 30,
      rewards: { title: 'title_balance_30' } },
    { id: 'balance_50',  name: '올라운더',      emoji: '🦊', type: 'balance', threshold: 50,
      rewards: { character: 'fox_lv2', char_name: '탐정 여우' } },
    { id: 'balance_100', name: '균형의 달인',   emoji: '🦊', type: 'balance', threshold: 100,
      rewards: { title: 'title_balance_100' } },
    { id: 'balance_200', name: '박식한 여우',   emoji: '🦊', type: 'balance', threshold: 200,
      rewards: { character: 'fox_lv3', char_name: '명탐정 여우' } },
    { id: 'balance_300', name: '코티지의 전설', emoji: '🦊', type: 'balance', threshold: 300,
      rewards: { character: 'fox_lv4', char_name: '전설의 탐정 여우', title: 'title_balance_300' } },
  ];

  // 칭호 정의 — 연결 관계는 ACH_DEFS.rewards.title이 담당 (역참조 필드 없음)
  const TITLE_DEFS = [
    // record 계열
    { id: 'title_record_10',  name: '첫 페이지',          emoji: '📝', rarity: '일반' },
    { id: 'title_record_50',  name: '이야기 수집가',      emoji: '📖', rarity: '고급' },
    { id: 'title_record_100', name: '코티지 연대기 작가', emoji: '📚', rarity: '희귀' },
    { id: 'title_record_150', name: '코티지 단골손님',    emoji: '🏠', rarity: '고급' },
    { id: 'title_record_200', name: '코티지 사서',        emoji: '🏛', rarity: '전설' },
    { id: 'title_record_300', name: '코티지 골수팬',      emoji: '💪', rarity: '희귀' },
    { id: 'title_record_500', name: '코티지 마스터',      emoji: '✨', rarity: '전설' },
    // new_game 계열
    { id: 'title_new_game_30',  name: '게임 사냥꾼',      emoji: '🎯', rarity: '일반' },
    { id: 'title_new_game_100', name: '코티지 유랑자',    emoji: '🚂', rarity: '전설' },
    { id: 'title_new_game_200', name: '게임 학자',        emoji: '📚', rarity: '희귀' },
    { id: 'title_new_game_300', name: '전설 탐험가',      emoji: '🗺', rarity: '전설' },
    // photo 계열
    { id: 'title_photo_10',  name: '순간 수집가',         emoji: '🎞', rarity: '고급' },
    { id: 'title_photo_50',  name: '기억 포착자',         emoji: '📷', rarity: '희귀' },
    { id: 'title_photo_150', name: '코티지 사진사',       emoji: '🎨', rarity: '전설' },
    { id: 'title_photo_300', name: '사진 마스터',         emoji: '🖼', rarity: '전설' },
    // review 계열
    { id: 'title_review_10',  name: '취향 기록자',        emoji: '📖', rarity: '고급' },
    { id: 'title_review_50',  name: '코티지 안내자',      emoji: '📚', rarity: '희귀' },
    { id: 'title_review_100', name: '코티지 큐레이터',    emoji: '🏛', rarity: '전설' },
    { id: 'title_review_150', name: '코티지 비평가',      emoji: '🖊', rarity: '고급' },
    { id: 'title_review_300', name: '전설의 리뷰어',      emoji: '🏅', rarity: '전설' },
    { id: 'title_review_500', name: '코티지의 감식가',    emoji: '🎓', rarity: '전설' },
    // visit 계열
    { id: 'title_visit_10',  name: '코티지 단골',         emoji: '☕', rarity: '일반' },
    { id: 'title_visit_30',  name: '코티지 이웃',         emoji: '🏡', rarity: '고급' },
    { id: 'title_visit_100', name: '터줏대감',            emoji: '🌳', rarity: '영웅' },
    { id: 'title_visit_300', name: '코티지 원로',         emoji: '👑', rarity: '전설' },
    { id: 'title_visit_500', name: '코티지 전설',         emoji: '🌟', rarity: '전설' },
    // play 계열
    { id: 'title_play_20',  name: '게임 동료',            emoji: '🎲', rarity: '일반' },
    { id: 'title_play_200', name: '코티지 플레이어',      emoji: '🎯', rarity: '고급' },
    { id: 'title_play_500', name: '게임왕',               emoji: '👑', rarity: '전설' },
    // first_record 계열
    { id: 'title_first_record_3',  name: '첫 개척자',     emoji: '⛺', rarity: '일반' },
    { id: 'title_first_record_10', name: '코티지 탐구자', emoji: '🌟', rarity: '고급' },
    { id: 'title_first_record_50', name: '전설의 개척자', emoji: '🗺', rarity: '전설' },
    // balance 계열
    { id: 'title_balance_30',  name: '코티지 올라운더',   emoji: '🦊', rarity: '고급' },
    { id: 'title_balance_100', name: '균형의 달인',       emoji: '🦊', rarity: '희귀' },
    { id: 'title_balance_300', name: '코티지의 전설',     emoji: '🦊', rarity: '전설' },
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

  const TYPE_LABELS = { record: '플레이기록 작성', new_game: '새 게임', photo: '사진', review: '게임평', visit: '홈페이지 탐방', first_record: '코티지 최초 기록', play: '플레이', balance: '함께한 날' };
  const SHORT_TYPE_LABELS = { record: '기록 작성', new_game: '새 게임', photo: '사진', review: '게임평', visit: '홈페이지', first_record: '최초 기록', play: '플레이', balance: '함께한 날' };

  // 업적 체크 진입점 — supabase-client.js에서 호출
  async function checkAchievements(category, userId, opts = {}) {
    if (!userId || !window.CottageDB) return;
    const db = window.CottageDB;

    const [playCount, distinctCount, photoCount, ratingCount] = await Promise.all([
      (category === 'record' || category === 'review') ? db.getUserPlayCount(userId) : Promise.resolve(null),
      category === 'record' ? db.getUserDistinctGameCount(userId) : Promise.resolve(null),
      category === 'record' ? db.getUserPhotoCount(userId) : Promise.resolve(null),
      category === 'review' ? db.getUserRatingCount(userId) : Promise.resolve(null),
    ]);

    const checks = [];

    if (category === 'record') {
      checks.push(
        { id: 'record_1',   v: playCount, t: 1 },
        { id: 'record_3',   v: playCount, t: 3 },
        { id: 'record_5',   v: playCount, t: 5 },
        { id: 'record_8',   v: playCount, t: 8 },
        { id: 'record_10',  v: playCount, t: 10 },
        { id: 'record_15',  v: playCount, t: 15 },
        { id: 'record_20',  v: playCount, t: 20 },
        { id: 'record_30',  v: playCount, t: 30 },
        { id: 'record_40',  v: playCount, t: 40 },
        { id: 'record_50',  v: playCount, t: 50 },
        { id: 'record_75',  v: playCount, t: 75 },
        { id: 'record_100', v: playCount, t: 100 },
        { id: 'record_125', v: playCount, t: 125 },
        { id: 'record_150', v: playCount, t: 150 },
        { id: 'record_200', v: playCount, t: 200 },
        { id: 'record_250', v: playCount, t: 250 },
        { id: 'record_300', v: playCount, t: 300 },
        { id: 'record_400', v: playCount, t: 400 },
        { id: 'record_500', v: playCount, t: 500 },
        { id: 'new_game_1',   v: distinctCount, t: 1 },
        { id: 'new_game_3',   v: distinctCount, t: 3 },
        { id: 'new_game_5',   v: distinctCount, t: 5 },
        { id: 'new_game_7',   v: distinctCount, t: 7 },
        { id: 'new_game_10',  v: distinctCount, t: 10 },
        { id: 'new_game_15',  v: distinctCount, t: 15 },
        { id: 'new_game_20',  v: distinctCount, t: 20 },
        { id: 'new_game_30',  v: distinctCount, t: 30 },
        { id: 'new_game_40',  v: distinctCount, t: 40 },
        { id: 'new_game_50',  v: distinctCount, t: 50 },
        { id: 'new_game_75',  v: distinctCount, t: 75 },
        { id: 'new_game_100', v: distinctCount, t: 100 },
        { id: 'new_game_125', v: distinctCount, t: 125 },
        { id: 'new_game_150', v: distinctCount, t: 150 },
        { id: 'new_game_200', v: distinctCount, t: 200 },
        { id: 'new_game_250', v: distinctCount, t: 250 },
        { id: 'new_game_300', v: distinctCount, t: 300 },
        { id: 'photo_1',   v: photoCount, t: 1 },
        { id: 'photo_2',   v: photoCount, t: 2 },
        { id: 'photo_3',   v: photoCount, t: 3 },
        { id: 'photo_5',   v: photoCount, t: 5 },
        { id: 'photo_10',  v: photoCount, t: 10 },
        { id: 'photo_20',  v: photoCount, t: 20 },
        { id: 'photo_30',  v: photoCount, t: 30 },
        { id: 'photo_50',  v: photoCount, t: 50 },
        { id: 'photo_75',  v: photoCount, t: 75 },
        { id: 'photo_100', v: photoCount, t: 100 },
        { id: 'photo_150', v: photoCount, t: 150 },
        { id: 'photo_200', v: photoCount, t: 200 },
        { id: 'photo_300', v: photoCount, t: 300 },
        { id: 'photo_500', v: photoCount, t: 500 },
      );
    }

    if (category === 'review') {
      checks.push(
        { id: 'review_1',   v: ratingCount, t: 1 },
        { id: 'review_2',   v: ratingCount, t: 2 },
        { id: 'review_3',   v: ratingCount, t: 3 },
        { id: 'review_5',   v: ratingCount, t: 5 },
        { id: 'review_8',   v: ratingCount, t: 8 },
        { id: 'review_10',  v: ratingCount, t: 10 },
        { id: 'review_15',  v: ratingCount, t: 15 },
        { id: 'review_20',  v: ratingCount, t: 20 },
        { id: 'review_25',  v: ratingCount, t: 25 },
        { id: 'review_40',  v: ratingCount, t: 40 },
        { id: 'review_50',  v: ratingCount, t: 50 },
        { id: 'review_75',  v: ratingCount, t: 75 },
        { id: 'review_100', v: ratingCount, t: 100 },
        { id: 'review_150', v: ratingCount, t: 150 },
        { id: 'review_200', v: ratingCount, t: 200 },
        { id: 'review_300', v: ratingCount, t: 300 },
        { id: 'review_500', v: ratingCount, t: 500 },
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

    if (category === 'play') {
      const pc = opts.participationCount || 0;
      checks.push(
        { id: 'play_5',   v: pc, t: 5 },
        { id: 'play_10',  v: pc, t: 10 },
        { id: 'play_20',  v: pc, t: 20 },
        { id: 'play_30',  v: pc, t: 30 },
        { id: 'play_50',  v: pc, t: 50 },
        { id: 'play_100', v: pc, t: 100 },
        { id: 'play_150', v: pc, t: 150 },
        { id: 'play_200', v: pc, t: 200 },
        { id: 'play_300', v: pc, t: 300 },
        { id: 'play_400', v: pc, t: 400 },
        { id: 'play_500', v: pc, t: 500 },
      );
    }

    if (category === 'balance') {
      const dc = opts.visitingDayCount || 0;
      checks.push(
        { id: 'balance_10',  v: dc, t: 10  },
        { id: 'balance_30',  v: dc, t: 30  },
        { id: 'balance_50',  v: dc, t: 50  },
        { id: 'balance_100', v: dc, t: 100 },
        { id: 'balance_200', v: dc, t: 200 },
        { id: 'balance_300', v: dc, t: 300 },
      );
    }

    const achieved = checks.filter(c => c.v !== null && c.v >= c.t);
    if (!achieved.length) return;

    for (const { id } of achieved) {
      const def = ACH_DEFS.find(d => d.id === id);
      const granted = await db.grantAchievement(userId, id);
      if (granted) {
        showAchievementToast(def?.name || id);
        if (id === 'record_1') {
          const currentRep = await db.getRepAchievement?.(userId).catch(() => null);
          if (!currentRep?.id) {
            await db.setRepAchievement?.(userId, 'record_1').catch(() => {});
            const menuImg = document.getElementById('kakaoProfileImg');
            if (menuImg) menuImg.src = _charImgPath('squirrel_lv1');
          }
        }
        // record_1은 grantFirstPlayVoucher 경로 사용. 나머지 voucher 업적은 여기서 지급.
        if (def?.rewards?.voucher && id !== 'record_1') {
          db.grantAchievementVoucher?.(userId, id).catch(() => {});
        }
      }
    }
  }

  // 달성 토스트
  function showAchievementToast(name) {
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
      <button class="achievement-toast-close" type="button" aria-label="닫기">✕</button>
    `;
    document.body.appendChild(toast);
    const _closeToast = () => { toast.classList.remove('is-visible'); setTimeout(() => toast.remove(), 400); };
    toast.querySelector('.achievement-toast-close').addEventListener('click', _closeToast);
    requestAnimationFrame(() => toast.classList.add('is-visible'));
    setTimeout(_closeToast, 8000);
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

  // achId → 캐릭터 이미지 경로 (외부에서 접근 가능)
  function getCharacterPath(achId) {
    const def = ACH_DEFS.find(d => d.id === achId);
    if (!def?.rewards?.character) return null;
    return _charImgPath(def.rewards.character);
  }

  // 칭호 섹션 HTML 빌드 — { html, earnedIds } 반환
  async function buildTitleSection(userId, repTitleId, visitCount, nickname, preStats = null) {
    const db = window.CottageDB;
    if (!db) return { html: '', earnedIds: new Set() };
    try {
      const s = preStats || await _fetchUserStats(db, userId, nickname);
      const { achievements, playCount, distinctCount, photoCount, ratingCount, participationCount, firstRecordCount, uniqueDayCount } = s;
      const earnedAchIds = new Set(achievements.map(a => a.id));
      const vc = Number(visitCount) || 0;
      const COUNTS = { record: playCount, new_game: distinctCount, photo: photoCount, review: ratingCount, visit: vc, first_record: firstRecordCount, play: participationCount, balance: uniqueDayCount };

      // ACH_DEFS.rewards.title 정참조 기준으로 획득 여부 판단
      const earnedIds = new Set();
      TITLE_DEFS.forEach(def => {
        const achId = _titleToAchId[def.id];
        if (achId && earnedAchIds.has(achId)) earnedIds.add(def.id);
      });

      const RARITY_COLOR = { '일반': '#888', '고급': '#4caf50', '희귀': '#2196f3', '영웅': '#9c27b0', '전설': '#ff9800' };

      const cardsAll = TITLE_DEFS.map(def => {
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
          progressHtml = `<span class="profile-title-progress">${SHORT_TYPE_LABELS[_pAchDef.type] || _pAchDef.type} ${cur}/${_pAchDef.threshold}</span>`;
        }

        return `<button class="${cls}" data-title-id="${def.id}" data-earned="${earned}" type="button">` +
          `<span class="profile-title-emoji">${def.emoji}</span>` +
          `<span class="profile-title-name">${def.name}</span>` +
          `<span class="profile-title-rarity" style="color:${rarityColor}">${earned ? def.rarity : '???'}</span>` +
          `${progressHtml}` +
          `</button>`;
      });

      const repActionHtml = earnedIds.size
        ? `<div class="profile-title-action-row" id="profileTitleActionRow" data-user-id="${userId}" data-orig-rep-id="${repTitleId || ''}" style="display:none">` +
          `<button class="profile-title-change-btn" type="button">변경</button>` +
          `<button class="profile-title-cancel-btn" type="button">취소</button>` +
          `</div>`
        : '';

      const _TITLE_AXES = ['balance', 'play', 'new_game', 'record', 'photo', 'review', 'first_record', 'visit'];
      const _topTitlePerAxis = _TITLE_AXES.map(axis => {
        const axisTitles = TITLE_DEFS.filter(def => {
          const achId = _titleToAchId[def.id];
          return achId ? ACH_DEFS.find(a => a.id === achId)?.type === axis : false;
        }).sort((a, b) => (ACH_DEFS.find(x => x.id === _titleToAchId[a.id])?.threshold || 0) - (ACH_DEFS.find(x => x.id === _titleToAchId[b.id])?.threshold || 0));
        const earned = axisTitles.filter(d => earnedIds.has(d.id));
        return earned.length ? earned[earned.length - 1] : null;
      }).filter(Boolean);
      const _titlePreviewHtml = _topTitlePerAxis.length
        ? `<div class="profile-title-preview"><div class="profile-title-grid">${_topTitlePerAxis.map(def => {
            const isRep = repTitleId === def.id;
            const rarityColor = RARITY_COLOR[def.rarity] || '#888';
            return `<button class="profile-title-card${isRep ? ' is-rep' : ''}" data-title-id="${def.id}" data-earned="true" type="button">` +
              `<span class="profile-title-emoji">${def.emoji}</span>` +
              `<span class="profile-title-name">${def.name}</span>` +
              `<span class="profile-title-rarity" style="color:${rarityColor}">${def.rarity}</span>` +
              `</button>`;
          }).join('')}</div></div>`
        : `<p class="profile-title-empty">칭호를 획득하려면 업적을 달성해보세요 🏷</p>`;
      const html = `<div class="profile-title-section" data-earned-count="${earnedIds.size}" data-title-total="${TITLE_DEFS.length}">` +
        `<div class="profile-title-header">🏷 칭호 <span class="profile-title-count">${earnedIds.size} / ${TITLE_DEFS.length}종</span>` +
        `<button class="profile-title-toggle-btn" type="button">전체보기 ▾</button></div>` +
        `${_titlePreviewHtml}` +
        `<div class="profile-title-body is-hidden">` +
        `<div class="profile-title-grid">${cardsAll.join('')}</div>` +
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

    const _recentGames = playedGames.slice(0, 3);
    const _codexPreviewHtml = `<div class="profile-codex-preview">` +
      `<div class="profile-codex-preview-stat">` +
      `<span class="profile-codex-count">${playedCount} <span>/ ${totalGames}</span></span>` +
      `<span class="profile-codex-grade">${grade}</span>` +
      `</div>` +
      (_recentGames.length
        ? `<ul class="profile-codex-game-list">${_recentGames.map(r => `<li class="profile-codex-game-item">✅ ${esc(getGameName(r.game_id))}</li>`).join('')}</ul>`
        : `<p class="profile-codex-empty">아직 수집한 게임이 없어요.</p>`) +
      `</div>`;
    const _fullListHtml = playedCount
      ? `<ul class="profile-codex-game-list">${playedGames.map(r => `<li class="profile-codex-game-item">✅ ${esc(getGameName(r.game_id))}</li>`).join('')}</ul>`
      : `<p class="profile-codex-empty">아직 수집한 게임이 없어요.</p>`;

    return `<div class="profile-codex-section" data-played-count="${playedCount}" data-total-games="${totalGames}">
      <div class="profile-codex-header">
        🎲 게임 도감 <span class="profile-codex-summary">${playedCount} / ${totalGames}</span>
        <button class="profile-codex-toggle-btn" type="button">전체보기 ▾</button>
      </div>
      ${_codexPreviewHtml}
      <div class="profile-codex-body is-hidden">
        ${_fullListHtml}
      </div>
    </div>`;
  }

  // 캐릭터/대표 캐릭터 섹션 HTML 빌드
  // 캐릭터 표시명: char_name 필드 우선, 없으면 name 폴백
  function _charName(def) { return def.rewards?.char_name || def.name; }
  // rare/, season_, cottage_master는 rare/ 서브폴더에 있음
  function _charImgPath(character) {
    if (!character) return null;
    const isRare = /^(rare_|season_|cottage_master)/.test(character);
    return `/assets/images/characters/characters_basic/${isRare ? 'rare/' : ''}${character}.png`;
  }

  async function buildCharacterSection(userId, nickname, preStats = null) {
    const db = window.CottageDB;
    if (!db) return '';

    const s = preStats || await _fetchUserStats(db, userId, nickname);
    const { achievements, repAch, playCount, distinctCount, photoCount, ratingCount, visitCount, participationCount, firstRecordCount, uniqueDayCount } = s;

    const earnedIds = new Set(achievements.map(a => a.id));
    const earnedCount = earnedIds.size;
    const earnedCharCount = CHAR_DEFS.filter(d => earnedIds.has(d.id)).length;
    const COUNTS = { record: playCount, new_game: distinctCount, photo: photoCount, review: ratingCount, visit: visitCount, first_record: firstRecordCount, play: participationCount, balance: uniqueDayCount };

    // CHAR_DEFS: 캐릭터 보상 있는 종만 그리드에 표시 (balance(여우)부터 시작하는 축 순서로 정렬)
    const _CHAR_SORT_ORDER = ['balance', 'play', 'new_game', 'record', 'photo', 'review', 'first_record', 'visit'];
    const _sortedCharDefs = [...CHAR_DEFS].sort((a, b) => _CHAR_SORT_ORDER.indexOf(a.type) - _CHAR_SORT_ORDER.indexOf(b.type));
    const gridCardsAll = _sortedCharDefs.map(def => {
      const done = earnedIds.has(def.id);
      const isRep = repAch?.id === def.id;
      const imgSrc = _charImgPath(def.rewards.character);
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
    });
    const _CHAR_AXES = ['balance', 'play', 'new_game', 'record', 'photo', 'review', 'first_record', 'visit'];
    const _topCharPerAxis = _CHAR_AXES.map(axis => {
      const earnedAxis = CHAR_DEFS.filter(d => d.type === axis && earnedIds.has(d.id) && !d.rewards.character.startsWith('rare_'));
      return earnedAxis.length ? earnedAxis[earnedAxis.length - 1] : null;
    }).filter(Boolean);

    const repActionHtml = earnedCharCount
      ? `<div class="profile-rep-action-row" id="profileRepActionRow" data-user-id="${userId}" data-orig-rep-id="${repAch?.id || ''}" style="display:none">
          <button class="profile-rep-change-btn" type="button">변경</button>
          <button class="profile-rep-cancel-btn" type="button">취소</button>
        </div>`
      : '';

    const emptyHint = earnedCharCount === 0
      ? '<p class="profile-char-empty">게임을 플레이하면 캐릭터가 해금됩니다 🐾</p>'
      : '';

    const _repCharDef = repAch?.id ? CHAR_DEFS.find(d => d.id === repAch.id) : null;
    const _repIconHtml = _repCharDef
      ? `<img class="profile-char-rep-icon" src="${_charImgPath(_repCharDef.rewards.character)}" alt="">`
      : '';

    const _charPreviewHtml = `<div class="profile-char-preview"><div class="profile-char-grid">${_topCharPerAxis.map(def => {
      const isRep = repAch?.id === def.id;
      const imgSrc = _charImgPath(def.rewards.character);
      return `<button class="profile-char-card${isRep ? ' is-rep' : ''}" title="${_charName(def)}" type="button" data-ach-id="${def.id}">` +
        `<img src="${imgSrc}" alt="${_charName(def)}" onerror="this.onerror=null;this.style.display='none';this.nextElementSibling.style.display='flex'">` +
        `<span class="profile-char-emoji-fallback" style="display:none">${def.emoji}</span>` +
        `<span class="profile-char-card-name">${_charName(def)}</span>` +
        `</button>`;
    }).join('')}</div></div>`;
    return `<div class="profile-char-section" data-char-count="${earnedCharCount}" data-char-total="${CHAR_DEFS.length}">
      <div class="profile-char-header">🐾 내 캐릭터 ${_repIconHtml}<span class="profile-char-count">${earnedCharCount} / ${CHAR_DEFS.length}종</span><button class="profile-char-toggle-btn" type="button">전체보기 ▾</button></div>
      ${_charPreviewHtml}
      <div class="profile-char-body is-hidden">
        ${emptyHint}
        <div class="profile-char-grid">${gridCardsAll.join('')}</div>
        ${repActionHtml}
      </div>
    </div>`;
  }

  // 패널 오픈 시 공유 DB 조회 — 세 섹션(캐릭터/업적/칭호)이 동일 데이터를 재사용
  async function _fetchUserStats(db, userId, nickname) {
    const [achievements, repAch, playCount, distinctCount, photoCount, ratingCount, visitCount, participationCount, firstRecordCount, uniqueDayCount] = await Promise.all([
      db.getUserAchievements(userId),
      db.getRepAchievement(userId),
      db.getUserPlayCount(userId),
      db.getUserDistinctGameCount(userId),
      db.getUserPhotoCount(userId),
      db.getUserRatingCount(userId),
      db.getUserVisitCount(userId),
      nickname ? db.getUserParticipationCount(userId, nickname) : Promise.resolve(0),
      db.getUserFirstRecordCount(userId),
      db.getUserUniqueDayCount(userId, nickname),
    ]);
    return { achievements, repAch, playCount, distinctCount, photoCount, ratingCount, visitCount, participationCount, firstRecordCount, uniqueDayCount };
  }

  // 소급 업적 지급 — 카운트 기준은 충족했으나 트리거가 누락된 업적을 DB에 기록
  async function _grantRetroAchievements(db, userId, earnedIds, COUNTS) {
    const missed = ACH_DEFS.filter(d => !earnedIds.has(d.id) && (COUNTS[d.type] || 0) >= d.threshold);
    if (!missed.length) return;
    await Promise.all(missed.map(async def => {
      const ok = await db.grantAchievement(userId, def.id).catch(() => false);
      if (ok) earnedIds.add(def.id);
    }));
  }

  // 업적 전체 목록 섹션 HTML 빌드
  async function buildAchievementsSection(userId, nickname, preStats = null) {
    const db = window.CottageDB;
    if (!db) return '';

    const s = preStats || await _fetchUserStats(db, userId, nickname);
    const { achievements: earned, playCount, distinctCount, photoCount, ratingCount, visitCount, participationCount, firstRecordCount, uniqueDayCount } = s;

    const earnedIds = new Set(earned.map(a => a.id));
    const COUNTS = { record: playCount, new_game: distinctCount, photo: photoCount, review: ratingCount, visit: visitCount, first_record: firstRecordCount, play: participationCount, balance: uniqueDayCount };

    await _grantRetroAchievements(db, userId, earnedIds, COUNTS);

    const _ACH_TYPE_ORDER = ['balance', 'play', 'new_game', 'record', 'photo', 'review', 'first_record', 'visit'];
    const _ACH_DIVIDER_AFTER = new Set(['new_game', 'first_record']);
    const _renderAchItem = def => {
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
        const imgSrc = _charImgPath(def.rewards.character);
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
    };
    const itemsAll = [];
    let _lastType = null;
    [...ACH_DEFS].sort((a, b) => _ACH_TYPE_ORDER.indexOf(a.type) - _ACH_TYPE_ORDER.indexOf(b.type)).forEach(def => {
      if (_lastType && _lastType !== def.type && _ACH_DIVIDER_AFTER.has(_lastType)) {
        itemsAll.push(`<li class="profile-ach-goal-divider"></li>`);
      }
      itemsAll.push(_renderAchItem(def));
      _lastType = def.type;
    });

    const _GOAL_AXES_GROUPS = [
      [
        { type: 'balance',  emoji: '🦊', label: '함께한 날', unit: '일' },
        { type: 'play',     emoji: '🐻', label: '플레이',    unit: '회' },
        { type: 'new_game', emoji: '🐰', label: '새게임',    unit: '종' },
      ],
      [
        { type: 'record',       emoji: '🐿', label: '기록',     unit: '회' },
        { type: 'photo',        emoji: '🦔', label: '사진',     unit: '장' },
        { type: 'review',       emoji: '🐹', label: '게임평',   unit: '개' },
        { type: 'first_record', emoji: '🦉', label: '최초기록', unit: '종' },
      ],
      [
        { type: 'visit', emoji: '🐦', label: '홈페이지', unit: '일' },
      ],
    ];
    const _goalsHtml = _GOAL_AXES_GROUPS.map((group, gi) => {
      const items = group.map(({ type, emoji, label, unit }) => {
        const cur = COUNTS[type] || 0;
        const allDone = ACH_DEFS.filter(d => d.type === type).every(d => earnedIds.has(d.id));
        const nextDef = allDone ? null : ACH_DEFS.filter(d => d.type === type && !earnedIds.has(d.id) && d.threshold > cur).sort((a, b) => a.threshold - b.threshold)[0];
        const progressText = allDone ? `${cur}${unit}` : (nextDef ? `${cur}/${nextDef.threshold}${unit}` : `${cur}${unit}`);
        return `<li class="profile-ach-goal-item"><span class="profile-ach-goal-axis">${emoji} ${label}</span><span class="${allDone ? 'profile-ach-goal-done' : 'profile-ach-goal-progress'}">${progressText}</span></li>`;
      }).join('');
      return items + (gi < _GOAL_AXES_GROUPS.length - 1 ? `<li class="profile-ach-goal-divider"></li>` : '');
    }).join('');
    const _goalsDiv = `<div class="profile-ach-goals-wrap"><span class="profile-ach-goals-header">🎯 다음 업적</span><ul class="profile-ach-goals">${_goalsHtml}</ul></div>`;
    const _achListHtml = `<ul class="profile-ach-list is-hidden">${itemsAll.join('')}</ul>`;
    return `<div class="profile-ach-section" data-ach-count="${earnedIds.size}" data-ach-total="${ACH_DEFS.length}">` +
      `<div class="profile-ach-header">` +
      `<span class="profile-ach-title">🏆 업적 <span class="profile-ach-count">${earnedIds.size} / ${ACH_DEFS.length}</span></span>` +
      `<button class="profile-ach-toggle-btn" type="button">전체보기 ▾</button>` +
      `</div>` +
      `${_goalsDiv}` +
      `${_achListHtml}` +
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
      const _repDef = achId ? ACH_DEFS.find(d => d.id === achId) : null;
      const _repCharPath = _repDef?.rewards?.character
        ? _charImgPath(_repDef.rewards.character)
        : null;
      const panelAvatar = document.querySelector('#profilePanel .profile-panel-avatar');
      if (panelAvatar && _repCharPath) panelAvatar.src = _repCharPath;
      const menuAvatar = document.getElementById('kakaoProfileImg');
      if (menuAvatar && _repCharPath) menuAvatar.src = _repCharPath;
    }
  }

  const _NEXT_ACH_META = {
    balance: { emoji: '🦊', unit: '일' }, play: { emoji: '🐻', unit: '회' },
    new_game: { emoji: '🐰', unit: '종' }, record: { emoji: '🐿', unit: '회' },
    photo: { emoji: '🦔', unit: '장' }, review: { emoji: '🐹', unit: '개' },
    first_record: { emoji: '🦉', unit: '종' }, visit: { emoji: '🐦', unit: '일' },
  };

  function findNextAchievement(preStats) {
    if (!preStats) return null;
    const { achievements, playCount, distinctCount, photoCount, ratingCount, visitCount, participationCount, firstRecordCount, uniqueDayCount } = preStats;
    const earnedIds = new Set((achievements || []).map(a => a.id));
    const COUNTS = { record: playCount, new_game: distinctCount, photo: photoCount, review: ratingCount, visit: visitCount, first_record: firstRecordCount, play: participationCount, balance: uniqueDayCount };
    let best = null, bestGap = Infinity;
    for (const def of ACH_DEFS) {
      if (earnedIds.has(def.id)) continue;
      const gap = def.threshold - (COUNTS[def.type] || 0);
      if (gap > 0 && gap < bestGap) { bestGap = gap; best = def; }
    }
    if (!best) return null;
    const { emoji, unit } = _NEXT_ACH_META[best.type] || { emoji: '🏆', unit: '개' };
    return { emoji, name: best.name, gap: bestGap, unit };
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
    getCharacterPath,
    getCharacterName: (achId) => ACH_DEFS.find(d => d.id === achId)?.rewards?.char_name || null,
    fetchUserStats: (userId, nickname) => _fetchUserStats(window.CottageDB, userId, nickname),
    findNextAchievement,
  };

  window.checkAchievements = checkAchievements;
})();
