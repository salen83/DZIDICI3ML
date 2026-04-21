import React, { useEffect, useState } from "react";

function extractSource(stack) {
  if (!stack) return "no-stack";

  const lines = stack.split("\n");

  for (let l of lines) {
    if (l.includes("src/")) {
      return l.trim();
    }
  }

  return lines[1]?.trim() || "unknown";
}

export default function DebugOverlay() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const i = setInterval(() => setTick(t => t + 1), 500);
    return () => clearInterval(i);
  }, []);

  const logs = window.__DEBUG_LOGS__ || [];

  return (
    <div style={styles.box}>
      <div style={styles.title}>🧠 DEVTOOLS PRO</div>

      <div>🔁 Renders: {window.__RENDER_COUNT__}</div>
      <div>⚡ Burst: {window.__RENDER_BURST__}</div>

      <div>📦 Logs: {logs.length}</div>

      <div style={styles.logBox}>
        {logs.slice(-20).reverse().map((l, i) => (
          <div key={i} style={{ marginBottom: 6 }}>
            <div style={{ color: l.type === "error" ? "red" : "lime" }}>
              [{l.type}] {l.msg?.slice?.(0, 80)}
            </div>

            {/* 🔥 OVO JE KLJUČ */}
            <div style={{ color: "#888", fontSize: 10 }}>
              📍 {extractSource(l.stack)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  box: {
    position: "fixed",
    right: 10,
    bottom: 10,
    width: 360,
    maxHeight: 420,
    background: "#000",
    color: "#0f0",
    fontSize: 11,
    zIndex: 999999,
    padding: 10,
    overflow: "auto",
    border: "1px solid #0f0",
  },
  title: { fontWeight: "bold", marginBottom: 6 },
  logBox: { marginTop: 8, maxHeight: 300, overflowY: "auto" },
};
