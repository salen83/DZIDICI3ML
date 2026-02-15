import React, { useState } from "react";
import Screen1 from "./screens/Screen1";
import Screen2 from "./screens/Screen2";
import Screen2Liga from "./screens/Screen2Liga";
import Screen3 from "./screens/Screen3";
import Screen4 from "./screens/Screen4";
import Screen5 from "./screens/Screen5";
import Screen6 from "./screens/Screen6";
import Screen7 from "./screens/Screen7";
import Screen8 from "./screens/Screen8";
import Screen9 from "./screens/Screen9";
import Screen10 from "./screens/Screen10";
import Screen11 from "./screens/Screen11";
import Screen12 from "./screens/Screen12";
import ScreenJson from "./screens/ScreenJson";
import SofaScreen from "./screens/SofaScreen";
import MapScreen from "./screens/MapScreen";
import TeamMapScreen from "./screens/TeamMapScreen";
import LeagueTeamScreen from "./screens/LeagueTeamScreen";

import { MatchesProvider } from "./MatchesContext";
import { TeamMapProvider } from "./TeamMapContext";
import { SofaProvider } from "./SofaContext";
import { LeagueMapProvider } from "./LeagueMapContext";
import { MapScreenProvider } from "./MapScreenContext";
import { LeagueTeamProvider } from "./LeagueTeamContext";

import TicketPanel from "./components/TicketPanel";
import "./App.css";

const screens = [
  { key: "screen1", title: "Rezultati" },
  { key: "screen9", title: "Tiketi" },
  { key: "screen3", title: "Ponuda" },
  { key: "screen2", title: "Statistika timova" },
  { key: "screen2Liga", title: "Statistika lige" },
  { key: "screen4", title: "Predikcija" },
  { key: "screen5", title: "Rang GG" },
  { key: "screen6", title: "Rang NG" },
  { key: "screen7", title: "Rang 2+" },
  { key: "screen8", title: "Rang 7+" },
  { key: "screen10", title: "Poisson Stats" },
  { key: "screen11", title: "Hybrid+Poisson" },
  { key: "screen12", title: "Final Mixer" }
];

export default function App() {
  const [currentScreenIndex, setCurrentScreenIndex] = useState(0);

  const [jsonMode, setJsonMode] = useState(false);
  const [sofaMode, setSofaMode] = useState(false);
  const [mapMode, setMapMode] = useState(false);
  const [teamMapMode, setTeamMapMode] = useState(false);
  const [leagueTeamMode, setLeagueTeamMode] = useState(false);

  const [prevScreenIndex, setPrevScreenIndex] = useState(0);

  const renderNormalScreen = () => {
    switch (screens[currentScreenIndex].key) {
      case "screen1": return <Screen1 />;
      case "screen2": return <Screen2 />;
      case "screen2Liga": return <Screen2Liga />;
      case "screen3": return <Screen3 />;
      case "screen4": return <Screen4 />;
      case "screen5": return <Screen5 />;
      case "screen6": return <Screen6 />;
      case "screen7": return <Screen7 />;
      case "screen8": return <Screen8 />;
      case "screen9": return <Screen9 />;
      case "screen10": return <Screen10 />;
      case "screen11": return <Screen11 />;
      case "screen12": return <Screen12 />;
      default: return <Screen1 />;
    }
  };

  const openMode = (setter) => {
    setPrevScreenIndex(currentScreenIndex);
    setter(true);
  };

  const closeMode = (setter) => {
    setter(false);
    setCurrentScreenIndex(prevScreenIndex);
  };

  return (
    <LeagueTeamProvider>
      <SofaProvider>
        <MatchesProvider>
          <TeamMapProvider>
            <LeagueMapProvider>
              <MapScreenProvider>
                <div>
                  <div className="top-bar">
                    <button
                      style={{ marginRight: 5, backgroundColor: "#a5d6a7", fontWeight: "bold" }}
                      onClick={() => openMode(setMapMode)}
                      disabled={mapMode || sofaMode || jsonMode || teamMapMode || leagueTeamMode}
                    >
                      MAP
                    </button>

                    <button
                      style={{ marginRight: 5, backgroundColor: "#ce93d8", fontWeight: "bold" }}
                      onClick={() => openMode(setLeagueTeamMode)}
                      disabled={leagueTeamMode || mapMode || sofaMode || jsonMode || teamMapMode}
                    >
                      LEAGUE / TEAM
                    </button>

                    <button
                      style={{ marginRight: 5, backgroundColor: "#90caf9", fontWeight: "bold" }}
                      onClick={() => openMode(setSofaMode)}
                      disabled={sofaMode || jsonMode || mapMode || teamMapMode || leagueTeamMode}
                    >
                      SOFA
                    </button>

                    <button
                      onClick={() => setCurrentScreenIndex(i => Math.max(i - 1, 0))}
                      disabled={currentScreenIndex === 0 || mapMode || sofaMode || jsonMode || teamMapMode || leagueTeamMode}
                    >
                      ◀
                    </button>

                    <button
                      style={{ marginRight: 5, backgroundColor: "#ffab91", fontWeight: "bold" }}
                      onClick={() => openMode(setTeamMapMode)}
                      disabled={teamMapMode || mapMode || sofaMode || jsonMode || leagueTeamMode}
                    >
                      TEAM MAP
                    </button>

                    <span>
                      {leagueTeamMode ? "LEAGUE / TEAM SCREEN" :
                       teamMapMode ? "TEAM MAP SCREEN" :
                       mapMode ? "MAP SCREEN" :
                       sofaMode ? "SOFA SCREEN" :
                       jsonMode ? "JSON SCREEN" :
                       screens[currentScreenIndex].title}
                    </span>

                    <button
                      onClick={() => setCurrentScreenIndex(i => Math.min(i + 1, screens.length - 1))}
                      disabled={currentScreenIndex === screens.length - 1 || mapMode || sofaMode || jsonMode || teamMapMode || leagueTeamMode}
                    >
                      ▶
                    </button>

                    <button
                      style={{ marginLeft: 10, backgroundColor: "#ffeb3b", fontWeight: "bold" }}
                      onClick={() => openMode(setJsonMode)}
                      disabled={jsonMode || sofaMode || mapMode || teamMapMode || leagueTeamMode}
                    >
                      JSON
                    </button>
                  </div>

                  <div className="screen-container">
                    {leagueTeamMode ? <LeagueTeamScreen onClose={() => closeMode(setLeagueTeamMode)} /> :
                     teamMapMode ? <TeamMapScreen onClose={() => closeMode(setTeamMapMode)} /> :
                     mapMode ? <MapScreen onClose={() => closeMode(setMapMode)} /> :
                     sofaMode ? <SofaScreen onClose={() => closeMode(setSofaMode)} /> :
                     jsonMode ? <ScreenJson onClose={() => closeMode(setJsonMode)} /> :
                     renderNormalScreen()}
                  </div>

                  <TicketPanel />
                </div>
              </MapScreenProvider>
            </LeagueMapProvider>
          </TeamMapProvider>
        </MatchesProvider>
      </SofaProvider>
    </LeagueTeamProvider>
  );
}
