import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import * as Sentry from "@sentry/react";
import LogRocket from "logrocket";
import eruda from "eruda";

Sentry.init({
  dsn: "https://7e55eb4e830c3594d3f52ea3b8dd95d0@o4511191897669632.ingest.de.sentry.io/4511191918510160",
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
  <Sentry.ErrorBoundary fallback={"Error"}>
    <App />
  </Sentry.ErrorBoundary>
);
