import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { MatchesProvider } from "./MatchesContext";
import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <MatchesProvider>
    <App />
  </MatchesProvider>
);
