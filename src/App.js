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
import ScreenJson from "./screens/ScreenJson";   // TAJNI SCREEN

import { MatchesProvider } from "./MatchesContext";
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

  // JSON MODE
  const [jsonMode, setJsonMode] = useState(false);
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

  const openJson = () => {
    setPrevScreenIndex(currentScreenIndex);  // ZAPAMTI GDE SI BIO
    setJsonMode(true);
  };

  const closeJson = () => {
    setJsonMode(false);
    setCurrentScreenIndex(prevScreenIndex); // VRATI SE TAČNO TU
  };

  return (
    <MatchesProvider>
      <div>
        <div className="top-bar">
          <button
            onClick={() => setCurrentScreenIndex(i => Math.max(i - 1, 0))}
            disabled={currentScreenIndex === 0 || jsonMode}
          >
            ◀
          </button>

          <span>
            {jsonMode ? "JSON SCREEN" : screens[currentScreenIndex].title}
          </span>

          <button
            onClick={() => setCurrentScreenIndex(i => Math.min(i + 1, screens.length - 1))}
            disabled={currentScreenIndex === screens.length - 1 || jsonMode}
          >
            ▶
          </button>

          <button
            style={{ marginLeft: 10, backgroundColor: "#ffeb3b", fontWeight: "bold" }}
            onClick={openJson}
            disabled={jsonMode}
          >
            JSON
          </button>
        </div>

        <div className="screen-container">
          {jsonMode ? <ScreenJson onClose={closeJson} /> : renderNormalScreen()}
        </div>

        <TicketPanel />
      </div>
    </MatchesProvider>
  );
}
