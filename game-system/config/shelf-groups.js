const SHELF_GROUPS = [
  {
    id: "party",
    code: "A",
    label: "파티게임",
    parentId: null,
    sourceValues: ["파티", "파티게임", "party"]
  },
  {
    id: "dexterity",
    code: "A-1",
    label: "몸으로 하는 게임",
    shortLabel: "덱스터리티",
    parentId: "party",
    sourceValues: ["몸", "몸으로 하는 게임", "덱스터리티", "dexterity"]
  },
  {
    id: "puzzle_1000",
    code: "A-2",
    label: "1000피스 직소퍼즐",
    parentId: "party",
    sourceValues: ["퍼즐", "직소퍼즐", "1000피스"]
  },
  {
    id: "toy",
    code: "A-3",
    label: "장난감",
    parentId: "party",
    sourceValues: ["장난감", "toy"]
  },
  {
    id: "poker_mahjong",
    code: "A-4",
    label: "범용코인 · 포커칩 · 마작패",
    parentId: "party",
    sourceValues: ["포커", "마작", "칩", "코인"]
  },
  {
    id: "lost_found",
    code: "A-5",
    label: "고객분실물",
    parentId: "party",
    sourceValues: ["분실물"]
  },
  {
    id: "light_family",
    code: "B",
    label: "라이트패밀리게임",
    parentId: null,
    sourceValues: ["가족", "패밀리", "라이트", "라이트패밀리", "family"]
  },
  {
    id: "easy_coop",
    code: "B-1",
    label: "쉬운 협력게임",
    parentId: "light_family",
    sourceValues: ["쉬운협력", "쉬운 협력", "협력쉬움"]
  },
  {
    id: "heavy_strategy",
    code: "C",
    label: "헤비 전략게임",
    shortLabel: "고웨이트 전략",
    parentId: null,
    sourceValues: ["전략", "헤비", "고웨이트", "heavy", "strategy"]
  },
  {
    id: "hard_coop",
    code: "C-1",
    label: "어려운 협력게임",
    parentId: "heavy_strategy",
    sourceValues: ["어려운협력", "어려운 협력", "협력어려움"]
  },
  {
    id: "mini_box",
    code: "D",
    label: "작은상자에 담긴 게임",
    shortLabel: "작은상자게임",
    parentId: null,
    sourceValues: ["작은", "작은상자", "미니", "mini"]
  },
  {
    id: "two_player_best",
    code: "E",
    label: "2인 베스트게임",
    parentId: null,
    sourceValues: ["2인", "두명", "2인베스트", "two"]
  },
  {
    id: "etc_space",
    code: "F",
    label: "기타공간",
    parentId: null,
    sourceValues: ["기타", "기타공간", "etc"]
  }
];

function normalizeShelfValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function getShelfGroupById(id) {
  return SHELF_GROUPS.find((shelf) => shelf.id === id);
}

function getShelfGroupByCode(code) {
  return SHELF_GROUPS.find((shelf) => shelf.code === code);
}

function getShelfGroupBySourceValue(value) {
  const normalized = normalizeShelfValue(value);

  if (!normalized) return null;

  return SHELF_GROUPS.find((shelf) => {
    const candidates = [
      shelf.id,
      shelf.code,
      shelf.label,
      shelf.shortLabel,
      ...(shelf.sourceValues || [])
    ];

    return candidates
      .map(normalizeShelfValue)
      .includes(normalized);
  });
}

function getShelfGroupDisplay(id) {
  const shelf = getShelfGroupById(id);

  if (!shelf) {
    return {
      shelfGroupId: "",
      shelfLabel: "-",
      shelfFullLabel: "-"
    };
  }

  const parent = shelf.parentId
    ? getShelfGroupById(shelf.parentId)
    : null;

  return {
    shelfGroupId: shelf.id,
    shelfLabel: shelf.label,
    shelfFullLabel: parent
      ? `${parent.label} - ${shelf.label}`
      : shelf.label
  };
}

function sortShelfGroupsByCode(a, b) {
  return a.code.localeCompare(b.code, "ko", { numeric: true });
}

module.exports = {
  SHELF_GROUPS,
  getShelfGroupById,
  getShelfGroupByCode,
  getShelfGroupBySourceValue,
  getShelfGroupDisplay,
  sortShelfGroupsByCode
};