import { MOOD_GROUPS } from "./mood-groups.js";
import { PLAY_TAGS } from "./play-tags.js";

export function getMoodGroupById(moodId) {
  return MOOD_GROUPS.find((mood) => mood.id === moodId);
}

export function getPlayTagById(tagId) {
  return PLAY_TAGS.find((tag) => tag.id === tagId);
}

export function getPlayTagsByMoodId(moodId) {
  const mood = getMoodGroupById(moodId);

  if (!mood) return [];

  return mood.tagIds
    .map((tagId) => getPlayTagById(tagId))
    .filter(Boolean);
}

export function gameMatchesMood(game, moodId) {
  if (!moodId) return true;

  const mood = getMoodGroupById(moodId);

  if (!mood) return false;

  const gameMoodIds = game.moodGroupIds || [];
  const gamePlayTagIds = game.playTagIds || [];

  return (
    gameMoodIds.includes(moodId) ||
    mood.tagIds.some((tagId) => gamePlayTagIds.includes(tagId))
  );
}

export function gameMatchesPlayTag(game, tagId) {
  if (!tagId) return true;

  const gamePlayTagIds = game.playTagIds || [];

  return gamePlayTagIds.includes(tagId);
}

export function gameMatchesMoodAndPlayTag(game, moodId, tagId) {
  const moodMatched = gameMatchesMood(game, moodId);
  const tagMatched = gameMatchesPlayTag(game, tagId);

  return moodMatched && tagMatched;
}