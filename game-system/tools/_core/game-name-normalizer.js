function normalizeGameName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[’'"]/g, "")
    .replace(/[:\-–—_/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

module.exports = {
  normalizeGameName,
};