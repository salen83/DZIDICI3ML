const cache = new Map();
let lastWrite = 0;

export function safeSet(key, value) {
  try {
    const now = Date.now();

    if (now - lastWrite < 1500) return;

    const json = JSON.stringify(value);

    if (cache.get(key) === json) return;

    cache.set(key, json);
    lastWrite = now;

    localStorage.setItem(key, json);
  } catch (e) {
    console.error("Storage error:", e);

    if (e.name === "QuotaExceededError") {
      console.warn("⚠️ Storage full → clearing key:", key);
      localStorage.removeItem(key);
    }
  }
}

export function safeGet(key, fallback = null) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}
