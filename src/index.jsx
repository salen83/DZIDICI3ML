import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import "./index.css";

import LogRocket from "logrocket";
import eruda from "eruda";

/* =========================
   🧠 GLOBAL INSTRUMENTATION
   ========================= */

(function installInstrumentation() {
  const original = {
    log: console.log,
    warn: console.warn,
    error: console.error,
  };

  window.__DEBUG_LOGS__ = [];

  function formatStack(stack) {
    if (!stack) return "No stack";

    return stack
      .split("\n")
      .slice(0, 6)
      .map((line) => {
        const match = line.match(/(\/src\/.*?\.\w+:\d+:\d+)/);
        return match ? "👉 " + match[1] : line;
      })
      .join("\n");
  }

  function push(type, payload) {
    let msg = "";
    let stack = null;

    if (Array.isArray(payload)) {
      msg = payload.map(a => String(a)).join(" ");
    } else {
      msg = payload.args?.map(a => String(a)).join(" ");
      stack = payload.stack;
    }

    window.__DEBUG_LOGS__.push({
      type,
      msg,
      stack: formatStack(stack || new Error().stack),
      time: Date.now(),
    });

    if (window.__DEBUG_LOGS__.length > 300) {
      window.__DEBUG_LOGS__.shift();
    }
  }

  console.log = (...args) => {
    push("log", args);
    original.log(...args);
  };

  console.warn = (...args) => {
    push("warn", args);
    original.warn(...args);
  };

  console.error = (...args) => {
    let stack = null;

    for (let a of args) {
      if (a instanceof Error) stack = a.stack;
    }

    push("error", {
      args,
      stack: stack || null
    });

    original.error(...args);
  };

  window.addEventListener("error", (e) => {
    push("window-error", {
      args: [e.message],
      stack: e.error?.stack
    });
  });

  window.addEventListener("unhandledrejection", (e) => {
    push("promise", {
      args: [String(e.reason)],
      stack: e.reason?.stack
    });
  });

  console.log("🔥 DEBUG SYSTEM ACTIVE");
})();

/* =========================
   INIT SENTRY + LOGROCKET
   ========================= */

  tracesSampleRate: 1.0,
  attachStacktrace: true,
  release: "sofa-app@1.0.0"
});

LogRocket.init("ovblkx/myapp");

/* =========================
   ERUDA
   ========================= */

if (process.env.NODE_ENV === "development") {
  try {
    eruda.init();
  } catch {}
}

/* =========================
   APP WRAPPER
   ========================= */

const AppWrapper = () => {
  return (
<>
  <App />
</>
  );
};

/* =========================
   RENDER
   ========================= */

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
    <AppWrapper />
);
