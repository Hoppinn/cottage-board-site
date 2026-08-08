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
        { type: 'main', slot: 1, gameKey: '패치워크-크리스마스에디션', branchGameKey: '로스트시티' },
        { type: 'main', slot: 2, gameKey: '도망자', branchGameKey: null },
        { type: 'main', slot: 3, gameKey: '코드네임-듀엣', branchGameKey: '오라파마인' },
        { type: 'main', slot: 4, gameKey: '스카이팀-난기류확장', branchGameKey: null },
        { type: 'main', slot: 5, gameKey: '세븐원더스-대결-판테온-확장', branchGameKey: '백로성대결' },
        { type: 'main', slot: 6, gameKey: '워체스트', branchGameKey: null },
      ],
    },
    {
      id: 'family-3-4',
      name: '3~4인 패밀리',
      items: [
        { type: 'main', slot: 1, gameKey: '꼬치의달인', branchGameKey: '도블' },
        { type: 'main', slot: 2, gameKey: '당나귀다리', branchGameKey: null },
        { type: 'main', slot: 3, gameKey: '킹덤오브다이스', branchGameKey: '라스베가스' },
        { type: 'main', slot: 4, gameKey: '맨덤의던전', branchGameKey: null },
        { type: 'main', slot: 5, gameKey: '이스탄불-주사위게임', branchGameKey: '임호텝' },
        { type: 'main', slot: 6, gameKey: '스플렌더', branchGameKey: null },
      ],
    },
    {
      id: 'exclusive-4',
      name: '4인 전용',
      items: [
        { type: 'main', slot: 1, gameKey: '스카우트', branchGameKey: '로그' },
        { type: 'main', slot: 2, gameKey: '봄버스터즈', branchGameKey: '스페이스-크루' },
        { type: 'main', slot: 3, gameKey: '웬디어른이되렴머더미스터리미니', branchGameKey: null },
        // 번호 슬롯 밖의 별도 추천 박스("🔍 2~4인 추리게임") — 웬디 항목에 합치지 않음.
        { type: 'bonus', gameKey: '탁상탐정단1', subtitle: '진홍의 골동품' },
      ],
    },
    {
      id: 'party-5-6',
      name: '5~6인',
      items: [
        { type: 'main', slot: 1, gameKey: '저스트원', branchGameKey: '딕싯' },
        { type: 'main', slot: 2, gameKey: '코드네임', branchGameKey: '플립7' },
        { type: 'main', slot: 3, gameKey: '카멜업2판', branchGameKey: '스컬킹' },
        { type: 'main', slot: 4, gameKey: '스컬', branchGameKey: '페루도' },
        { type: 'main', slot: 5, gameKey: '셀레스티아-빅박스', branchGameKey: '프리세이지' },
        { type: 'main', slot: 6, gameKey: '메디치', branchGameKey: '히트' },
      ],
    },
    {
      id: 'party-7-8',
      name: '7~8인',
      items: [
        { type: 'main', slot: 1, gameKey: '텔레스트레이션', branchGameKey: '탑텐티비' },
        { type: 'main', slot: 2, gameKey: '뱅-주사위', branchGameKey: '블러드바운드' },
        { type: 'main', slot: 3, gameKey: '스파이폴', branchGameKey: '가짜예술가뉴욕에가다' },
        { type: 'main', slot: 4, gameKey: '두부왕국', branchGameKey: '디셉션' },
        // 책자엔 "머더미스터리 파티 시리즈"로만 표기 — 시리즈 1번인 늑대인간마을의축제로 대표.
        { type: 'main', slot: 5, gameKey: '늑대인간마을의축제미스터리파티시리즈', branchGameKey: null },
      ],
    },
    {
      id: 'any-count',
      name: '인원무관',
      items: [
        { type: 'main', slot: 1, gameKey: '마헤', branchGameKey: null },
        { type: 'main', slot: 2, gameKey: '젝스님트', branchGameKey: null },
        { type: 'main', slot: 3, gameKey: '갈팡질팡', branchGameKey: null },
        { type: 'main', slot: 4, gameKey: '달무티', branchGameKey: null },
        { type: 'main', slot: 5, gameKey: '콘셉트', branchGameKey: null },
        { type: 'main', slot: 6, gameKey: '다잉메시지-공범만화가-확장', branchGameKey: null },
        { type: 'main', slot: 7, gameKey: '육식동물짓이야', branchGameKey: null },
      ],
    },
  ];
})();
