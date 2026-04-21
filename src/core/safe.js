export const safeArray = (v) => Array.isArray(v) ? v : [];
export const safeObject = (v) => v && typeof v === "object" ? v : {};
export const safeString = (v) => typeof v === "string" ? v : "";
