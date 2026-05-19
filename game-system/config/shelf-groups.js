export const SHELF_GROUPS = [
  {
    id: "party",
    code: "A",
    label: "파티게임",
    parentId: null
  },

  {
    id: "dexterity",
    code: "A-1",
    label: "몸으로 하는 게임",
    shortLabel: "덱스터리티",
    parentId: "party"
  },

  {
    id: "puzzle_1000",
    code: "A-2",
    label: "1000피스 직소퍼즐",
    parentId: "party"
  },

  {
    id: "toy",
    code: "A-3",
    label: "장난감",
    parentId: "party"
  },

  {
    id: "poker_mahjong",
    code: "A-4",
    label: "범용코인 · 포커칩 · 마작패",
    parentId: "party"
  },

  {
    id: "lost_found",
    code: "A-5",
    label: "고객분실물",
    parentId: "party"
  },

  {
    id: "light_family",
    code: "B",
    label: "라이트패밀리게임",
    parentId: null
  },

  {
    id: "easy_coop",
    code: "B-1",
    label: "쉬운 협력게임",
    parentId: "light_family"
  },

  {
    id: "heavy_strategy",
    code: "C",
    label: "헤비 전략게임",
    shortLabel: "고웨이트 전략",
    parentId: null
  },

  {
    id: "hard_coop",
    code: "C-1",
    label: "어려운 협력게임",
    parentId: "heavy_strategy"
  },

  {
    id: "mini_box",
    code: "D",
    label: "작은상자에 담긴 게임",
    shortLabel: "작은상자게임",
    parentId: null
  },

  {
    id: "two_player_best",
    code: "E",
    label: "2인 베스트게임",
    parentId: null
  },

  {
    id: "etc_space",
    code: "F",
    label: "기타공간",
    parentId: null
  }
];

export function getShelfGroupById(id) {
  return SHELF_GROUPS.find((shelf) => shelf.id === id);
}

export function getShelfGroupByCode(code) {
  return SHELF_GROUPS.find((shelf) => shelf.code === code);
}

export function sortShelfGroupsByCode(a, b) {
  return a.code.localeCompare(b.code, "ko", { numeric: true });
}