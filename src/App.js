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
import NormalisedTeamMapScreen from "./screens/NormalisedTeamMapScreen";
import LeagueTeamScreen from "./screens/LeagueTeamScreen";
import LeagueMapScreen from "./screens/LeagueMapScreen";

import { MatchesProvider } from "./MatchesContext";
import { NormalisedTeamMapProvider } from "./NormalisedTeamMapContext";
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
  const [leagueMapMode, setLeagueMapMode] = useState(false); // ✅ novi mode

  const [menuOpen, setMenuOpen] = useState(false);
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
    setMenuOpen(false);
  };

  const closeMode = (setter) => {
    setter(false);
    setCurrentScreenIndex(prevScreenIndex);
  };

  return (
    <LeagueTeamProvider>
      <SofaProvider>
        <MatchesProvider>
          <NormalisedTeamMapProvider>
            <LeagueMapProvider>
              <MapScreenProvider>
                <div>
                  <div className="top-bar">
                    <button
                      onClick={() => setMenuOpen(!menuOpen)}
                      style={{ marginRight: 10, fontWeight: "bold", backgroundColor: "#ffab91" }}
                    >
                      MENU
                    </button>

                    <button
                      onClick={() => setCurrentScreenIndex(i => Math.max(i - 1, 0))}
                      disabled={currentScreenIndex === 0 || mapMode || sofaMode || jsonMode || teamMapMode || leagueTeamMode || leagueMapMode}
                    >
                      ◀
                    </button>

                    <span style={{ margin: "0 10px" }}>
                      {leagueTeamMode ? "LEAGUE / TEAM SCREEN" :
                       teamMapMode ? "NORMALISED TEAM MAP SCREEN" :
                       mapMode ? "MAP SCREEN" :
                       sofaMode ? "SOFA SCREEN" :
                       jsonMode ? "JSON SCREEN" :
                       leagueMapMode ? "LEAGUE MAP SCREEN" :
                       screens[currentScreenIndex].title}
                    </span>

                    <button
                      onClick={() => setCurrentScreenIndex(i => Math.min(i + 1, screens.length - 1))}
                      disabled={currentScreenIndex === screens.length - 1 || mapMode || sofaMode || jsonMode || teamMapMode || leagueTeamMode || leagueMapMode}
                    >
                      ▶
                    </button>
                  </div>

                  {menuOpen && (
                    <div className="menu-panel">
                      <button
                        onClick={() => openMode(setMapMode)}
                        disabled={mapMode || sofaMode || jsonMode || teamMapMode || leagueTeamMode || leagueMapMode}
                      >
                        MAP
                      </button>
                      <button
                        onClick={() => openMode(setLeagueTeamMode)}
                        disabled={leagueTeamMode || mapMode || sofaMode || jsonMode || teamMapMode || leagueMapMode}
                      >
                        LEAGUE / TEAM
                      </button>
                      <button
                        onClick={() => openMode(setSofaMode)}
                        disabled={sofaMode || jsonMode || mapMode || teamMapMode || leagueTeamMode || leagueMapMode}
                      >
                        SOFA
                      </button>
                      <button
                        onClick={() => openMode(setJsonMode)}
                        disabled={jsonMode || sofaMode || mapMode || teamMapMode || leagueTeamMode || leagueMapMode}
                      >
                        JSON
                      </button>
                      <button
                        onClick={() => openMode(setTeamMapMode)}
                        disabled={teamMapMode || mapMode || sofaMode || jsonMode || leagueTeamMode || leagueMapMode}
                      >
                        NORMALISED TEAM MAP
                      </button>
                      <button
                        onClick={() => openMode(setLeagueMapMode)}
                        disabled={leagueMapMode || teamMapMode || mapMode || sofaMode || jsonMode || leagueTeamMode}
                      >
                        LEAGUE MAP
                      </button>
                    </div>
                  )}

                  <div className="screen-container">
                    {leagueTeamMode ? <LeagueTeamScreen onClose={() => closeMode(setLeagueTeamMode)} /> :
                     teamMapMode ? <NormalisedTeamMapScreen onClose={() => closeMode(setTeamMapMode)} /> :
                     mapMode ? <MapScreen onClose={() => closeMode(setMapMode)} /> :
                     sofaMode ? <SofaScreen onClose={() => closeMode(setSofaMode)} /> :
                     jsonMode ? <ScreenJson onClose={() => closeMode(setJsonMode)} /> :
                     leagueMapMode ? <LeagueMapScreen onClose={() => closeMode(setLeagueMapMode)} /> :
                     renderNormalScreen()}
                  </div>

                  <TicketPanel />
                </div>
              </MapScreenProvider>
            </LeagueMapProvider>
          </NormalisedTeamMapProvider>
        </MatchesProvider>
      </SofaProvider>
    </LeagueTeamProvider>
  );
}
