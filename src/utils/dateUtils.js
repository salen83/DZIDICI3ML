export const dateValue = (value) => {
  if (!value) return 0;

  const t = new Date(value).getTime();

  return Number.isFinite(t) ? t : 0;
};
