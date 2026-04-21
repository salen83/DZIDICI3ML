import React, { useState } from "react";

export default function DevToolsPanel() {
  const [open, setOpen] = useState(false);
  const logs = window.__DEBUG_LOGS__ || [];

  const clear = () => {
    window.__DEBUG_LOGS__ = [];
    setOpen(false);
    setTimeout(() => setOpen(true), 50);
  };

  return (
    <>
      {/* FLOAT BUTTON */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          zIndex: 99999,
          padding: "10px 14px",
          background: "#000",
          color: "#0f0",
          border: "1px solid #0f0",
          fontSize: 12,
        }}
      >
        DEV
      </button>

      {/* PANEL */}
      {open && (
        <div
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            width: "100%",
            height: "50%",
            background: "black",
            color: "#0f0",
            zIndex: 99998,
            overflow: "auto",
            fontSize: 11,
            padding: 10,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <b>🔥 DEVTOOLS</b>
            <div>
              <button onClick={clear}>CLEAR</button>
              <button onClick={() => setOpen(false)}>CLOSE</button>
            </div>
          </div>

          <hr />

          {/* SYSTEM INFO */}
          <div>
            <div>Render count: {window.__RENDER_COUNT__}</div>
            <div>Render burst: {window.__RENDER_BURST__}</div>
          </div>

          <hr />

          {/* LOGS */}
          {logs.slice(-200).map((l, i) => (
            <div
              key={i}
              onClick={() => console.log(l.stack)}
              style={{
                borderBottom: "1px solid #222",
                padding: 6,
                cursor: "pointer",
              }}
            >
              <div>
                <b>[{l.type}]</b> {l.msg}
              </div>
              {l.stack && (
                <pre style={{ color: "#888", whiteSpace: "pre-wrap" }}>
                  {l.stack}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
