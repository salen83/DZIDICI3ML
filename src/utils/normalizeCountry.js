export function normalizeCountry(input) {
  if (!input) return "";

  return input
    .trim()
    .replace(/&/g, "and")
    .replace(/\s+/g, " ")
    .toLowerCase();
}
