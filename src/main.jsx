import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import LogRocket from "logrocket";
import eruda from "eruda";

LogRocket.init("ovblkx/myapp");

if (import.meta.env.DEV) {
  try {
    eruda.init();
  } catch {}
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <App />
);
