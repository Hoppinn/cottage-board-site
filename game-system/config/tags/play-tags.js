export const PLAY_TAGS = [
  { id: "bluffing", label: "블러핑 · 속임수" },
  { id: "speed", label: "순발력" },
  { id: "mafia", label: "마피아" },
  { id: "word_association", label: "단어연상" },
  { id: "push_your_luck", label: "운 시험" },
  { id: "mind_game", label: "눈치 · 심리전" },
  { id: "hidden_role", label: "정체 숨기기" },
  { id: "deduction", label: "추리" },
  { id: "engine_building", label: "엔진빌딩" },
  { id: "set_collection", label: "셋컬렉션" },
  { id: "cooperative", label: "협력" },
  { id: "story", label: "스토리" },
  { id: "puzzle", label: "퍼즐" }
];

// play-tag id → 태그 객체 반환
export function getPlayTagById(tagId) {
  return PLAY_TAGS.find(t => t.id === tagId);
}