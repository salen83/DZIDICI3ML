import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import "./index.css";

// ✅ SENTRY
import * as Sentry from "@sentry/react";

// ✅ LOGROCKET
import LogRocket from "logrocket";

// 🔥 INIT SENTRY
Sentry.init({
  dsn: "https://7e55eb4e830c3594d3f52ea3b8dd95d0@o4511191897669632.ingest.de.sentry.io/4511191918510160",
  tracesSampleRate: 1.0,
  attachStacktrace: true,
});

// 🔥 INIT LOGROCKET
LogRocket.init("ovblkx/myapp");

// 🧪 TEST SENTRY (obriši posle testa)
setTimeout(() => {
  throw new Error("TEST SENTRY");
}, 3000);

// ✅ RENDER
const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <Sentry.ErrorBoundary fallback={"Došlo je do greške"}>
    <App />
  </Sentry.ErrorBoundary>
);
