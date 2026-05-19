export const DIFFICULTY_LEVELS = [
  {
    id: "kids",

    label: "아이도 할 수 있어요",
    shortLabel: "아이도가능",

    icon: "😊",

    className: "difficulty-kids",

    minWeight: 0,
    maxWeight: 1.10
  },

  {
    id: "beginner",

    label: "입문 추천",
    shortLabel: "입문추천",

    icon: "🌱",

    className: "difficulty-beginner",

    minWeight: 1.11,
    maxWeight: 1.50
  },

  {
    id: "light_family",

    label: "라이트 · 패밀리",
    shortLabel: "라이트패밀리",

    icon: "🏡",

    className: "difficulty-light",

    minWeight: 1.51,
    maxWeight: 2.50
  },

  {
    id: "heavy_mania",

    label: "헤비 · 매니아",
    shortLabel: "헤비매니아",

    icon: "🧠",

    className: "difficulty-heavy",

    minWeight: 2.51,
    maxWeight: 3.50
  },

  {
    id: "hardcore",

    label: "하드코어",
    shortLabel: "하드코어",

    icon: "😈",

    className: "difficulty-hardcore",

    minWeight: 3.51,
    maxWeight: 5.00
  }
];

export function getDifficultyData(weight) {

  return DIFFICULTY_LEVELS.find((level) => {

    return (
      weight >= level.minWeight &&
      weight <= level.maxWeight
    );

  });

}

export function getDifficultyById(id) {

  return DIFFICULTY_LEVELS.find((level) => {

    return level.id === id;

  });

}