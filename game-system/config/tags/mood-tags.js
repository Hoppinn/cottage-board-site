export const MOOD_GROUPS = [
  {
    id: "loud",
    label: "떠들썩한",
    icon: "🎉",
    tagIds: ["bluffing", "speed", "mafia", "word_association"]
  },

  {
    id: "tense",
    label: "쫄리는",
    icon: "😮",
    tagIds: ["bluffing", "push_your_luck", "mind_game", "hidden_role"]
  },

  {
    id: "brain",
    label: "머리쓰는",
    icon: "🧠",
    tagIds: ["deduction", "engine_building", "set_collection"]
  },

  {
    id: "relax",
    label: "편안한",
    icon: "🍀",
    tagIds: ["cooperative", "story", "puzzle"]
  },

  {
    id: "immersive",
    label: "몰입되는",
    icon: "📖",
    tagIds: ["story", "deduction", "engine_building"]
  }
];

// 상위 mood 선택 → 연관 play-tags 확인용 함수
export function getTagsByMoodId(moodId) {
  const mood = MOOD_GROUPS.find(m => m.id === moodId);
  return mood ? mood.tagIds : [];
}