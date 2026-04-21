import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import LogRocket from "logrocket";
import eruda from "eruda";

  tracesSampleRate: 1.0,
  attachStacktrace: true
});

LogRocket.init("ovblkx/myapp");

if (import.meta.env.DEV) {
  try {
    eruda.init();
  } catch {}
}

ReactDOM.createRoot(document.getElementById("root")).render(
    <App />
);
