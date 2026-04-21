export function installGlobalInstrumentation() {
  // =============================
  // 1. CONSOLE CAPTURE
  // =============================
  const original = {
    log: console.log,
    warn: console.warn,
    error: console.error,
  };

  window.__DEBUG_LOGS__ = [];

  function push(type, args) {
    const msg = args
      .map(a => {
        try {
          return typeof a === "object" ? JSON.stringify(a) : String(a);
        } catch {
          return String(a);
        }
      })
      .join(" ");

    window.__DEBUG_LOGS__.push({
      type,
      msg,
      time: Date.now(),
      stack: new Error().stack,
    });

    if (window.__DEBUG_LOGS__.length > 200) {
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
    push("error", args);
    original.error(...args);
  };

  // =============================
  // 2. GLOBAL ERROR CAPTURE
  // =============================
  window.addEventListener("error", (e) => {
    window.__DEBUG_LOGS__.push({
      type: "window-error",
      msg: e.message,
      stack: e.error?.stack,
      time: Date.now(),
    });
  });

  window.addEventListener("unhandledrejection", (e) => {
    window.__DEBUG_LOGS__.push({
      type: "promise-rejection",
      msg: e.reason?.message || String(e.reason),
      stack: e.reason?.stack,
      time: Date.now(),
    });
  });

  // =============================
  // 3. REACT RENDER COUNTER (global hook)
  // =============================
  let renderCount = 0;

  const React = window.React;
  if (React && React.createElement) {
    const originalCreateElement = React.createElement;

    React.createElement = function (...args) {
      renderCount++;

      window.__RENDER_COUNT__ = renderCount;

      return originalCreateElement.apply(this, args);
    };
  }

  // =============================
  // 4. LOOP DETECTOR
  // =============================
  let lastRenderTime = Date.now();
  let renderBurst = 0;

  setInterval(() => {
    const now = Date.now();
    const diff = now - lastRenderTime;

    if (diff < 50) {
      renderBurst++;
    } else {
      renderBurst = 0;
    }

    lastRenderTime = now;

    window.__RENDER_BURST__ = renderBurst;
  }, 50);

  // =============================
  // 5. PROVIDER TRACE (approx)
  // =============================
  window.__PROVIDER_STACK__ = [];

  const origLog = console.log;
  console.log = (...args) => {
    const str = args.join(" ");
    if (str.includes("Provider")) {
      window.__PROVIDER_STACK__.push(str);
    }
    origLog(...args);
  };
}
