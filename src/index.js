import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { MatchesProvider } from "./MatchesContext";
import { SofaProvider } from "./SofaContext";
import { LeagueTeamProvider } from "./LeagueTeamContext";
import { TeamMapProvider } from "./TeamMapContext";
import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <LeagueTeamProvider>
    <TeamMapProvider>
      <SofaProvider>
        <MatchesProvider>
          <App />
        </MatchesProvider>
      </SofaProvider>
    </TeamMapProvider>
  </LeagueTeamProvider>
);
