import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import LogRocket from "logrocket";
import eruda from "eruda";
import { brutalDebug } from "./brutalDebug";
import { BrutalTracer } from "./brutalTracer";

LogRocket.init("ovblkx/myapp");

if (import.meta.env.DEV) {
  try {
    eruda.init();
    brutalDebug();
  } catch {}
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <App />
);
