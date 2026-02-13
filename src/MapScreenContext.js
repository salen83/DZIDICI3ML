import React, { createContext, useContext, useState } from "react";

const MapScreenContext = createContext();

export const MapScreenProvider = ({ children }) => {
  const [mapData, setMapData] = useState({}); // { ligaKey: { screen1, sofa, screen1Teams, sofaTeams } }

  return (
    <MapScreenContext.Provider value={{ mapData, setMapData }}>
      {children}
    </MapScreenContext.Provider>
  );
};

export const useMapScreen = () => useContext(MapScreenContext);
