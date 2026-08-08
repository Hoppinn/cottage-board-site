(function () {
  // 추천게임 책자(인쇄물)의 인원별 코스를 그대로 옮긴 정적 설정.
  // DB 아님 — 책자가 자주 안 바뀐다는 전제로 코드 배포로만 갱신(2026-08 기획 합의).
  // gameKey는 game-system/game-data/library/3-output/cottage-games-data-output.js
  // (window.gameData)의 키와 반드시 일치해야 한다 — 여기 값을 새로 넣거나 바꿀 땐
  // 그 파일에 실제로 존재하는 키인지 먼저 확인할 것(오타 시 조용히 카드가 빈다).
  //
  // item.type: 'main'(번호 슬롯, 1부터 순서 고정) | 'bonus'(번호 없는 별도 추천,
  //   현재는 4인 전용 코스의 "🔍 추리게임" 박스 하나뿐).
  // item.branchGameKey: 그 메인 게임 오른쪽에 딸린 심화게임. 코스마다 있는 슬롯이
  //   다르다(5~6인은 전부, 7~8인은 1~4만, 인원무관은 전혀 없음) — "홀수 슬롯만 심화"
  //   같은 고정 규칙 아님, 슬롯별로 개별 지정한다.
  // item.note / branchNote: 책자에 인쇄된 한 줄 설명 원문. 2인 커플·3~4인 패밀리·
  //   4인 전용 코스만 책자에 설명 문구가 있고(썸네일도 있음), 5~6인·7~8인·인원무관은
  //   책자가 순수 텍스트 목록이라 원문 설명이 없다 — 그런 슬롯은 null로 두고 화면에서
  //   설명 줄 자체를 생략한다(DB 태그로 대신 지어내지 않는다 — 책자와 다른 문구가
  //   뜨는 걸 막기 위함).
  //
  // ⚠️ 판본 주의(2026-08 매칭 세션에서 실제로 걸렸던 함정들, 재발 방지용 기록):
  //   - "세븐원더스-대결-판테온-확장"을 "7원더스"(베이스판)로 잘못 매칭한 적 있음 —
  //     "7"과 "세븐" 표기 차이로 자동 매칭이 놓쳤다. 대결/듀얼 표기가 있는 항목은
  //     반드시 카탈로그에 전용 듀얼판이 따로 있는지 확인할 것.
  //   - "백로성"(베이스, 1~4인)과 "백로성대결"(2인 전용) 둘 다 카탈로그에 존재 —
  //     책자 텍스트에 "대결"이 안 적혀 있어도 2인 코스 맥락이면 듀얼판이 맞을 수 있다.
  window.BOOKLET_COURSES = [
    {
      id: 'couple-2',
      name: '2인 커플 전략',
      items: [
        { type: 'main', slot: 1, gameKey: '패치워크-크리스마스에디션', note: '엔진빌딩 타일놓기',
          branchGameKey: '로스트시티', branchNote: '2인 전용 카드전' },
        { type: 'main', slot: 2, gameKey: '도망자', note: '카드로 쫓고 쫓기기',
          branchGameKey: null, branchNote: null },
        { type: 'main', slot: 3, gameKey: '코드네임-듀엣', note: '협력형 단어연상',
          branchGameKey: '오라파마인', branchNote: '빛의 반사 추리하기' },
        { type: 'main', slot: 4, gameKey: '스카이팀-난기류확장', note: '주사위로 협력하기',
          branchGameKey: null, branchNote: null },
        { type: 'main', slot: 5, gameKey: '세븐원더스-대결-판테온-확장', note: '문명 카드대결',
          branchGameKey: '백로성대결', branchNote: '주사위 배치전략' },
        { type: 'main', slot: 6, gameKey: '워체스트', note: '추상 형태 대결',
          branchGameKey: null, branchNote: null },
      ],
    },
    {
      id: 'family-3-4',
      name: '3~4인 패밀리',
      items: [
        { type: 'main', slot: 1, gameKey: '꼬치의달인', note: '꼬치 빠르게 만들기',
          branchGameKey: '도블', branchNote: '같은 그림 찾기' },
        { type: 'main', slot: 2, gameKey: '당나귀다리', note: '이야기 기억하기',
          branchGameKey: null, branchNote: null },
        { type: 'main', slot: 3, gameKey: '킹덤오브다이스', note: '변형 야찌',
          branchGameKey: '라스베가스', branchNote: '주사위 점수먹기' },
        { type: 'main', slot: 4, gameKey: '맨덤의던전', note: '블러핑 심리전',
          branchGameKey: null, branchNote: null },
        { type: 'main', slot: 5, gameKey: '이스탄불-주사위게임', note: '주사위 점수내기',
          branchGameKey: '임호텝', branchNote: '눈치게임 점수먹기' },
        { type: 'main', slot: 6, gameKey: '스플렌더', note: '보석 엔진빌딩',
          branchGameKey: null, branchNote: null },
      ],
    },
    {
      id: 'exclusive-4',
      name: '4인 전용',
      items: [
        { type: 'main', slot: 1, gameKey: '스카우트', note: '핸드관리 카드쇼',
          branchGameKey: '로그', branchNote: '포커족보 마작' },
        { type: 'main', slot: 2, gameKey: '봄버스터즈', note: '협동 폭탄해제',
          branchGameKey: '스페이스-크루', branchNote: '미션형 트릭테이킹' },
        { type: 'main', slot: 3, gameKey: '웬디어른이되렴머더미스터리미니', note: '머더미스터리 명작',
          branchGameKey: null, branchNote: null },
        // 번호 슬롯 밖의 별도 추천 박스("🔍 2~4인 추리게임") — 웬디 항목에 합치지 않음.
        { type: 'bonus', gameKey: '탁상탐정단1', subtitle: '진홍의 골동품', note: '몰입형 사건추리' },
      ],
    },
    {
      id: 'party-5-6',
      name: '5~6인',
      // 책자 이 페이지는 순수 텍스트 목록(썸네일·설명 문구 없음) — note는 전부 null.
      items: [
        { type: 'main', slot: 1, gameKey: '저스트원', note: null, branchGameKey: '딕싯', branchNote: null },
        { type: 'main', slot: 2, gameKey: '코드네임', note: null, branchGameKey: '플립7', branchNote: null },
        { type: 'main', slot: 3, gameKey: '카멜업2판', note: null, branchGameKey: '스컬킹', branchNote: null },
        { type: 'main', slot: 4, gameKey: '스컬', note: null, branchGameKey: '페루도', branchNote: null },
        { type: 'main', slot: 5, gameKey: '셀레스티아-빅박스', note: null, branchGameKey: '프리세이지', branchNote: null },
        { type: 'main', slot: 6, gameKey: '메디치', note: null, branchGameKey: '히트', branchNote: null },
      ],
    },
    {
      id: 'party-7-8',
      name: '7~8인',
      // 이 페이지도 순수 텍스트 목록 — note는 전부 null.
      items: [
        { type: 'main', slot: 1, gameKey: '텔레스트레이션', note: null, branchGameKey: '탑텐티비', branchNote: null },
        { type: 'main', slot: 2, gameKey: '뱅-주사위', note: null, branchGameKey: '블러드바운드', branchNote: null },
        { type: 'main', slot: 3, gameKey: '스파이폴', note: null, branchGameKey: '가짜예술가뉴욕에가다', branchNote: null },
        { type: 'main', slot: 4, gameKey: '두부왕국', note: null, branchGameKey: '디셉션', branchNote: null },
        // 책자엔 "머더미스터리 파티 시리즈"로만 표기 — 시리즈 1번인 늑대인간마을의축제로 대표.
        { type: 'main', slot: 5, gameKey: '늑대인간마을의축제미스터리파티시리즈', note: null, branchGameKey: null, branchNote: null },
      ],
    },
    {
      id: 'any-count',
      name: '인원무관',
      // 이 페이지는 썸네일도 설명도 없는 순수 텍스트 목록.
      items: [
        { type: 'main', slot: 1, gameKey: '마헤', note: null, branchGameKey: null, branchNote: null },
        { type: 'main', slot: 2, gameKey: '젝스님트', note: null, branchGameKey: null, branchNote: null },
        { type: 'main', slot: 3, gameKey: '갈팡질팡', note: null, branchGameKey: null, branchNote: null },
        { type: 'main', slot: 4, gameKey: '달무티', note: null, branchGameKey: null, branchNote: null },
        { type: 'main', slot: 5, gameKey: '콘셉트', note: null, branchGameKey: null, branchNote: null },
        { type: 'main', slot: 6, gameKey: '다잉메시지-공범만화가-확장', note: null, branchGameKey: null, branchNote: null },
        { type: 'main', slot: 7, gameKey: '육식동물짓이야', note: null, branchGameKey: null, branchNote: null },
      ],
    },
  ];
})();
