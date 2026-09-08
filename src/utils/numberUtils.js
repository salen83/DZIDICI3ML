export const num = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};
export const pct = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;

  return Math.max(0, Math.min(100, n));
};
export const safeDiv = (a, b) => {
  const denominator = Number(b);
  if (!denominator) return 0;

  return Number(a || 0) / denominator;
};
export const round = (value, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round((Number(value) || 0) * factor) / factor;
};
export const percent = (value) => `${round(pct(value), 1)}%`;
